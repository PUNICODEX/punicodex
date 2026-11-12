(function () {
  'use strict';
  var S = window.Sandbox;
  var state = { me: null, invitations: [], policies: [] };
  var POLICY_LABELS = {
    'store.purchase': 'Reliquary purchases',
    'sponsorship.book': 'Sponsorship booking',
    'patron.subscribe': 'Patron subscriptions',
    'scholars.edit': 'Scholarly submissions',
    'creatives.upload': 'Creative uploads',
    'authenticity.use': 'Authenticity tools',
  };

  function institution() {
    return state.me.identity.scholars[0] || {};
  }

  async function loadInvitations() {
    var data = await S.api('/api/v1/scholars/institution/invitations/');
    state.invitations = data.data.items || [];
    renderInvitations();
  }

  function renderInvitations() {
    if (!state.invitations.length) {
      document.getElementById('invitations-list').innerHTML = '<div class="sb-state">No invitations yet. Your first cohort starts above.</div>';
      return;
    }
    var rows = state.invitations.map(function (item) {
      var action = item.status === 'pending'
        ? '<button class="sb-btn sb-btn-ghost sb-btn-sm" type="button" data-revoke="' + S.esc(item.id) + '">Revoke</button>'
        : '';
      return '<tr><td>' + S.esc(item.email) + '</td><td>' + S.esc(item.department || 'Institution-wide') + '</td><td>' + S.esc(item.role.replace(/_/g, ' ')) + '</td><td>' + S.statusBadge(item.status) + '</td><td>' + S.esc(S.fmtDate(item.expires_at)) + '</td><td>' + action + '</td></tr>';
    }).join('');
    document.getElementById('invitations-list').innerHTML = '<div class="sb-table-wrap"><table class="sb-table"><thead><tr><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    document.querySelectorAll('[data-revoke]').forEach(function (button) {
      button.addEventListener('click', async function () {
        if (!window.confirm('Revoke this invitation? The setup link will stop working immediately.')) return;
        button.disabled = true;
        try {
          await S.api('/api/v1/scholars/institution/invitations/' + encodeURIComponent(button.getAttribute('data-revoke')) + '/', { method: 'DELETE', body: {} });
          await loadInvitations();
        } catch (err) {
          button.disabled = false;
          alert(err.message);
        }
      });
    });
  }

  async function loadPolicies() {
    var data = await S.api('/api/v1/scholars/institution/policies/');
    state.policies = data.data.items || [];
    renderPolicies();
  }

  function policyFor(capability) {
    return state.policies.find(function (row) { return row.capability === capability && !row.department; });
  }

  function renderPolicies() {
    var department = institution().department || '';
    document.getElementById('policies-list').innerHTML = '<div class="sb-panel">' + Object.keys(POLICY_LABELS).map(function (capability) {
      var current = policyFor(capability);
      var effect = current ? current.effect : 'default';
      return '<div class="sb-policy-row" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem 0;border-bottom:1px solid var(--sb-border)"><div><strong>' + S.esc(POLICY_LABELS[capability]) + '</strong><div class="sb-cell-sub">' + (current ? 'Explicit ' + S.esc(effect) : 'Default policy') + '</div></div><select data-policy="' + S.esc(capability) + '" aria-label="Policy for ' + S.esc(POLICY_LABELS[capability]) + '"><option value="default"' + (effect === 'default' ? ' selected' : '') + '>Default</option><option value="allow"' + (effect === 'allow' ? ' selected' : '') + '>Allow</option><option value="deny"' + (effect === 'deny' ? ' selected' : '') + '>Deny</option></select></div>';
    }).join('') + '</div>';
    document.querySelectorAll('[data-policy]').forEach(function (select) {
      select.addEventListener('change', async function () {
        var effect = select.value;
        if (effect === 'default') {
          effect = ['store.purchase', 'sponsorship.book', 'patron.subscribe'].includes(select.getAttribute('data-policy')) ? 'deny' : 'allow';
        }
        select.disabled = true;
        try {
          await S.api('/api/v1/scholars/institution/policies/', {
            method: 'PUT',
            body: { capability: select.getAttribute('data-policy'), effect: effect, department: department },
          });
          await loadPolicies();
        } catch (err) {
          alert(err.message);
          select.disabled = false;
        }
      });
    });
  }

  function metric(value, label, note) {
    return '<div class="sb-panel"><div class="sb-metric-value">' + S.esc(S.fmtNumber(value)) + '</div><strong>' + S.esc(label) + '</strong><p class="sb-panel-sub">' + S.esc(note) + '</p></div>';
  }

  async function loadOverview() {
    var overview = await S.api('/api/account/institution/overview/');
    var results = await Promise.allSettled([
      S.api('/api/v1/creatives/institution/dashboard/'),
      S.api('/api/v1/creatives/institution/analytics/?days=30'),
    ]);
    var dashboard = results[0].status === 'fulfilled' ? results[0].value.data : null;
    var analytics = results[1].status === 'fulfilled' ? results[1].value.data : null;
    document.getElementById('institution-kpis').innerHTML = [
      metric(overview.members.students, 'Active students', overview.members.total + ' active people in this scope'),
      metric(overview.scholarship.pending, 'Scholarly edits awaiting review', overview.scholarship.total + ' total submissions'),
      metric(dashboard ? dashboard.pendingReviewCount : 0, 'Creative works awaiting review', dashboard ? dashboard.approvedCount + ' approved works' : 'Creative dashboard unavailable'),
      metric(analytics ? analytics.views : 0, 'Creative views · 30d', analytics ? analytics.purchases + ' licenses in this window' : 'Audience analytics unavailable'),
    ].join('');

    if (!dashboard) {
      document.getElementById('institution-creative-list').innerHTML = '<div class="sb-state error">' + S.esc(results[0].reason.message) + '</div>';
      return;
    }
    var assets = (dashboard.assets || []).slice(0, 8);
    document.getElementById('creative-output-meta').textContent = dashboard.totalEarningsCents
      ? '$' + (dashboard.totalEarningsCents / 100).toFixed(2) + ' creator earnings · latest submissions'
      : 'Latest submissions and their review states';
    if (!assets.length) {
      document.getElementById('institution-creative-list').innerHTML = '<div class="sb-state">No student creative work has been submitted yet.</div>';
      return;
    }
    var rows = assets.map(function (asset) {
      return '<tr><td>' + S.esc(asset.title) + '</td><td>' + S.esc(asset.creator_name || 'Student') + '</td><td>' + S.esc(asset.department) + '</td><td>' + S.statusBadge(asset.status) + '</td><td>' + S.esc(S.fmtDate(asset.created_at)) + '</td></tr>';
    }).join('');
    document.getElementById('institution-creative-list').innerHTML = '<div class="sb-table-wrap"><table class="sb-table"><thead><tr><th>Work</th><th>Creator</th><th>Department</th><th>Status</th><th>Submitted</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  document.getElementById('invite-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var button = document.getElementById('invite-submit');
    var message = document.getElementById('invite-message');
    button.disabled = true;
    message.textContent = '';
    try {
      var data = await S.api('/api/v1/scholars/institution/invitations/', {
        method: 'POST',
        body: {
          emailsText: document.getElementById('invite-emails').value,
          department: document.getElementById('invite-department').value.trim() || null,
          role: document.getElementById('invite-role').value,
        },
      });
      var created = data.data.items.filter(function (item) { return item.status === 'pending'; }).length;
      message.classList.add('success');
      message.textContent = created + ' invitation' + (created === 1 ? '' : 's') + ' sent. Existing accounts were left untouched.';
      document.getElementById('invite-emails').value = '';
      await loadInvitations();
    } catch (err) {
      message.classList.remove('success');
      message.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('invitations-refresh').addEventListener('click', loadInvitations);

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    state.me = me;
    S.mountShell('institution', me.account.email, me);
    if (!me.capabilities || me.capabilities.indexOf('institution.manage') === -1) {
      document.getElementById('institution-forbidden').hidden = false;
      document.getElementById('institution-app').hidden = true;
      return;
    }
    var profile = institution();
    document.getElementById('institution-sub').textContent = (profile.institutionName || 'Your institution') + (profile.department ? ' · ' + profile.department : '');
    document.getElementById('invite-department').value = profile.department || '';
    await Promise.all([loadOverview(), loadInvitations(), loadPolicies()]);
  }

  init().catch(function (err) {
    document.getElementById('institution-forbidden').hidden = false;
    document.getElementById('institution-forbidden').textContent = err.message;
    document.getElementById('institution-app').hidden = true;
  });
})();
