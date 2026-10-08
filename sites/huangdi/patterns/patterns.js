/**
 * PuniCodex — Patterns page engine
 *
 * Renders the per-temple industry donut from window.TEMPLE_PATTERNS:
 *   - arcs sized by affinity weight, colored by sector
 *   - click/keyboard selection drives the detail panel
 *   - detail panel shows the industry, the justification for this temple,
 *     and every aligned sister temple (cross-linked)
 * No dependencies; SVG is built by hand.
 */

(function () {
  'use strict';

  var data = window.TEMPLE_PATTERNS;
  if (!data || !data.industries || !data.industries.length) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CX = 210;
  var CY = 210;
  var R_OUTER = 168;
  var R_INNER = 104;
  var GAP_DEG = 1.6;
  var MIN_ARC_WEIGHT = 0.55; // floor so resonant arcs stay clickable

  var donut = document.getElementById('patterns-donut');
  var panel = document.getElementById('patterns-detail-panel');
  var legend = document.getElementById('patterns-sector-legend');
  var centerCount = document.getElementById('patterns-center-count');
  var indexGrid = document.getElementById('patterns-index-grid');

  var industries = data.industries;
  var selected = null;

  function sectorColor(sectorId) {
    var s = data.sectors.find(function (x) { return x.id === sectorId; });
    return s ? s.color : '#d4af37';
  }

  function sectorName(sectorId) {
    var s = data.sectors.find(function (x) { return x.id === sectorId; });
    return s ? s.name : sectorId;
  }

  function polar(angleDeg, radius) {
    var a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
  }

  function arcPath(startDeg, endDeg) {
    var large = endDeg - startDeg > 180 ? 1 : 0;
    var p1 = polar(startDeg, R_OUTER);
    var p2 = polar(endDeg, R_OUTER);
    var p3 = polar(endDeg, R_INNER);
    var p4 = polar(startDeg, R_INNER);
    return [
      'M', p1.x.toFixed(2), p1.y.toFixed(2),
      'A', R_OUTER, R_OUTER, 0, large, 1, p2.x.toFixed(2), p2.y.toFixed(2),
      'L', p3.x.toFixed(2), p3.y.toFixed(2),
      'A', R_INNER, R_INNER, 0, large, 0, p4.x.toFixed(2), p4.y.toFixed(2),
      'Z',
    ].join(' ');
  }

  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function weightLabel(w) {
    return w === 2 ? 'Primary' : 'Resonant';
  }

  function weightClass(w) {
    return w === 2 ? 'primary' : 'resonant';
  }

  // --- Donut ---------------------------------------------------------------

  function arcWeight(ind) {
    return Math.max(ind.weight, MIN_ARC_WEIGHT);
  }

  function renderDonut() {
    var total = industries.reduce(function (n, ind) { return n + arcWeight(ind); }, 0);
    var available = 360 - GAP_DEG * industries.length;
    var angle = 0;

    industries.forEach(function (ind, i) {
      var sweep = (arcWeight(ind) / total) * available;
      var start = angle;
      var end = angle + sweep;
      angle = end + GAP_DEG;

      var path = el('path', {
        d: arcPath(start, end),
        fill: sectorColor(ind.sector),
        class: 'patterns-arc',
        tabindex: '0',
        role: 'button',
        'aria-label': ind.name + ' — ' + weightLabel(ind.weight) + ' pattern. Show aligned temples.',
        'data-index': String(i),
        opacity: '0.92',
      });

      path.addEventListener('click', function () { select(i); });
      path.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(i);
        }
      });
      path.addEventListener('mouseenter', function () { dimExcept(i); });
      path.addEventListener('mouseleave', function () { dimExcept(selected); });

      donut.appendChild(path);

      // Arc label for generous segments only.
      if (sweep > 26) {
        var mid = (start + end) / 2;
        var lp = polar(mid, (R_OUTER + R_INNER) / 2);
        var words = ind.name.split(/[\s,&]+/).filter(Boolean);
        var labelText = words.slice(0, 2).join(' ');
        var text = el('text', {
          x: lp.x.toFixed(1),
          y: lp.y.toFixed(1),
          class: 'patterns-arc-label',
        });
        text.textContent = labelText;
        donut.appendChild(text);
      }
    });
  }

  function dimExcept(index) {
    var arcs = donut.querySelectorAll('.patterns-arc');
    arcs.forEach(function (arc, i) {
      arc.classList.toggle('is-dimmed', index !== null && i !== index);
    });
  }

  // --- Detail panel --------------------------------------------------------

  function templeHref(member) {
    return member.hasFlagship ? '/' + member.id + '/patterns/' : '/' + member.id + '/';
  }

  function renderDetail(ind) {
    var others = ind.members.filter(function (m) { return m.id !== data.id; });
    var self = ind.members.find(function (m) { return m.id === data.id; });

    var html = '';
    html += '<div class="patterns-detail-sector"><span class="patterns-sector-dot" style="background:' +
      sectorColor(ind.sector) + '"></span>' + sectorName(ind.sector) + '</div>';
    html += '<h3 class="patterns-detail-title">' + ind.name + '</h3>';
    html += '<p class="patterns-detail-tagline">' + ind.tagline + '</p>';
    html += '<span class="patterns-detail-weight ' + weightClass(ind.weight) + '">' +
      weightLabel(ind.weight) + ' alignment for ' + data.unicode + '</span>';
    html += '<p class="patterns-detail-why"><strong>Why ' + data.unicode + ' aligns:</strong> ' +
      (self ? self.why : ind.note) + '</p>';

    if (others.length) {
      html += '<h4 class="patterns-aligned-title">' + others.length +
        ' aligned temple' + (others.length === 1 ? '' : 's') + ' share this pattern</h4>';
      html += '<div class="patterns-aligned-list">';
      others.forEach(function (m) {
        html += '<a class="patterns-aligned-item" href="' + templeHref(m) + '">' +
          '<span class="patterns-aligned-unicode">' + m.unicode + '</span>' +
          '<span class="patterns-aligned-pantheon">' + (m.pantheonLabel || m.pantheon) + '</span>' +
          '<span class="patterns-aligned-weight ' + weightClass(m.weight) + '">' + weightLabel(m.weight) + '</span>' +
          '</a>';
      });
      html += '</div>';
    } else {
      html += '<h4 class="patterns-aligned-title">This pattern stands alone</h4>';
      html += '<div class="patterns-aligned-self">No other temple in the collection carries the ' +
        ind.name + ' pattern — ' + data.unicode + ' holds it uniquely.</div>';
    }

    panel.innerHTML = html;
  }

  function select(index) {
    selected = index;
    var arcs = donut.querySelectorAll('.patterns-arc');
    arcs.forEach(function (arc, i) {
      arc.classList.toggle('is-selected', i === index);
    });
    dimExcept(index);
    renderDetail(industries[index]);
    var cards = indexGrid.querySelectorAll('.patterns-index-card');
    cards.forEach(function (card, i) {
      card.style.borderColor = i === index ? 'rgba(212,175,55,0.6)' : '';
    });
  }

  // --- Sector legend -------------------------------------------------------

  function renderLegend() {
    var seen = [];
    industries.forEach(function (ind) {
      if (seen.indexOf(ind.sector) === -1) seen.push(ind.sector);
    });
    legend.innerHTML = seen
      .map(function (sid) {
        return '<span class="patterns-sector-chip"><span class="patterns-sector-dot" style="background:' +
          sectorColor(sid) + '"></span>' + sectorName(sid) + '</span>';
      })
      .join('');
  }

  // --- Index grid ----------------------------------------------------------

  function renderIndex() {
    indexGrid.innerHTML = '';
    industries.forEach(function (ind, i) {
      var card = document.createElement('div');
      card.className = 'patterns-index-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Show ' + ind.name + ' in the pattern wheel');
      card.innerHTML =
        '<div class="patterns-index-card-bar" style="background:' + sectorColor(ind.sector) + '"></div>' +
        '<div class="patterns-index-card-body">' +
        '<div class="patterns-index-card-sector">' + sectorName(ind.sector) + '</div>' +
        '<h3 class="patterns-index-card-name">' + ind.name + '</h3>' +
        '<p class="patterns-index-card-tagline">' + ind.tagline + '</p>' +
        '<div class="patterns-index-card-meta"><span>' + ind.members.length +
        (ind.members.length === 1 ? ' temple' : ' temples') + '</span>' +
        '<span class="weight">' + weightLabel(ind.weight) + '</span></div>' +
        '</div>';
      card.addEventListener('click', function () {
        select(i);
        document.getElementById('patterns-graph-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(i);
        }
      });
      indexGrid.appendChild(card);
    });
  }

  // --- Boot ----------------------------------------------------------------

  centerCount.textContent = industries.length + (industries.length === 1 ? ' industry' : ' industries');
  renderDonut();
  renderLegend();
  renderIndex();
  select(0); // strongest industry first — panel is never empty
})();
