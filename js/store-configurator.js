/**
 * PuniCodex Reliquary — PDP product configurator (P1/P2).
 *
 * Progressive enhancement over the generated product page: reads the
 * per-product configurator payload (#cfg-data, emitted by
 * scripts/generate-store-pages.js) and renders artwork + colour chips that
 * drive the EXISTING PDP controls (the #opts-color / #opts-size buttons and
 * the #stage-img mockup). With JS disabled the page looks and buys exactly as
 * before — the mount point stays hidden and the base markup is untouched.
 *
 * Two preview modes:
 *  - overlay: garment kinds with a real mockup photo (placement != null and
 *    hasMockup). The stage base is the BLANK garment photo for the selected
 *    colour (colors[].mockup from store/base-colors.json — square flat-lays
 *    rendered by scripts/generate-store-base-mockups.js); the chosen
 *    transparent art is layered on top at the placement geometry, so every
 *    art × colour combination previews instantly from N+M assets. Colours
 *    without a base mockup fall back to the composite photo with the interim
 *    CSS-filter approximation (store-configurator.css).
 *  - swap: everything else. The stage image itself swaps per art chip
 *    (each art is a distinct image); colours still drive variant selection
 *    but do not recolour the preview.
 *
 * Composite-photo doctrine (the overlap fix): the recovered mockup fleet
 * photo already has a print baked into the garment. The live overlay is
 * NEVER stacked on that photo — that produced two overlapping prints when a
 * non-default art was picked. BAKED names the choosable art matching the
 * baked print (the catalog's defaultArtwork, or the single-design art whose
 * src IS the composite master). While the selection matches BAKED the photo
 * shows alone (overlay hidden); any other selection moves the stage to the
 * blank garment base and prints there. When the composite's print is not a
 * choosable art at all (wrap/tote/poster/canvas composites) a virtual
 * "As shown" chip represents the photo and checks out with no artworkKey —
 * the sync variant's default print file, exactly what the photo shows
 * (sending a plain art instead would fulfil a print the photo never showed).
 *
 * State is exposed as window.storeConfigurator.selection and broadcast on
 * the window event 'store-configurator:change' so the buy flow (and any
 * analytics) can read { artworkKey, colorName, size }.
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('cfg-data');
  var mount = document.getElementById('cfg-mount');
  if (!dataEl || !mount) return;

  var data;
  try {
    data = JSON.parse(dataEl.textContent || '');
  } catch (err) {
    return;
  }
  if (!data || !Array.isArray(data.artworks) || data.artworks.length === 0) return;

  var LABELS = data.labels || [];
  var COLORS = data.colors || [];
  var PLACEMENT = data.placement ? data.placement : null;
  var MODE = PLACEMENT ? 'overlay' : 'swap';
  // Composite stage: the recovered mockup fleet photo, which already has a
  // print baked into the garment (a blank base photo is not composite).
  var COMPOSITE = /\/mockups\//.test(data.stageSrc || '');
  // BAKED — the choosable art whose print is baked into the composite photo:
  // the catalog's defaultArtwork, or (single-design products whose only art
  // IS the composite master) that first art. null when the composite shows a
  // non-choosable print (wrap/tote/poster/canvas composites).
  var BAKED = null;
  if (data.artworks.some(function (a) { return a.key === data.defaultArtwork; })) {
    BAKED = data.defaultArtwork;
  } else if (
    COMPOSITE &&
    data.artworks.length &&
    String(data.artworks[0].src).indexOf('_comp-') !== -1
  ) {
    BAKED = data.artworks[0].key;
  }
  // Composite stages whose baked print is not a choosable art get a virtual
  // "As shown" chip: it previews the product photo and checks out with no
  // artworkKey (the sync variant's default print file — exactly what the
  // photo shows). Without it the initial selection would checkout a plain
  // art the photo never displayed.
  var NEED_DEFAULT_CHIP = MODE === 'overlay' && COMPOSITE && BAKED === null;
  // Swap mode (object kinds) prepends a virtual "Product photo" chip so the
  // buyer can return to the original stage image; overlay stages whose
  // composite print is not choosable get the equivalent "As shown" chip.
  var ARTS =
    MODE === 'swap'
      ? [{ key: '__default', label: 'Product photo', src: data.stageSrc }].concat(data.artworks)
      : NEED_DEFAULT_CHIP
        ? [{ key: '__default', label: 'As shown', src: data.stageSrc }].concat(data.artworks)
        : data.artworks;

  var state = {
    artworkKey:
      MODE === 'swap' || NEED_DEFAULT_CHIP
        ? '__default'
        : BAKED || (data.artworks[0] && data.artworks[0].key),
    colorName: null,
    size: null,
  };

  // ── Existing PDP controls (the single source of truth) ──
  var colorBtns = slice(document.querySelectorAll('#opts-color .opt'));
  var sizeBtns = slice(document.querySelectorAll('#opts-size .opt'));
  var stageImg = document.getElementById('stage-img');

  function slice(list) {
    return Array.prototype.slice.call(list);
  }
  function activeBtn(btns) {
    for (var i = 0; i < btns.length; i++) if (btns[i].classList.contains('active')) return btns[i];
    return null;
  }
  function activeColor() {
    var b = activeBtn(colorBtns);
    return b ? b.getAttribute('data-c') : null;
  }
  function activeSize() {
    var b = activeBtn(sizeBtns);
    return b ? b.getAttribute('data-s') : null;
  }
  // Mirrors the PDP's currentLabel() resolution: colour + size → slash label,
  // bare colour, bare size, first label.
  function labelFor(color, size) {
    if (color && LABELS.indexOf(color + ' / ' + size) !== -1) return color + ' / ' + size;
    if (color && LABELS.indexOf(color) !== -1) return color;
    if (LABELS.indexOf(size) !== -1) return size;
    return LABELS[0] || 'One size';
  }
  function sizesForColor(color) {
    var out = [];
    for (var i = 0; i < LABELS.length; i++) {
      var label = LABELS[i];
      if (color && label.indexOf(color + ' / ') === 0) out.push(label.slice(color.length + 3));
      else if (!color && LABELS.indexOf(label) !== -1 && label.indexOf(' / ') === -1) out.push(label);
    }
    return out;
  }

  // ── State broadcasting ──
  function broadcast() {
    state.colorName = activeColor();
    state.size = activeSize() || (sizeBtns.length ? null : undefined);
    // '__default' (swap-mode product photo) is not a real artwork — checkout
    // receives null and records no artwork intent.
    var detail = {
      artworkKey: state.artworkKey === '__default' ? null : state.artworkKey,
      colorName: state.colorName,
      size: state.size,
    };
    try {
      window.dispatchEvent(new CustomEvent('store-configurator:change', { detail: detail }));
    } catch (err) {
      /* no CustomEvent (very old engines) — selection getter still works */
    }
    if (window.storeConfigurator) window.storeConfigurator.selection = detail;
  }

  window.storeConfigurator = {
    selection: { artworkKey: state.artworkKey === '__default' ? null : state.artworkKey, colorName: null, size: null },
  };

  // ── Stage: art overlay or art swap ──
  var overlayImg = null;
  var tintLayer = null;

  function artByKey(key) {
    for (var i = 0; i < ARTS.length; i++) if (ARTS[i].key === key) return ARTS[i];
    return ARTS[0];
  }
  function colorEntry(name) {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].name === name) return COLORS[i];
    return null;
  }
  function stageIsComposite() {
    return /\/mockups\//.test(stageImg.getAttribute('src') || '');
  }

  function applyArt() {
    var art = artByKey(state.artworkKey);
    // Portrait arts carry their own (narrower) geometry so they never spill
    // off the garment; landscape pieces use the kind's default placement.
    var place = art.placement || PLACEMENT;
    if (MODE === 'overlay' && stageImg) {
      // The composite photo already has a print baked into the garment, so
      // the live overlay is never stacked on top of it (that was the overlap
      // bug: picking a non-default art drew it over the baked-in print).
      // The selection matching the baked print shows the photo alone; any
      // other selection moves the stage to the blank garment base.
      var isDefaultView =
        COMPOSITE && (state.artworkKey === '__default' || (BAKED != null && art.key === BAKED));
      if (!isDefaultView && stageIsComposite()) {
        // applyColor routes away from the composite while a non-baked art is
        // selected — its keep-composite branch requires the baked selection.
        applyColor();
      } else if (isDefaultView && !stageIsComposite() && COMPOSITE) {
        // Back to the design the photograph shows — restore the photo instead
        // of a blank garment. Real arts restore only on the composite's own
        // colour (on any other colour the art previews on the coloured base);
        // the virtual "As shown" chip always means the photo itself.
        var defName = COLORS.length ? COLORS[0].name : null;
        var curName = activeColor();
        if (state.artworkKey === '__default' || !curName || curName === defName) {
          if (stageImg.getAttribute('src') !== data.stageSrc) {
            stageImg.setAttribute('src', data.stageSrc);
          }
        }
      }

      if (!overlayImg) {
        overlayImg = document.createElement('img');
        overlayImg.className = 'cfg-art';
        overlayImg.setAttribute('alt', '');
        overlayImg.setAttribute('aria-hidden', 'true');
        overlayImg.draggable = false;
        stageImg.parentNode.insertBefore(overlayImg, stageImg.nextSibling);
      }
      overlayImg.style.width = place.widthPct + '%';
      overlayImg.style.top = place.topPct + '%';
      overlayImg.style.left = (place.leftPct == null ? 50 : place.leftPct) + '%';
      if (overlayImg.getAttribute('src') !== art.src) overlayImg.setAttribute('src', art.src);
      // The overlay only ever prints on a blank garment base — never over
      // the composite photo (its print is already baked into the garment).
      overlayImg.style.display = stageIsComposite() ? 'none' : '';
    } else if (stageImg) {
      if (stageImg.getAttribute('src') !== art.src) stageImg.setAttribute('src', art.src);
    }
    if (stageImg) {
      var bits = [(data.productName || '').trim(), art.label];
      if (state.colorName) bits.push(state.colorName);
      stageImg.setAttribute('alt', bits.filter(Boolean).join(' — '));
    }
  }

  function applyColor() {
    var color = activeColor();
    if (MODE !== 'overlay' || !stageImg) return;
    var entry = colorEntry(color);
    var note = document.getElementById('colour-note');
    if (note) {
      note.textContent = color
        ? `Shown in ${color} — the design prints the same on every colour.`
        : data.colors && data.colors.length
          ? `Shown in ${data.colors[0].name} — the design prints the same on every colour.`
          : '';
    }

    // Strip interim tint state — a real base mockup replaces it.
    stageImg.className = stageImg.className
      .split(/\s+/)
      .filter(function (c) {
        return c && c.indexOf('cfg-tint-') !== 0;
      })
      .join(' ');
    if (tintLayer) {
      tintLayer.parentNode.removeChild(tintLayer);
      tintLayer = null;
    }

    // Fleet default view: when the stage is a photoreal composite (the
    // recovered mockup fleet), the active colour is the first/default chip,
    // AND the current selection is the design baked into the photo, the
    // composite IS this colour's product photo — keep it. The blank-garment
    // swap is for non-default colours and non-baked arts only; swapping on
    // init replaced every fleet PDP's print photo with an empty shirt (the
    // b6060d37 live-verification catch).
    var isCompositeStage = /\/mockups\//.test(data.stageSrc || '');
    var defaultName = data.colors && data.colors.length ? data.colors[0].name : null;
    if (
      isCompositeStage &&
      (!color || color === defaultName) &&
      (state.artworkKey === '__default' || state.artworkKey === BAKED)
    ) {
      if (note) {
        note.textContent =
          'The print proof — pick a colour to see the garment in every shade.';
      }
      if (stageImg.getAttribute('src') !== data.stageSrc) {
        stageImg.setAttribute('src', data.stageSrc);
      }
      applyArt();
      return;
    }

    var base = entry && entry.mockup ? entry.mockup : data.baseMockup || null;
    if (base) {
      if (stageImg.getAttribute('src') !== base) stageImg.setAttribute('src', base);
    } else {
      if (stageImg.getAttribute('src') !== data.stageSrc) stageImg.setAttribute('src', data.stageSrc);
      // INTERIM fallback for colours with no base mockup: CSS-filter
      // approximations over the composite photo (see the CSS disclaimer).
      var hex = entry ? entry.hex : null;
      var key = color ? color.toLowerCase() : '';
      if (key === 'white') {
        stageImg.className = (stageImg.className + ' cfg-tint-white').trim();
      } else if (key && key !== 'black' && hex) {
        tintLayer = document.createElement('div');
        tintLayer.className = 'cfg-tint-mix';
        tintLayer.setAttribute('aria-hidden', 'true');
        tintLayer.style.background = hex;
        stageImg.parentNode.insertBefore(tintLayer, stageImg.nextSibling);
      }
    }
    applyArt();
  }

  function applySizes() {
    if (!colorBtns.length || !sizeBtns.length) return;
    var color = activeColor();
    var available = sizesForColor(color);
    var active = activeBtn(sizeBtns);
    var activeDisabled = false;
    sizeBtns.forEach(function (b) {
      var s = b.getAttribute('data-s');
      var ok = available.length === 0 || available.indexOf(s) !== -1;
      b.disabled = !ok;
      b.setAttribute('aria-disabled', ok ? 'false' : 'true');
      if (!ok && b === active) activeDisabled = true;
    });
    if (activeDisabled) {
      for (var i = 0; i < sizeBtns.length; i++) {
        if (!sizeBtns[i].disabled) {
          sizeBtns[i].click();
          return;
        }
      }
    }
  }

  // ── Chip rendering ──
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.appendChild(document.createTextNode(text));
    return node;
  }

  function makeChipGroup(labelText, items, current, onPick, chipClass, decorate) {
    var group = el('div', 'cfg-group');
    group.appendChild(el('div', 'cfg-lbl', labelText));
    var row = el('div', 'cfg-chips');
    row.setAttribute('role', 'radiogroup');
    row.setAttribute('aria-label', labelText);
    items.forEach(function (item) {
      var chip = el('button', chipClass);
      chip.type = 'button';
      chip.setAttribute('role', 'radio');
      var value = typeof item === 'string' ? item : item.key || item.name;
      var name = typeof item === 'string' ? item : item.label || item.name;
      chip.setAttribute('aria-checked', value === current ? 'true' : 'false');
      chip.setAttribute('aria-label', name);
      chip.title = name;
      if (decorate) decorate(chip, item);
      chip.addEventListener('click', function () {
        onPick(value, chip);
      });
      row.appendChild(chip);
    });
    group.appendChild(row);
    return group;
  }

  function syncChips(row, current, valueAttr) {
    slice(row.querySelectorAll('.cfg-chip')).forEach(function (chip) {
      var v = valueAttr ? chip.getAttribute(valueAttr) : chip.getAttribute('data-v');
      chip.setAttribute('aria-checked', v === current ? 'true' : 'false');
    });
  }

  var rendered = false;

  if (ARTS.length > 1) {
    var artRow = makeChipGroup(
      'Artwork',
      ARTS,
      state.artworkKey,
      function (key, chip) {
        state.artworkKey = key;
        syncChips(chip.parentNode, key, 'data-v');
        applyArt();
        broadcast();
      },
      'cfg-chip cfg-chip--art',
      function (chip, art) {
        chip.setAttribute('data-v', art.key);
        // Licensed temple creatives carry attribution — the tooltip and the
        // chip image alt name the creator alongside the title.
        var label = art.creator ? art.label + ' — by ' + art.creator : art.label;
        chip.setAttribute('title', label);
        var img = el('img');
        img.src = art.src;
        img.alt = label;
        img.setAttribute('aria-hidden', 'true');
        img.loading = 'lazy';
        chip.appendChild(img);
      }
    );
    mount.appendChild(artRow);
    rendered = true;
  }

  if (COLORS.length && colorBtns.length) {
    var colorGroup = makeChipGroup(
      'Colour',
      COLORS,
      activeColor(),
      function (name, chip) {
        for (var i = 0; i < colorBtns.length; i++) {
          if (colorBtns[i].getAttribute('data-c') === name) {
            colorBtns[i].click();
            break;
          }
        }
      },
      'cfg-chip cfg-chip--color',
      function (chip, color) {
        chip.setAttribute('data-v', color.name);
        if (color.hex) chip.style.setProperty('--chip-hex', color.hex);
        else chip.className += ' cfg-chip--unknown';
      }
    );
    var colorRow = colorGroup.querySelector('.cfg-chips');
    // Colour chips mirror the canonical buttons: keep selection in sync when
    // the underlying control changes for any reason.
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('#opts-color .opt') : null;
      if (btn) syncChips(colorRow, btn.getAttribute('data-c'), 'data-v');
    });
    // The old text buttons are superseded by the chips while JS runs — hide
    // the whole group (label included); the markup stays in the DOM as the
    // no-JS fallback and the state source.
    var optsColor = document.getElementById('opts-color');
    var colorGroupEl = optsColor && optsColor.closest ? optsColor.closest('.opt-group') : null;
    if (colorGroupEl) colorGroupEl.className += ' cfg-superseded';
    mount.appendChild(colorGroup);
    rendered = true;
  }

  if (rendered) mount.removeAttribute('hidden');

  // React to direct interaction with the canonical buttons too (size changes,
  // colour changes via chips are click-throughs).
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#opts-color .opt') || t.closest('#opts-size .opt')) {
      applySizes();
      applyColor();
      broadcast();
    }
  });

  // Init from the page's own initial state.
  applyArt();
  applyColor();
  applySizes();
  broadcast();
})();
