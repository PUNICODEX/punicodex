/**
 * PÚNYCODEX — Student Creative Marketplace API
 *
 * Express router for /api/v1/creatives/*
 */

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { requireAuth } = require('../scholars/auth');
const {
  canSubmitCreative,
  canReviewCreative,
  canManageCreative,
  requireRole,
  isCurator,
  isInstitutionAdmin,
} = require('../scholars/authz');
const {
  createCreativeAsset,
  getCreativeAssetById,
  getCreativeAssetWithCreator,
  updateCreativeAsset,
  updateCreativeAssetStatus,
  deleteCreativeAsset,
  listCreativeAssets,
  countCreativeAssets,
  setCreativeAssetTags,
  createCreativePurchase,
  getCreativePurchaseById,
  updateCreativePurchaseStatus,
  createCreativeReview,
  getCreativeDashboardForCreator,
  getCreativeDashboardForInstitution,
  getInstitutionById,
  withTransaction,
} = require('../db/scholars');
const { processCreativeUpload } = require('./creative-watermark');
const { moderateAsset } = require('./creative-moderation');
const { createCreativeCheckoutSession } = require('./stripe');

const PLATFORM_FEE_PERCENT = 0.3;
const CREATOR_PERCENT = 0.7;

const router = express.Router();

router.use(express.json({ limit: '10mb' }));

function success(data) {
  return { success: true, data };
}

function error(message, code = 400) {
  return { success: false, error: message, code };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sanitizeAsset(asset) {
  if (!asset) return null;
  return {
    id: asset.id,
    title: asset.title,
    description: asset.description,
    department: asset.department,
    inspirationEntryId: asset.inspiration_entry_id,
    status: asset.status,
    licenseType: asset.license_type,
    priceCents: asset.price_cents,
    previewPath: asset.preview_path,
    thumbnailPath: asset.thumbnail_path,
    metadata: asset.metadata,
    creatorName: asset.creator_name,
    institutionName: asset.institution_name,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
  };
}

function sanitizeAssetDetail(asset) {
  if (!asset) return null;
  return {
    ...sanitizeAsset(asset),
    creatorEmail: asset.creator_email,
    originalPath: asset.original_path,
  };
}

function calculatePayouts(priceCents) {
  const platformFeeCents = Math.round(priceCents * PLATFORM_FEE_PERCENT);
  const creatorPayoutCents = Math.round(priceCents * CREATOR_PERCENT);
  return { platformFeeCents, creatorPayoutCents };
}

// ─────────────────────────────────────────────────────────────
// Public listing and detail
// ─────────────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { department, tag, inspiration, q, limit = '20', offset = '0' } = req.query;

    const filters = { status: 'approved' };
    if (department) filters.department = department;
    if (tag) filters.tag = tag;
    if (inspiration) filters.inspirationEntryId = inspiration;
    if (q) filters.q = q;

    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedOffset = Math.max(Number(offset) || 0, 0);

    const assets = listCreativeAssets(filters, { limit: parsedLimit, offset: parsedOffset });
    const total = countCreativeAssets(filters);

    res.json(
      success({
        assets: assets.map(sanitizeAsset),
        total,
        limit: parsedLimit,
        offset: parsedOffset,
      })
    );
  })
);

// ─────────────────────────────────────────────────────────────
// Dashboards and moderation queue (must come before /:id)
// ─────────────────────────────────────────────────────────────

router.get(
  '/pending',
  requireAuth,
  requireRole('reviewer'),
  asyncHandler(async (req, res) => {
    const { institutionId } = req.query;
    const filters = { status: 'pending_review' };
    if (
      institutionId &&
      (isCurator(req.user) || String(req.user.institutionId) === institutionId)
    ) {
      filters.institutionId = Number(institutionId);
    } else if (!isCurator(req.user)) {
      filters.institutionId = req.user.institutionId;
    }

    const assets = listCreativeAssets(filters, { limit: 100, offset: 0 });
    res.json(success({ assets: assets.map(sanitizeAsset) }));
  })
);

