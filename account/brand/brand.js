/**
 * Sponsor Sandbox — Creative Studio (brand page).
 *
 * The studio replaces the old bare upload cards with a per-placement working
 * surface:
 *   - One studio card per changeable booking: the creative rendered inside a
 *     mock of the real temple frame (correct aspect ratio, heading/subtitle
 *     overlaid as the temple renders them), a status timeline
 *     (Applied → Paid → Creative → Approved → Live), and a "live preview"
 *     link to the temple once the placement is live. Preview links go
 *     straight to the temple page — never through the analytics click
 *     tracker; the frame is a preview, not an impression.
 *   - One unified drag&drop upload zone per card ("Upload creative" the first
 *     time, "Replace creative" afterwards). The staged image is normalized
 *     client-side (center-crop to the slot frame, downscale to 2×) and
 *     previews IN the frame before submission — what you see is what runs.
 *   - An ad-copy editor (headline / subtitle / destination URL) with live
 *     character counters; limits mirror the temple's getCharLimits tiers.
 *     Bundle takeovers edit the destination URL only — per-frame headlines
 *     are set by the team.
 *   - Publish / Pause controls riding the account booking endpoints.
 *   - Patron social-link changes and the request history, unchanged.
 *
 * Endpoints: GET /api/account/me/, GET|POST /api/account/requests/,
 * POST /api/account/bookings/:id/meta|publish|pause/.
 */
