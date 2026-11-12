const { handleError, setCors } = require('../_utils');
const tenantPortal = require('../../platform/api/tenant-portal');
const identity = require('../../platform/api/identity');
const { checkRateLimit } = require('../../platform/api/api-rate-limiter');
const { getClientIp } = require('../../platform/api/client-ip');

async function checkAuthRateLimit(req, res, bucket) {
  const key = `${bucket}:${getClientIp(req)}`;
  const result = await checkRateLimit(key, 'public-strict');
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
    return false;
  }
  return true;
}

async function checkUploadRateLimit(req, res, account) {
  const key = `account-requests:${account.id}:${getClientIp(req)}`;
  const result = await checkRateLimit(key, 'public');
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
    return false;
  }
  return true;
}

async function requireTenant(req, res, write = false) {
  const central = await identity.resolveSession(req, res);
  if (!central) return tenantPortal.requireAccount(req, res);
  const verified = await identity.requireAccount(req, res, { write });
  if (!verified) return false;
  const account = await tenantPortal.getAccountByEmail(verified.account.email);
  if (account?.status !== 'active') {
    res.status(403).json({
      error: 'No sponsor or patron resources are linked to this account.',
      code: 'tenant_not_linked',
    });
    return false;
  }
  return account;
}

async function getUnifiedMe(req, res) {
  const resolved = await identity.resolveSession(req, res);
  if (!resolved) {
    const legacy = await tenantPortal.requireAccount(req, res);
    if (!legacy) return;
    return res.json(await tenantPortal.getMe(legacy));
  }
  const unified = await identity.getMe(resolved.account);
  const orders = await identity.getOrders(resolved.account.email);
  const tenant = await tenantPortal.getAccountByEmail(resolved.account.email);
  if (tenant && tenant.status !== 'active') {
    await identity.revokeAllSessions(resolved.account.id);
    return res
      .status(401)
      .json({ error: 'This account is disabled. Contact support.', code: 'account_inactive' });
  }
  if (!tenant) {
    return res.json({ ...unified, resources: { bookings: [], patrons: [], orders } });
  }
  const tenantMe = await tenantPortal.getMe(tenant);
  return res.json({
    ...unified,
    account: {
      ...tenantMe.account,
      ...unified.account,
      isSponsor: tenantMe.account.isSponsor,
      isPatron: tenantMe.account.isPatron,
    },
    resources: { ...tenantMe.resources, orders },
  });
}

