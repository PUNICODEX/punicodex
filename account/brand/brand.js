/**
 * Sponsor Sandbox — Brand page.
 *
 * The change-request flows from the original portal, restyled:
 *   - Creative swap per changeable booking: client-side type/size checks,
 *     staged upload preview, slot dimension hint (the server re-validates
 *     dimensions against the slot before queueing).
 *   - Patron social-link changes (set or request removal).
 *   - Request history with review-status badges.
 * Endpoints are unchanged: GET/POST /api/account/requests/.
 */
(function () {
  'use strict';

  var S = window.Sandbox;
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  var IMAGE_CHANGEABLE_STATUSES = ['pending_upload', 'rejected', 'approved', 'live', 'pending_approval'];
  var SOCIAL_PLATFORMS = ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'github', 'website'];

  function readFileAsDataUri(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error('Could not read the file'));
      };
      reader.readAsDataURL(file);
    });
  }

  function renderRequestForms(me) {
    var wrap = document.getElementById('request-forms');
    var cards = [];

    (me.resources.bookings || []).forEach(function (b) {
      if (IMAGE_CHANGEABLE_STATUSES.indexOf(b.status) === -1) return;
      var dims = b.width && b.height ? b.width + ' × ' + b.height + ' px' : 'the slot dimensions';
      cards.push(
        '<div class="sb-panel">' +
          '<h3>Replace creative — ' + S.esc(b.slotName) + '</h3>' +
          '<p class="sb-panel-sub">' + S.esc(b.siteSlug) + ' · any size photo — we frame it to ' + S.esc(dims) + ' · goes live after review</p>' +
          (b.creativePath ? '<img class="sb-creative-preview" src="' + S.esc(b.creativePath) + '" alt="Current creative">' : '') +
          '<form data-booking-id="' + S.esc(b.id) + '" data-width="' + S.esc(b.width || '') + '" data-height="' + S.esc(b.height || '') + '" class="image-request-form">' +
          '<div class="sb-field"><label>New image</label>' +
          '<input type="file" accept="image/png,image/jpeg,image/webp" required></div>' +
          '<img class="sb-upload-preview" alt="Staged preview" hidden>' +
          '<p class="sb-upload-note" hidden></p>' +
          '<button type="submit" class="sb-btn sb-btn-primary sb-btn-sm">Submit for Review</button>' +
          '<p class="sb-form-message" role="alert"></p>' +
          '</form>' +
          '</div>'
      );
    });

    (me.resources.patrons || []).forEach(function (p) {
      if (p.status !== 'active') return;
      cards.push(
        '<div class="sb-panel">' +
          '<h3>Change social links — ' + S.esc(p.templeId) + '</h3>' +
          '<p class="sb-panel-sub">Currently: ' + (p.socialUrl ? S.esc(p.socialPlatform + ' — ' + p.socialUrl) : 'no links') + '</p>' +
          '<form data-patron-id="' + S.esc(p.id) + '" class="links-request-form">' +
          '<div class="sb-field"><label for="links-platform-' + S.esc(p.id) + '">Platform</label>' +
          '<select id="links-platform-' + S.esc(p.id) + '">' +
          SOCIAL_PLATFORMS.map(function (pl) {
            return '<option value="' + pl + '"' + (p.socialPlatform === pl ? ' selected' : '') + '>' + pl + '</option>';
          }).join('') +
          '</select></div>' +
          '<div class="sb-field"><label for="links-url-' + S.esc(p.id) + '">Profile URL (https://…)</label>' +
          '<input type="url" id="links-url-' + S.esc(p.id) + '" placeholder="https://" value="' + S.esc(p.socialUrl || '') + '"></div>' +
          '<button type="submit" class="sb-btn sb-btn-primary sb-btn-sm">Submit for Review</button> ' +
          '<button type="button" class="sb-btn sb-btn-ghost sb-btn-sm clear-links" data-patron-id="' + S.esc(p.id) + '">Request link removal</button>' +
          '<p class="sb-form-message" role="alert"></p>' +
          '</form>' +
          '</div>'
      );
    });

    wrap.innerHTML = cards.length
      ? cards.join('')
      : '<div class="sb-state">No changeable resources right now. Creative swaps unlock once a booking is approved, live, or awaiting upload.</div>';

    bindRequestForms();
  }

  function bindRequestForms() {
    Array.prototype.forEach.call(document.querySelectorAll('.image-request-form'), function (form) {
      var fileInput = form.querySelector('input[type="file"]');
      var preview = form.querySelector('.sb-upload-preview');
      var note = form.querySelector('.sb-upload-note');
      var slotW = Number(form.getAttribute('data-width')) || 0;
      var slotH = Number(form.getAttribute('data-height')) || 0;
      var staged = null; // the normalized image, exactly as it will run

      // Normalize on select (center-crop to the slot frame, downscale to 2×)
      // and preview the processed image — what you see is what runs.
      fileInput.addEventListener('change', async function () {
        var file = fileInput.files[0];
        staged = null;
        note.hidden = true;
        if (!file) {
          preview.hidden = true;
          return;
        }
        try {
          if (window.CreativeNormalize && slotW && slotH) {
            staged = await window.CreativeNormalize.normalizeCreative(file, slotW, slotH);
            preview.src = staged.dataUrl;
            note.textContent = staged.tooSmall
              ? 'Smaller than the slot — it will run, but may print soft; a larger original is better.'
              : staged.cropped
                ? 'Framed to ' + staged.width + '×' + staged.height + ' from your ' + staged.originalWidth + '×' + staged.originalHeight + ' original — the preview is exactly what will run.'
                : '';
            note.hidden = !note.textContent;
          } else {
            preview.src = await readFileAsDataUri(file);
          }
          preview.hidden = false;
        } catch (err) {
          staged = null;
          preview.hidden = true;
          note.hidden = true;
          var msg = form.querySelector('.sb-form-message');
          msg.textContent = err.message || 'Could not read this image.';
        }
      });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var msg = form.querySelector('.sb-form-message');
        msg.classList.remove('success');
        msg.textContent = '';
        var file = fileInput.files[0];
        if (!file) {
          msg.textContent = 'Choose an image first.';
          return;
        }
        if (['image/png', 'image/jpeg', 'image/webp'].indexOf(file.type) === -1) {
          msg.textContent = 'Image must be PNG, JPEG, or WebP.';
          return;
        }
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          var dataUri = staged ? staged.dataUrl : await readFileAsDataUri(file);
          await S.api('/api/account/requests/', {
            method: 'POST',
            body: {
              type: 'image',
              target: Number(form.getAttribute('data-booking-id')),
              payload: { image: dataUri, filename: file.name },
            },
          });
          msg.classList.add('success');
          msg.textContent = 'Submitted. It goes live once the team approves it.';
          form.reset();
          staged = null;
          preview.hidden = true;
          note.hidden = true;
          loadRequests();
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          btn.disabled = false;
        }
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.links-request-form'), function (form) {
      var patronId = Number(form.getAttribute('data-patron-id'));
      var msg = form.querySelector('.sb-form-message');

      async function submitLinks(platform, url) {
        msg.classList.remove('success');
        msg.textContent = '';
        try {
          await S.api('/api/account/requests/', {
            method: 'POST',
            body: {
              type: 'social_links',
              target: patronId,
              payload: { socialPlatform: platform, socialUrl: url },
            },
          });
          msg.classList.add('success');
          msg.textContent = 'Submitted. Links update once the team approves the change.';
          loadRequests();
        } catch (err) {
          msg.textContent = err.message;
        }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitLinks(form.querySelector('select').value, form.querySelector('input[type="url"]').value.trim());
      });
      form.querySelector('.clear-links').addEventListener('click', function () {
        submitLinks('', '');
      });
    });
  }

  function renderRequests(items) {
    var wrap = document.getElementById('request-history');
    if (!items.length) {
      wrap.innerHTML = '<div class="sb-state">No change requests yet.</div>';
      return;
    }
    var rows = items
      .map(function (r) {
        var change =
          r.type === 'image'
            ? 'new creative (' + S.esc((r.payload && r.payload.originalName) || 'image') + ')'
            : r.payload && r.payload.socialPlatform === null
              ? 'remove social links'
              : S.esc((r.payload && r.payload.socialPlatform) + ' — ' + ((r.payload && r.payload.socialUrl) || ''));
        return (
          '<tr>' +
          '<td>#' + S.esc(r.id) + '</td>' +
          '<td>' + S.esc(String(r.type).replace(/_/g, ' ')) + '</td>' +
          '<td>' + change + '</td>' +
          '<td>' + S.statusBadge(r.status) + (r.reviewerNote ? '<span class="sb-cell-sub">' + S.esc(r.reviewerNote) + '</span>' : '') + '</td>' +
          '<td>' + S.esc(S.fmtDate(r.createdAt)) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    wrap.innerHTML =
      '<div class="sb-table-wrap"><table class="sb-table">' +
      '<thead><tr><th>ID</th><th>Type</th><th>Change</th><th>Status</th><th>Requested</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  async function loadRequests() {
    try {
      var data = await S.api('/api/account/requests/');
      renderRequests(data.items || []);
    } catch (err) {
      document.getElementById('request-history').innerHTML =
        '<div class="sb-state error">' + S.esc(err.message) + '</div>';
    }
  }

  async function init() {
    var me = await S.requireAccount();
    if (!me) return;
    S.mountShell('brand', me.account.email);
    renderRequestForms(me);
    loadRequests();
  }

  init().catch(function (err) {
    document.getElementById('request-forms').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