(function () {
  'use strict';

  var S = window.Sandbox;
  var STUDIO_STATUSES = ['pending_upload', 'pending_approval', 'approved', 'live', 'rejected'];
  var SOCIAL_PLATFORMS = ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'github', 'website'];
  var TIMELINE_STEPS = ['Applied', 'Paid', 'Creative', 'Approved', 'Live'];

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

  /** Headline/subtitle limits — the same tiers as the temple's getCharLimits. */
  function copyLimits(width) {
    var w = Number(width) || 0;
    if (w >= 1000) return { heading: 60, subtitle: 100 };
    if (w >= 500) return { heading: 36, subtitle: 60 };
    if (w >= 300) return { heading: 24, subtitle: 40 };
    return { heading: 12, subtitle: 20 };
  }

  function timelineHtml(status) {
    var currentIdx = 0;
    var currentLabel = null;
    var rejected = false;
    if (status === 'pending_application') currentIdx = 0;
    else if (status === 'pending_payment') currentIdx = 1;
    else if (status === 'pending_upload') currentIdx = 2;
    else if (status === 'pending_approval') {
      currentIdx = 2;
      currentLabel = 'In review';
    } else if (status === 'approved') currentIdx = 3;
    else if (status === 'live') currentIdx = 4;
    else if (status === 'rejected') {
      currentIdx = 2;
      rejected = true;
    }
    var items = TIMELINE_STEPS.map(function (label, i) {
      var cls = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo';
      if (rejected && i === currentIdx) cls += ' rejected';
      var text = i === currentIdx && currentLabel ? currentLabel : label;
      return '<li class="' + cls + '"><span class="sb-step-dot"></span><span class="sb-step-label">' + text + '</span></li>';
    }).join('');
    return '<ol class="sb-steps">' + items + '</ol>';
  }

  /**
   * The frame preview: current creative (or an empty frame) at the slot's
   * aspect ratio, with the heading/subtitle overlaid as the temple renders
   * them. The staged upload swaps into this same frame before submission.
   */
  function framePreviewHtml(b, dims) {
    var ratio =
      b.width && b.height
        ? 'aspect-ratio:' + (Number(b.width) || 1) + ' / ' + (Number(b.height) || 1) + ';'
        : 'min-height:180px;';
    var heading = b.customHeading || b.slotName;
    var subtitle = b.customSubtitle || dims;
    var frame =
      '<div class="sb-frame-preview" style="' + ratio + '">' +
      '<img class="sb-frame-img" src="' + S.esc(b.creativePath || '') + '" alt="Creative preview"' + (b.creativePath ? '' : ' hidden') + '>' +
      '<div class="sb-frame-empty"' + (b.creativePath ? ' hidden' : '') + '>' +
      '<span>Your creative runs here</span>' +
      '<span class="sb-frame-empty-dims">' + S.esc(dims) + '</span>' +
      '</div>' +
      '<div class="sb-frame-caption">' +
      '<span class="sb-frame-heading" data-default="' + S.esc(b.slotName) + '">' + S.esc(heading) + '</span>' +
      '<span class="sb-frame-subtitle" data-default="' + S.esc(dims) + '">' + S.esc(subtitle) + '</span>' +
      '</div>' +
      '</div>';
    if (b.status === 'live') {
      // Preview only: link straight to the temple page, never through the
      // analytics click tracker.
      return (
        '<a class="sb-frame-link" href="/sites/' + S.esc(b.siteSlug) + '/" target="_blank" rel="noopener">' +
        frame +
        '</a>' +
        '<p class="sb-frame-live-note"><a href="/sites/' + S.esc(b.siteSlug) + '/" target="_blank" rel="noopener">Live on the temple — open the placement</a></p>'
      );
    }
    return frame;
  }

  function dropzoneHtml(b, dims) {
    var firstUpload = !b.creativePath;
    return (
      '<div class="sb-dropzone" role="button" tabindex="0">' +
      '<input type="file" accept="image/png,image/jpeg,image/webp" hidden>' +
      '<span class="sb-dropzone-label">' + (firstUpload ? 'Upload creative' : 'Replace creative') + '</span>' +
      '<span class="sb-dropzone-hint">Drop an image here, or click to browse — any size photo, we frame it to ' + S.esc(dims) + '</span>' +
      '</div>' +
      '<p class="sb-upload-note" hidden></p>' +
      '<button type="button" class="sb-btn sb-btn-primary sb-btn-sm sb-studio-submit" disabled>Submit for Review</button>'
    );
  }

  function copyFormHtml(b) {
    var id = S.esc(b.id);
    var urlField =
      '<div class="sb-field"><label for="copy-url-' + id + '">Destination URL</label>' +
      '<input type="url" id="copy-url-' + id + '" class="sb-copy-url" placeholder="https://" value="' + S.esc(b.websiteUrl || '') + '"></div>';
    var saveBtn = '<button type="submit" class="sb-btn sb-btn-outline sb-btn-sm">Save copy</button>';

    if (b.isBundle) {
      // Takeover frames share one destination; per-frame headlines are set
      // by the team.
      return (
        '<form class="sb-copy-form">' +
        '<p class="sb-panel-sub">Per-frame headlines for takeovers are set by the team — tell us via the request history if you need them changed.</p>' +
        urlField +
        saveBtn +
        '</form>'
      );
    }

    var limits = copyLimits(b.width);
    return (
      '<form class="sb-copy-form">' +
      '<div class="sb-field"><label for="copy-heading-' + id + '">Headline</label>' +
      '<input type="text" id="copy-heading-' + id + '" class="sb-copy-heading" maxlength="' + limits.heading + '" placeholder="' + S.esc(b.slotName) + '" value="' + S.esc(b.customHeading || '') + '">' +
      '<span class="sb-char-count"></span></div>' +
      '<div class="sb-field"><label for="copy-subtitle-' + id + '">Subtitle</label>' +
      '<input type="text" id="copy-subtitle-' + id + '" class="sb-copy-subtitle" maxlength="' + limits.subtitle + '" placeholder="' + S.esc(b.companyName || '') + '" value="' + S.esc(b.customSubtitle || '') + '">' +
      '<span class="sb-char-count"></span></div>' +
      urlField +
      saveBtn +
      '</form>'
    );
  }

  function actionsHtml(b) {
    if (b.status === 'pending_approval') {
      return '<p class="sb-studio-note">In review — we\'ll email you when the team has looked at it.</p>';
    }
    if (b.status === 'approved' && !b.creativePath) {
      return '<p class="sb-studio-note">Approved — upload a creative above, then publish when the review clears.</p>';
    }
    if (b.status === 'approved') {
      return '<div class="sb-studio-actions"><button type="button" class="sb-btn sb-btn-primary sb-btn-sm" data-action="publish">Publish</button></div>';
    }
    if (b.status === 'live') {
      return '<div class="sb-studio-actions"><button type="button" class="sb-btn sb-btn-ghost sb-btn-sm" data-action="pause">Pause</button></div>';
    }
    return '';
  }

  function studioCardHtml(b) {
    var dims = b.width && b.height ? b.width + ' × ' + b.height + ' px' : 'the slot dimensions';
    var firstUpload = !b.creativePath;
    return (
      '<div class="sb-panel sb-studio" data-booking-id="' + S.esc(b.id) + '" data-width="' + S.esc(b.width || '') + '" data-height="' + S.esc(b.height || '') + '" data-status="' + S.esc(b.status) + '">' +
      '<div class="sb-studio-head">' +
      '<div>' +
      '<h3>' + S.esc(b.slotName) + '</h3>' +
      '<p class="sb-panel-sub"><a href="/sites/' + S.esc(b.siteSlug) + '/">' + S.esc(b.siteSlug) + '</a> · ' + S.esc(dims) + (b.isBundle ? ' · takeover' : '') + '</p>' +
      '</div>' +
      S.statusBadge(b.status) +
      '</div>' +
      timelineHtml(b.status) +
      (firstUpload ? '<p class="sb-first-upload">First upload — this is the image your placement launches with.</p>' : '') +
      '<div class="sb-studio-grid">' +
      '<div class="sb-studio-frame">' + framePreviewHtml(b, dims) + '</div>' +
      '<div class="sb-studio-controls">' +
      dropzoneHtml(b, dims) +
      copyFormHtml(b) +
      actionsHtml(b) +
      '<p class="sb-form-message" role="alert"></p>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /** Patron social-link cards — ported unchanged from the pre-studio page. */
  function patronCardHtml(p) {
    return (
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
  }

  function renderStudio(me) {
    var wrap = document.getElementById('request-forms');
    var cards = [];

    (me.resources.bookings || []).forEach(function (b) {
      if (STUDIO_STATUSES.indexOf(b.status) === -1) return;
      cards.push(studioCardHtml(b));
    });

    (me.resources.patrons || []).forEach(function (p) {
      if (p.status !== 'active') return;
      cards.push(patronCardHtml(p));
    });

    wrap.innerHTML = cards.length
      ? cards.join('')
      : '<div class="sb-state">No changeable resources right now. Creative swaps unlock once a booking is approved, live, or awaiting upload.</div>';

    Array.prototype.forEach.call(wrap.querySelectorAll('.sb-studio'), bindStudioCard);
    bindPatronForms();
  }

  /** Re-fetch /me and re-render the studio after a publish/pause/save. */
  async function refreshStudio(flash) {
    var me = await S.api('/api/account/me/');
    renderStudio(me);
    if (flash) {
      var card = document.querySelector('.sb-studio[data-booking-id="' + flash.bookingId + '"]');
      if (card) {
        var m = card.querySelector('.sb-form-message');
        m.classList.add('success');
        m.textContent = flash.text;
      }
    }
  }

  function bindStudioCard(card) {
    var bookingId = Number(card.getAttribute('data-booking-id'));
    var status = card.getAttribute('data-status');
    var slotW = Number(card.getAttribute('data-width')) || 0;
    var slotH = Number(card.getAttribute('data-height')) || 0;
    var dropzone = card.querySelector('.sb-dropzone');
    var fileInput = dropzone.querySelector('input[type="file"]');
    var frameImg = card.querySelector('.sb-frame-img');
    var frameEmpty = card.querySelector('.sb-frame-empty');
    var note = card.querySelector('.sb-upload-note');
    var submitBtn = card.querySelector('.sb-studio-submit');
    var msg = card.querySelector('.sb-form-message');
    var stagedFile = null;
    var staged = null; // the normalized image, exactly as it will run

    function showStaged(src) {
      frameImg.src = src;
      frameImg.hidden = false;
      if (frameEmpty) frameEmpty.hidden = true;
      submitBtn.disabled = false;
    }

    // Normalize on select/drop (center-crop to the slot frame, downscale to
    // 2×) and preview the processed image inside the frame — what you see
    // is what runs.
    async function stageFile(file) {
      stagedFile = null;
      staged = null;
      submitBtn.disabled = true;
      note.hidden = true;
      msg.classList.remove('success');
      msg.textContent = '';
      if (!file) return;
      if (['image/png', 'image/jpeg', 'image/webp'].indexOf(file.type) === -1) {
        msg.textContent = 'Image must be PNG, JPEG, or WebP.';
        return;
      }
      try {
        stagedFile = file;
        if (window.CreativeNormalize && slotW && slotH) {
          staged = await window.CreativeNormalize.normalizeCreative(file, slotW, slotH);
          note.textContent = staged.tooSmall
            ? 'Smaller than the slot — it will run, but may print soft; a larger original is better.'
            : staged.cropped
              ? 'Framed to ' + staged.width + '×' + staged.height + ' from your ' + staged.originalWidth + '×' + staged.originalHeight + ' original — the preview is exactly what will run.'
              : '';
          note.hidden = !note.textContent;
          showStaged(staged.dataUrl);
        } else {
          showStaged(await readFileAsDataUri(file));
        }
      } catch (err) {
        stagedFile = null;
        staged = null;
        submitBtn.disabled = true;
        note.hidden = true;
        msg.textContent = err.message || 'Could not read this image.';
        // Reset the input so re-selecting the same corrupt file fires change
        // again (shared by the drop path — stageFile is one funnel).
        fileInput.value = '';
      }
    }

    dropzone.addEventListener('click', function () {
      fileInput.click();
    });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', function () {
      stageFile(fileInput.files[0]);
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function (e) {
      // Only clear when the pointer truly leaves the zone — crossing a child
      // span fires dragleave with a relatedTarget still inside it.
      if (e.relatedTarget && dropzone.contains(e.relatedTarget)) {
        return;
      }
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        stageFile(e.dataTransfer.files[0]);
      }
    });

    // Submit the staged creative through the existing change-request contract.
    submitBtn.addEventListener('click', async function () {
      if (!stagedFile) {
        msg.textContent = 'Choose an image first.';
        return;
      }
      msg.classList.remove('success');
      msg.textContent = '';
      submitBtn.disabled = true;
      try {
        var dataUri = staged ? staged.dataUrl : await readFileAsDataUri(stagedFile);
        await S.api('/api/account/requests/', {
          method: 'POST',
          body: {
            type: 'image',
            target: bookingId,
            payload: { image: dataUri, filename: stagedFile.name },
          },
        });
        await refreshStudio({ bookingId: bookingId, text: 'Submitted. It goes live once the team approves it.' });
        loadRequests();
      } catch (err) {
        msg.textContent = err.message;
        submitBtn.disabled = false;
      }
    });

    // Live character counters on the copy fields.
    Array.prototype.forEach.call(card.querySelectorAll('.sb-char-count'), function (counter) {
      var field = counter.parentNode;
      var input = field ? field.querySelector('input') : null;
      if (!input) return;
      var update = function () {
        counter.textContent = input.value.length + '/' + input.maxLength;
      };
      input.addEventListener('input', update);
      update();
    });

    // The caption overlay follows the copy as you type — the frame always
    // shows what will run.
    var copyForm = card.querySelector('.sb-copy-form');
    var headingInput = copyForm.querySelector('.sb-copy-heading');
    var subtitleInput = copyForm.querySelector('.sb-copy-subtitle');
    var urlInput = copyForm.querySelector('.sb-copy-url');
    var capHeading = card.querySelector('.sb-frame-heading');
    var capSubtitle = card.querySelector('.sb-frame-subtitle');
    if (headingInput && capHeading) {
      headingInput.addEventListener('input', function () {
        capHeading.textContent = headingInput.value.trim() || capHeading.getAttribute('data-default') || '';
      });
    }
    if (subtitleInput && capSubtitle) {
      subtitleInput.addEventListener('input', function () {
        capSubtitle.textContent = subtitleInput.value.trim() || capSubtitle.getAttribute('data-default') || '';
      });
    }

    copyForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      msg.classList.remove('success');
      msg.textContent = '';
      var btn = copyForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await S.api('/api/account/bookings/' + encodeURIComponent(bookingId) + '/meta/', {
          method: 'POST',
          body: {
            customHeading: headingInput ? headingInput.value.trim() : '',
            customSubtitle: subtitleInput ? subtitleInput.value.trim() : '',
            websiteUrl: urlInput ? urlInput.value.trim() : '',
          },
        });
        var text =
          status === 'live' || status === 'approved'
            ? 'Saved — live/approved placements go back through review before changes appear.'
            : 'Saved.';
        await refreshStudio({ bookingId: bookingId, text: text });
      } catch (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      }
    });

    // Publish / Pause.
    Array.prototype.forEach.call(card.querySelectorAll('[data-action]'), function (btn) {
      btn.addEventListener('click', async function () {
        var action = btn.getAttribute('data-action');
        msg.classList.remove('success');
        msg.textContent = '';
        btn.disabled = true;
        try {
          var endpoint = action === 'publish' ? '/publish/' : '/pause/';
          await S.api('/api/account/bookings/' + encodeURIComponent(bookingId) + endpoint, {
            method: 'POST',
            body: {},
          });
          await refreshStudio({
            bookingId: bookingId,
            text:
              action === 'publish'
                ? 'Published — your placement is live on the temple.'
                : 'Paused — the placement is off the temple until you publish again.',
          });
        } catch (err) {
          msg.textContent = err.message;
          btn.disabled = false;
        }
      });
    });
  }

  /** Patron social-link forms — ported unchanged from the pre-studio page. */
  function bindPatronForms() {
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
    renderStudio(me);
    loadRequests();
  }

  init().catch(function (err) {
    document.getElementById('request-forms').innerHTML =
      '<div class="sb-state error">' + S.esc(err.message) + '</div>';
  });
})();