async function completeSetup({ token, password, req, res }) {
  const kind = await identity.classifySetupToken(token);
  if (kind === 'invitation') return identity.acceptInvitation({ token, password, req, res });
  if (kind === 'account') return identity.setPassword({ token, password, req, res });
  if (kind === 'tenant') {
    const legacy = await tenantPortal.setPassword({ token, password });
    const account = await identity.linkTenantAccount(legacy.account.email);
    const rawTenant = await tenantPortal.getAccountByEmail(legacy.account.email);
    await identity.syncPassword(account.id, rawTenant.password_hash);
    const session = await identity.createSession(account.id, { req, res });
    return {
      token: session.token,
      csrfToken: session.csrfToken,
      account: {
        ...identity.sanitizeAccount(await identity.getAccountById(account.id)),
        isSponsor: legacy.account.isSponsor,
        isPatron: legacy.account.isPatron,
      },
    };
  }
  throw Object.assign(new Error('This setup link is invalid or has expired.'), {
    status: 400,
    code: 'invalid_token',
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    let slugParts = req.query.slug || [];
    if (typeof slugParts === 'string') slugParts = slugParts.split('/').filter(Boolean);
    const body = req.body || {};

    if (slugParts[0] === 'auth' && req.method === 'POST') {
      if (slugParts.length === 2 && slugParts[1] === 'set-password') {
        return res.json(
          await completeSetup({ token: body.token, password: body.password, req, res })
        );
      }
      if (slugParts.length === 2 && slugParts[1] === 'register') {
        if (!(await checkAuthRateLimit(req, res, 'identity-register'))) return;
        const result = await identity.register(body);
        if (result.token) {
          const { notifyIdentityActivation } = require('../../platform/api/email');
          notifyIdentityActivation({ email: result.account.email, token: result.token }).catch(
            () => {}
          );
        }
        return res.json({ success: true, message: result.message });
      }
      if (slugParts.length === 2 && slugParts[1] === 'login') {
        if (!(await checkAuthRateLimit(req, res, 'tenant-login'))) return;
        return res.json(await identity.login({ ...body, req, res }));
      }
      if (slugParts.length === 2 && slugParts[1] === 'logout') {
        await tenantPortal.logout(tenantPortal.bearerToken(req));
        return res.json(await identity.logout(req, res));
      }
      if (slugParts.length === 2 && slugParts[1] === 'forgot') {
        if (!(await checkAuthRateLimit(req, res, 'tenant-forgot'))) return;
        const result = await identity.forgot(body);
        if (result.token) {
          const { notifyIdentityPasswordReset } = require('../../platform/api/email');
          notifyIdentityPasswordReset({ email: result.account.email, token: result.token }).catch(
            () => {}
          );
        }
        return res.json({ success: true, message: result.message });
      }
    }

    if (slugParts.length === 1 && slugParts[0] === 'me' && req.method === 'GET') {
      return getUnifiedMe(req, res);
    }

    if (slugParts.length === 1 && slugParts[0] === 'downloads') {
      const resolved = await identity.requireAccount(req, res, {
        write: req.method === 'POST' || req.method === 'DELETE',
      });
      if (!resolved) return;
      if (req.method === 'GET') {
        return res.json({ items: await identity.getDownloads(resolved.account.id) });
      }
      if (req.method === 'POST') {
        return res
          .status(201)
          .json({ item: await identity.recordDownload(resolved.account.id, body.assetId) });
      }
      if (req.method === 'DELETE') {
        return res.json(await identity.clearDownloads(resolved.account.id));
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (slugParts.length === 1 && slugParts[0] === 'initiation') {
      const resolved = await identity.requireAccount(req, res, { write: req.method === 'PUT' });
      if (!resolved) return;
      if (req.method === 'GET') return res.json(await identity.getInitiation(resolved.account.id));
      if (req.method === 'PUT') {
        return res.json(await identity.updateInitiation(resolved.account.id, body));
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (
      slugParts.length === 2 &&
      slugParts[0] === 'institution' &&
      slugParts[1] === 'overview' &&
      req.method === 'GET'
    ) {
      const resolved = await identity.requireAccount(req, res);
      if (!resolved) return;
      return res.json(await identity.getInstitutionOverview(resolved.account.id));
    }

    if (slugParts[0] === 'analytics' && req.method === 'GET') {
      const account = await requireTenant(req, res);
      if (!account) return;
      if (slugParts.length === 2 && slugParts[1] === 'space') {
        return res.json(await tenantPortal.getSpaceAnalytics(account));
      }
      if (slugParts.length === 3 && slugParts[1] === 'temple') {
        return res.json(await tenantPortal.getTempleAnalytics(account, slugParts[2]));
      }
      if (slugParts[1] === 'slot' && (slugParts.length === 2 || slugParts.length === 3)) {
        const bookingId = slugParts.length === 3 ? slugParts[2] : req.query.id;
        return res.json(await tenantPortal.getSlotAnalytics(account, bookingId));
      }
      if (slugParts.length === 2 && slugParts[1] === 'site') {
        return res.json(await tenantPortal.getSiteAnalytics());
      }
    }

    if (slugParts.length === 1 && slugParts[0] === 'requests') {
      const account = await requireTenant(req, res, req.method === 'POST');
      if (!account) return;
      if (req.method === 'GET') {
        return res.json({ items: await tenantPortal.listChangeRequests(account) });
      }
      if (req.method === 'POST') {
        const { type, target, payload } = body;
        if (type === 'image' && !(await checkUploadRateLimit(req, res, account))) return;
        const request = await tenantPortal.createChangeRequest(account, { type, target, payload });
        return res.status(201).json({ request });
      }
    }

    if (slugParts[0] === 'bookings' && slugParts.length === 3 && req.method === 'POST') {
      const account = await requireTenant(req, res, true);
      if (!account) return;
      const bookingId = slugParts[1];
      if (slugParts[2] === 'publish') {
        return res.json(await tenantPortal.publishOwnBooking(account, bookingId));
      }
      if (slugParts[2] === 'pause') {
        return res.json(await tenantPortal.pauseOwnBooking(account, bookingId));
      }
      if (slugParts[2] === 'meta') {
        const { customHeading, customSubtitle, websiteUrl } = body;
        return res.json(
          await tenantPortal.updateOwnBookingMeta(account, bookingId, {
            customHeading,
            customSubtitle,
            websiteUrl,
          })
        );
      }
    }

    if (slugParts[0] === 'patrons' && slugParts.length === 3 && slugParts[2] === 'cancel') {
      const account = await requireTenant(req, res, true);
      if (!account) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { cancelPatron } = require('../../platform/api/digest-service');
      return res.json(await cancelPatron({ patronId: slugParts[1], email: account.email }));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    handleError(res, err);
  }
};