router.get(
  '/dashboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = getCreativeDashboardForCreator(req.user.id);
    res.json(success(dashboard));
  })
);

router.get(
  '/institution/dashboard',
  requireAuth,
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) {
      return res.status(400).json(error('No institution associated'));
    }
    if (!isInstitutionAdmin(req.user) && !isCurator(req.user)) {
      return res.status(403).json(error('Institution admin or curator access required'));
    }
    const dashboard = getCreativeDashboardForInstitution(institutionId);
    res.json(success(dashboard));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetWithCreator(Number(req.params.id));
    if (!asset) return res.status(404).json(error('Asset not found', 404));
    if (asset.status !== 'approved') {
      return res.status(404).json(error('Asset not found', 404));
    }
    res.json(success(sanitizeAssetDetail(asset)));
  })
);

// ─────────────────────────────────────────────────────────────
// Upload (students)
// ─────────────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const institution = req.user.institutionId ? getInstitutionById(req.user.institutionId) : null;
    if (!canSubmitCreative(req.user, institution)) {
      return res.status(403).json(error('You do not have permission to submit creative assets'));
    }

    const { title, description, department, inspirationEntryId, priceCents, tags, image } =
      req.body || {};

    if (!title || typeof title !== 'string' || title.length < 3 || title.length > 200) {
      return res.status(400).json(error('Title must be between 3 and 200 characters'));
    }
    if (!description || typeof description !== 'string' || description.length > 2000) {
      return res
        .status(400)
        .json(error('Description is required and must be under 2000 characters'));
    }
    if (!department || typeof department !== 'string') {
      return res.status(400).json(error('Department is required'));
    }
    if (!institution.department_allowlist.includes(department)) {
      return res.status(400).json(error('Department is not in the institution allowlist'));
    }
    if (!image || typeof image !== 'string') {
      return res.status(400).json(error('Image is required'));
    }

    const moderation = moderateAsset({ title, description, tags });
    if (!moderation.allowed) {
      return res
        .status(422)
        .json(
          error(
            `Upload blocked by automated moderation: ${moderation.findings.map((f) => f.source).join(', ')}`,
            422
          )
        );
    }

    const assetResult = createCreativeAsset({
      creatorId: req.user.id,
      institutionId: req.user.institutionId,
      title,
      description,
      department,
      inspirationEntryId: inspirationEntryId || null,
      licenseType: 'single_use',
      priceCents: Math.max(0, Number(priceCents) || 0),
      previewPath: null,
      originalPath: null,
      thumbnailPath: null,
      metadata: {},
    });
    const assetId = assetResult.lastInsertRowid;

    const upload = await processCreativeUpload({
      imageBase64: image,
      assetId,
    });

    if (upload.error) {
      // Roll back the asset record on upload failure.
      deleteCreativeAsset(assetId);
      return res.status(400).json(error(upload.error));
    }

    updateCreativeAsset(assetId, {
      preview_path: upload.previewPath,
      original_path: upload.originalPath,
      thumbnail_path: upload.thumbnailPath,
      metadata: {
        dimensions: upload.dimensions,
        mimeType: upload.mimeType,
      },
    });

    if (Array.isArray(tags)) {
      setCreativeAssetTags(assetId, tags);
    }

    res.status(201).json(success({ assetId, status: 'pending_review' }));
  })
);

// ─────────────────────────────────────────────────────────────
// Manage own assets
// ─────────────────────────────────────────────────────────────

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetById(Number(req.params.id));
    if (!asset) return res.status(404).json(error('Asset not found', 404));
    if (!canManageCreative(req.user, asset)) {
      return res.status(403).json(error('You do not have permission to edit this asset'));
    }
    if (asset.status !== 'pending_review') {
      return res.status(400).json(error('Only pending assets can be edited'));
    }

    const allowedFields = [
      'title',
      'description',
      'department',
      'inspiration_entry_id',
      'price_cents',
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json(error('No valid fields to update'));
    }

    updateCreativeAsset(asset.id, updates);

    if (Array.isArray(req.body.tags)) {
      setCreativeAssetTags(asset.id, req.body.tags);
    }

    res.json(success({ updated: true }));
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetById(Number(req.params.id));
    if (!asset) return res.status(404).json(error('Asset not found', 404));
    if (!canManageCreative(req.user, asset)) {
      return res.status(403).json(error('You do not have permission to remove this asset'));
    }
    updateCreativeAssetStatus(asset.id, 'delisted');
    res.json(success({ delisted: true }));
  })
);

