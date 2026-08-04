/**
 * PuniCodex — Check Before You Ink (client engine)
 *
 * Loads /data/ink-index.json (generated from the canonical original-script
 * corpus) and drives the two verifier modes:
 *   - name mode: fuzzy-match a typed name to a lexicon entry and present its
 *     attested form with the full scholarly passport (period, region, signs).
 *   - script mode: structurally analyze a pasted script — Unicode block
 *     census, runic-era check (Elder vs Younger Futhark), alphabet mixing,
 *     and corpus matching (exact, or closest within edit distance 2).
 * Verdict language is deliberately honest: absence from the corpus is never
 * presented as proof of error.
 *
 * Dual-exported for Node tests (window guards throughout).
 */
(function () {
  'use strict';

  // Elder Futhark letters absent from the Younger row, and vice versa. The
  // two alphabets overlap heavily; only the exclusive signs diagnose an era.
  const ELDER_ONLY = 'ᚨᚲᚷᚹᚺᛃᛇᛈᛉᛊᛖᛗᛜᛞᛟ';
  const YOUNGER_ONLY = 'ᚬᚴᚼᛅᛘᛦ';

  const BLOCKS = [
    ['Runic', 0x16a0, 0x16ff],
    ['Greek', 0x0370, 0x03ff],
    ['Greek Extended', 0x1f00, 0x1fff],
    ['Devanagari', 0x0900, 0x097f],
    ['Egyptian Hieroglyphs', 0x13000, 0x1342f],
    ['Avestan', 0x10b00, 0x10b3f],
    ['Cuneiform', 0x12000, 0x123ff],
    ['CJK', 0x4e00, 0x9fff],
    ['Hiragana/Katakana', 0x3040, 0x30ff],
    ['Runic', 0x16a0, 0x16ff],
  ];

  function codePoints(s) {
    return Array.from(s);
  }

  function blockOf(cp) {
    const n = cp.codePointAt(0);
    if ((n >= 0x41 && n <= 0x5a) || (n >= 0x61 && n <= 0x7a) || (n >= 0xc0 && n <= 0x24f))
      return 'Latin';
    for (const [name, lo, hi] of BLOCKS) {
      if (n >= lo && n <= hi) return name;
    }
    if (n >= 0x1f000 && n <= 0x1f02f) return 'Runic (supplement)';
    return null;
  }

  /** Levenshtein over code points (small strings only — scripts are short). */
  function editDistance(a, b) {
    const x = codePoints(a);
    const y = codePoints(b);
    const m = x.length;
    const n = y.length;
    if (Math.abs(m - n) > 3) return 99;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function normalize(s) {
    return s.trim().toLowerCase().normalize('NFC');
  }

  function findEntries(index, q) {
    const needle = normalize(q);
    if (!needle) return [];
    const scored = [];
    for (const e of index.entries) {
      const names = [e.id, e.a, e.u, e.trans, e.script]
        .filter(Boolean)
        .map((v) => normalize(String(v)));
      let score = 0;
      for (const n of names) {
        if (n === needle) score = Math.max(score, 100);
        else if (n.startsWith(needle)) score = Math.max(score, 70 - (n.length - needle.length));
        else if (needle.length >= 3 && n.includes(needle)) score = Math.max(score, 40);
      }
      if (score > 0) scored.push([score, e]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].u.localeCompare(b[1].u));
    return scored.slice(0, 4).map(([, e]) => e);
  }

  function analyzeScript(index, input) {
    const chars = codePoints(input.trim()).filter((c) => c.trim() || c.codePointAt(0) > 0x7f);
    const census = {};
    let latin = 0;
    for (const c of chars) {
      const b = blockOf(c);
      if (!b) continue;
      census[b] = (census[b] || 0) + 1;
      if (b === 'Latin') latin++;
    }
    const elder = chars.filter((c) => ELDER_ONLY.includes(c)).length;
    const younger = chars.filter((c) => YOUNGER_ONLY.includes(c)).length;
    const nonLatinBlocks = Object.keys(census).filter((b) => b !== 'Latin');
    const mixedAlphabets = latin > 0 && nonLatinBlocks.length > 0;

    const clean = input.trim().normalize('NFC');
    let exact = null;
    let closest = null;
    let closestDist = 99;
    if (clean) {
      for (const e of index.entries) {
        if (e.script === clean) {
          exact = e;
          break;
        }
        const d = editDistance(clean, e.script);
        if (d < closestDist) {
          closestDist = d;
          closest = e;
        }
      }
    }
    return {
      census,
      elder,
      younger,
      mixedAlphabets,
      exact,
      closest: closestDist <= 2 ? closest : null,
      closestDist,
      total: chars.length,
    };
  }

  /* ── Rendering (browser only) ─────────────────────────────────────── */

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function passportHtml(e) {
    const cells = [
      ['Script', e.name],
      ['Period', e.period],
      ['Region', e.region],
      ['Family', e.family],
      ['Direction', e.direction],
    ].filter(([, v]) => v);
    return `<div class="ik-passport">${cells
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
      .join('')}</div>`;
  }

  function signsHtml(e) {
    if (!e.signs || !e.signs.length) return '';
    return `<table class="ik-signs"><tr><th></th><th>Sign</th><th>Value</th><th>Note</th></tr>${e.signs
      .map(
        (s) =>
          `<tr><td>${esc(s.sign)}</td><td>${esc(s.name || '')}</td><td>${esc(s.value || '')}</td><td class="ik-sign-note">${esc(s.note || '')}</td></tr>`
      )
      .join('')}</table>`;
  }

  function entryCardHtml(e) {
    return `<div class="ik-card" data-entry="${esc(e.id)}">
      <div class="ik-script-big">${esc(e.script)}</div>
      <div class="ik-script-name">${esc(e.name || 'Original script')} · the attested form of ${esc(e.u)}</div>
      ${passportHtml(e)}
      ${signsHtml(e)}
      <div class="ik-meta-row">
        ${e.trans ? `<span>Transliteration: <b>${esc(e.trans)}</b></span>` : ''}
        ${e.reading ? `<span>Reading: <b>${esc(e.reading)}</b></span>` : ''}
        ${e.r ? `<span>Say it: <b>${esc(e.r)}</b></span>` : ''}
        ${e.ipa ? `<span><b>${esc(e.ipa)}</b></span>` : ''}
      </div>
      <div class="ik-actions">
        <button class="ik-btn" data-copy="${esc(e.script)}" type="button">Copy the attested form</button>
        <a class="ik-btn" href="/sites/${esc(e.id)}/">Enter the temple of ${esc(e.u)} →</a>
      </div>
    </div>`;
  }

  function alignmentHtml(given, attested) {
    const g = codePoints(given);
    const a = codePoints(attested);
    const max = Math.max(g.length, a.length);
    let row1 = '';
    let row2 = '';
    for (let i = 0; i < max; i++) {
      const gc = g[i] || '·';
      const ac = a[i] || '·';
      const diff = gc !== ac;
      row1 += diff ? `<span class="ik-diff">${esc(gc)}</span>` : esc(gc);
      row2 += diff ? `<span class="ik-diff">${esc(ac)}</span>` : esc(ac);
    }
    return `<div class="ik-align">${row1}<br/>${row2}</div>`;
  }

  function boot() {
    const state = { index: null };
    const $ = (id) => document.getElementById(id);
    const namePanel = $('ik-panel-name');
    const scriptPanel = $('ik-panel-script');
    const nameMode = $('ik-mode-name');
    const scriptMode = $('ik-mode-script');
    const nameInput = $('ik-name-input');
    const scriptInput = $('ik-script-input');
    const nameResults = $('ik-name-results');
    const scriptResults = $('ik-script-results');
    const mythsBox = $('ik-myths');

    function setMode(name) {
      const isName = name === 'name';
      namePanel.hidden = !isName;
      scriptPanel.hidden = isName;
      nameMode.classList.toggle('ik-on', isName);
      scriptMode.classList.toggle('ik-on', !isName);
      nameMode.setAttribute('aria-selected', String(isName));
      scriptMode.setAttribute('aria-selected', String(!isName));
    }
    nameMode.addEventListener('click', () => setMode('name'));
    scriptMode.addEventListener('click', () => setMode('script'));

    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-copy]');
      if (!btn) return;
      const text = btn.getAttribute('data-copy');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied — ink it exactly like this';
        });
      }
    });

    fetch('/data/ink-index.json')
      .then((r) => r.json())
      .then((index) => {
        state.index = index;
        mythsBox.innerHTML = index.myths
          .map(
            (m) => `<div class="ik-myth" id="${esc(m.id)}">
              <h3>${esc(m.title)}</h3>
              <p class="ik-myth-claim">“${esc(m.claim)}”</p>
              <p>${esc(m.verdict)}</p>
              <p class="ik-myth-do">${esc(m.correct)}${m.entry ? ` <a href="/sites/${esc(m.entry)}/">See the temple →</a>` : ''}</p>
            </div>`
          )
          .join('');

        let nameTimer = null;
        nameInput.addEventListener('input', () => {
          clearTimeout(nameTimer);
          nameTimer = setTimeout(() => {
            const q = nameInput.value;
            if (!q.trim()) {
              nameResults.innerHTML = '';
              return;
            }
            const hits = findEntries(index, q);
            nameResults.innerHTML = hits.length
              ? hits.map(entryCardHtml).join('')
              : `<div class="ik-verdict ik-verdict--unknown"><div class="ik-verdict-title">Not in the corpus</div>That name is not in the mythological canon we verify. That makes it unverifiable here — not wrong. If it matters, ask a scholar of the language, not a generator.</div>`;
          }, 180);
        });

        let scriptTimer = null;
        scriptInput.addEventListener('input', () => {
          clearTimeout(scriptTimer);
          scriptTimer = setTimeout(() => {
            const q = scriptInput.value;
            if (!q.trim()) {
              scriptResults.innerHTML = '';
              return;
            }
            const a = analyzeScript(index, q);
            const blocks = Object.entries(a.census)
              .map(([b, n]) => `${esc(b)} ×${n}`)
              .join(' · ');
            let html = '';
            if (a.mixedAlphabets) {
              html += `<div class="ik-verdict ik-verdict--warn"><div class="ik-verdict-title">Mixed alphabets</div>This string mixes Latin letters with another script (${blocks}). That is the single most common way a fake or careless rendering announces itself — check every sign against the attested form below.</div>`;
            }
            if (a.elder > 0 && a.younger > 0) {
              html += `<div class="ik-verdict ik-verdict--warn"><div class="ik-verdict-title">Two runic eras in one string</div>This mixes Elder Futhark-only signs (pre-Viking) with Younger Futhark-only signs (Viking Age). No carver ever used both alphabets at once — the string is a modern construction.</div>`;
            } else if (a.elder > 0 && a.younger === 0 && a.total > 0) {
              html += `<div class="ik-verdict ik-verdict--warn"><div class="ik-verdict-title">Elder Futhark — check the era</div>This is the Elder Futhark, the pre-Viking alphabet (to c. 700 CE). It is correct for Migration-Age names — but anachronistic for Þórr, Óðinn, and the Viking-Age gods, who are attested in the Younger row.</div>`;
            }
            if (a.exact) {
              html += `<div class="ik-verdict ik-verdict--ok"><div class="ik-verdict-title">Verified — attested</div>This exact string is in the corpus as the original script of <b>${esc(a.exact.u)}</b> (${esc(a.exact.name || 'original script')}). Ink it exactly as shown — including every mark.</div>`;
              html += entryCardHtml(a.exact);
            } else if (a.closest) {
              html += `<div class="ik-verdict ik-verdict--warn"><div class="ik-verdict-title">Not attested — but close</div>No corpus entry matches exactly. The nearest attested form is <b>${esc(a.closest.u)}</b> (${esc(a.closest.name || '')}), shown sign-for-sign beneath yours — every highlighted sign differs. Yours is on top:</div>`;
              html += alignmentHtml(q.trim(), a.closest.script);
              html += entryCardHtml(a.closest);
            } else if (a.total > 0) {
              html += `<div class="ik-verdict ik-verdict--unknown"><div class="ik-verdict-title">Not in the attested corpus</div>We cannot vouch for this string — it matches nothing in the verified corpus, and it is not close to anything we hold. Absence is not proof of error; it is simply not evidence you can take to a tattoo chair. Ask a scholar of the language before you ink it.${blocks ? `<br/><small>Composition: ${blocks}</small>` : ''}</div>`;
            }
            scriptResults.innerHTML = html;
          }, 220);
        });
      })
      .catch(() => {
        scriptResults.innerHTML =
          '<div class="ik-verdict ik-verdict--unknown">The corpus failed to load — try again in a moment.</div>';
      });
  }

  const api = { findEntries, analyzeScript, editDistance, ELDER_ONLY, YOUNGER_ONLY };
  if (typeof window !== 'undefined') {
    window.PUNICODEX_INK = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