// ─────────────────────────────────────────────────────────────
// Purchase flow
// ─────────────────────────────────────────────────────────────

router.post(
  '/:id/purchase',
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetWithCreator(Number(req.params.id));
    if (!asset || asset.status !== 'approved') {
      return res.status(404).json(error('Asset not available for purchase', 404));
    }

    const { email, bookingId } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json(error('A valid licensee email is required'));
    }

    const { platformFeeCents, creatorPayoutCents } = calculatePayouts(asset.price_cents);

    const purchaseResult = createCreativePurchase({
      assetId: asset.id,
      licenseeBookingId: bookingId || null,
      licenseeEmail: email.toLowerCase().trim(),
      licenseType: 'single_use',
      priceCents: asset.price_cents,
      platformFeeCents,
      creatorPayoutCents,
      universityCreditCents: creatorPayoutCents,
    });
    const purchaseId = purchaseResult.lastInsertRowid;

    const checkout = await createCreativeCheckoutSession({
      purchaseId,
      email: email.toLowerCase().trim(),
      assetTitle: asset.title,
      amountCents: asset.price_cents,
    });

    updateCreativePurchaseStatus(purchaseId, { stripeSessionId: checkout.sessionId });

    res.json(success({ purchaseId, checkoutUrl: checkout.sessionUrl }));
  })
);

// ─────────────────────────────────────────────────────────────
// Download original (gated)
// ─────────────────────────────────────────────────────────────

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetById(Number(req.params.id));
    if (!asset || asset.status !== 'approved') {
      return res.status(404).json(error('Asset not found', 404));
    }
    if (!asset.original_path) {
      return res.status(404).json(error('Original file not found', 404));
    }

    const { email, purchaseId } = req.query;
    let hasAccess = false;

    if (req.user && (isCurator(req.user) || req.user.id === asset.creator_id)) {
      hasAccess = true;
    } else if (purchaseId && email) {
      const purchase = getCreativePurchaseById(Number(purchaseId));
      if (
        purchase &&
        purchase.asset_id === asset.id &&
        purchase.licensee_email === email.toLowerCase().trim() &&
        purchase.status === 'paid'
      ) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json(error('Access denied'));
    }

    const filePath = path.join(__dirname, '..', 'public', asset.original_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(error('File not found', 404));
    }

    res.sendFile(path.resolve(filePath));
  })
);

// ─────────────────────────────────────────────────────────────
// Moderation
// ─────────────────────────────────────────────────────────────

router.post(
  '/:id/review',
  requireAuth,
  requireRole('reviewer'),
  asyncHandler(async (req, res) => {
    const asset = getCreativeAssetById(Number(req.params.id));
    if (!asset) return res.status(404).json(error('Asset not found', 404));
    if (asset.status !== 'pending_review') {
      return res.status(400).json(error('Asset is not pending review'));
    }

    if (!canReviewCreative(req.user, asset.institution_id)) {
      return res.status(403).json(error('You cannot review assets from this institution'));
    }

    const { decision, comment } = req.body || {};
    if (!['approved', 'rejected', 'needs_revision'].includes(decision)) {
      return res.status(400).json(error('Decision must be approved, rejected, or needs_revision'));
    }

    const finalStatus =
      decision === 'approved'
        ? 'approved'
        : decision === 'rejected'
          ? 'rejected'
          : 'pending_review';

    withTransaction(() => {
      createCreativeReview({
        assetId: asset.id,
        reviewerId: req.user.id,
        decision,
        comment: comment || null,
      });
      updateCreativeAssetStatus(asset.id, finalStatus);
    });

    res.json(success({ reviewed: true, decision, status: finalStatus }));
  })
);

module.exports = router;
