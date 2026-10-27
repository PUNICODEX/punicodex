// Scratch verification of js/store-configurator.js overlap fix.
// Minimal DOM stub — enough surface for the configurator's state machine.
const fs = require('node:fs');

function makeEl(tag) {
  const el = {
    tag,
    children: [],
    parentNode: null,
    attrs: {},
    style: {
      setProperty: (k, v) => {
        el.style[k] = v;
      },
    },
    classes: new Set(),
    listeners: {},
    textContent: '',
    type: '',
    disabled: false,
    draggable: false,
    classList: {
      add: (c) => el.classes.add(c),
      remove: (c) => el.classes.delete(c),
      contains: (c) => el.classes.has(c),
    },
    set className(v) {
      el.classes = new Set(String(v).split(/\s+/).filter(Boolean));
    },
    get className() {
      return [...el.classes].join(' ');
    },
    setAttribute(k, v) {
      el.attrs[k] = String(v);
    },
    getAttribute(k) {
      return k in el.attrs ? el.attrs[k] : null;
    },
    removeAttribute(k) {
      delete el.attrs[k];
    },
    appendChild(c) {
      c.parentNode = el;
      el.children.push(c);
      return c;
    },
    insertBefore(c, ref) {
      c.parentNode = el;
      const i = el.children.indexOf(ref);
      if (i === -1) el.children.push(c);
      else el.children.splice(i, 0, c);
      return c;
    },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i !== -1) el.children.splice(i, 1);
      return c;
    },
    addEventListener(t, fn) {
      (el.listeners[t] = el.listeners[t] || []).push(fn);
    },
    click() {
      // Emulate the PDP's pick(): clicking an option button moves `.active`
      // inside its #opts-color / #opts-size group before any listener runs.
      if (el.classes.has('opt') && el.parentNode) {
        for (const sib of el.parentNode.children) {
          if (sib !== el && sib.classes && sib.classes.has('opt')) sib.classes.delete('active');
        }
        el.classes.add('active');
      }
      (el.listeners.click || []).forEach((fn) => fn({ target: el }));
      doc.dispatchClick(el);
    },
    closest(sel) {
      let n = el;
      while (n) {
        if (matches(n, sel)) return n;
        n = n.parentNode;
      }
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      walk(el, (n) => {
        if (matches(n, sel)) out.push(n);
      });
      return out;
    },
    querySelector(sel) {
      return el.querySelectorAll(sel)[0] || null;
    },
  };
  return el;
}
function matches(n, sel) {
  if (!n.classes) return false;
  const m = sel.match(/^([#.][\w-]+)\s+([#.][\w-]+)$/);
  if (m) return matches(n, m[2]) && ancestorMatches(n, m[1]);
  if (sel.startsWith('.')) return n.classes.has(sel.slice(1));
  if (sel.startsWith('#')) return n.attrs.id === sel.slice(1);
  return n.tag === sel;
}
function ancestorMatches(n, sel) {
  n = n.parentNode;
  while (n) {
    if (matches(n, sel)) return true;
    n = n.parentNode;
  }
  return false;
}
function walk(n, fn) {
  for (const c of n.children) {
    fn(c);
    walk(c, fn);
  }
}

const docListeners = { click: [] };
const root = makeEl('div');
const doc = {
  byId: {},
  createElement: makeEl,
  createTextNode: (t) => ({ text: t, textContent: t, attrs: {}, children: [] }),
  getElementById: (id) => doc.byId[id] || null,
  querySelectorAll: (sel) => root.querySelectorAll(sel),
  addEventListener: (t, fn) => docListeners[t].push(fn),
  dispatchClick(el) {
    docListeners.click.forEach((fn) => fn({ target: el }));
  },
};

function optBtn(attr, val, active) {
  const b = makeEl('button');
  b.classes.add('opt');
  if (active) b.classes.add('active');
  b.setAttribute(attr, val);
  b.textContent = val;
  return b;
}

// Fresh page per scenario — elements and document listeners do not leak
// between configurator instances.
function buildPage({ stageSrc, colors }) {
  root.children.length = 0;
  for (const k of Object.keys(doc.byId)) delete doc.byId[k];
  docListeners.click.length = 0;

  const stage = makeEl('div');
  stage.classes.add('stage');
  const stageImg = makeEl('img');
  stageImg.setAttribute('id', 'stage-img');
  stageImg.setAttribute('src', stageSrc);
  stage.appendChild(stageImg);
  root.appendChild(stage);
  doc.byId['stage-img'] = stageImg;

  const mount = makeEl('div');
  mount.setAttribute('id', 'cfg-mount');
  mount.setAttribute('hidden', '');
  root.appendChild(mount);
  doc.byId['cfg-mount'] = mount;

  const cfgData = makeEl('script');
  cfgData.setAttribute('id', 'cfg-data');
  root.appendChild(cfgData);
  doc.byId['cfg-data'] = cfgData;

  const optsColor = makeEl('div');
  optsColor.setAttribute('id', 'opts-color');
  for (const c of colors) optsColor.appendChild(optBtn('data-c', c.name, c === colors[0]));
  root.appendChild(optsColor);
  doc.byId['opts-color'] = optsColor;

  const optsSize = makeEl('div');
  optsSize.setAttribute('id', 'opts-size');
  for (const s of ['S', 'M']) optsSize.appendChild(optBtn('data-s', s, s === 'S'));
  root.appendChild(optsSize);
  doc.byId['opts-size'] = optsSize;

  return { stageImg, mount, cfgData, optsColor };
}

function payload(over) {
  return Object.assign(
    {
      productId: 'zeus-tee',
      productName: 'Zeús Temple Tee',
      kind: 'tee',
      stageSrc: 'https://punycodex-masters.vercel.app/mockups/zeus-tee.jpg',
      baseMockup: '/assets/store-base/tee--black.jpg',
      hasMockup: true,
      placement: { area: 'front', widthPct: 34, topPct: 26, leftPct: 50 },
      labels: ['Ash / S', 'Black / S', 'Navy / S'],
    },
    over
  );
}

const win = {
  dispatchEvent: () => {},
  storeConfigurator: null,
};
const sandbox = {
  document: doc,
  window: win,
  CustomEvent: function () {},
};
win.window = win;
const vm = require('node:vm');
const ctx = vm.createContext(sandbox);

function runConfigurator(page, cfg) {
  win.storeConfigurator = null;
  page.cfgData.textContent = JSON.stringify(cfg);
  const src = fs.readFileSync('js/store-configurator.js', 'utf8');
  try {
    vm.runInContext(src, ctx);
  } catch (err) {
    console.error('configurator threw:', err);
    process.exit(1);
  }
  return win.storeConfigurator.selection;
}
function overlay() {
  const o = root.querySelector('.cfg-art');
  return o ? { src: o.getAttribute('src'), display: o.style.display } : null;
}
function chips() {
  return root
    .querySelectorAll('.cfg-chip--art')
    .map((c) => ({ v: c.getAttribute('data-v'), label: c.getAttribute('title') }));
}
function clickChip(key) {
  const chip = root.querySelectorAll('.cfg-chip--art').find((c) => c.getAttribute('data-v') === key);
  if (!chip) throw new Error('no chip ' + key);
  chip.click();
}
function clickColor(optsColor, name) {
  const b = optsColor.querySelectorAll('.opt').find((x) => x.getAttribute('data-c') === name);
  b.click();
}
const results = [];
function check(name, cond, extra) {
  results.push([cond, name, extra]);
}

// ── Scenario 1: tee — defaultArtwork in arts (the reported overlap bug) ──
const teeArts = [
  { key: 'mascot', label: 'Mascot', src: '/sites/zeus/assets/zeus_mascot.webp' },
  { key: 'logomark', label: 'Logomark', src: '/sites/zeus/assets/zeus_logomark.webp' },
  { key: 'logolockup', label: 'Logo lockup', src: '/sites/zeus/assets/zeus_logolockup.webp' },
];
const teeColors = [
  { name: 'Ash', hex: '#f0f1ea', mockup: '/assets/store-base/tee--ash.jpg' },
  { name: 'Black', hex: '#0c0c0c', mockup: '/assets/store-base/tee--black.jpg' },
  { name: 'Navy', hex: '#212642', mockup: '/assets/store-base/tee--navy.jpg' },
];
let page = buildPage({ stageSrc: 'https://punycodex-masters.vercel.app/mockups/zeus-tee.jpg', colors: teeColors });
let sel = runConfigurator(page, payload({ defaultArtwork: 'mascot', artworks: teeArts, colors: teeColors }));
check('tee init: composite kept, no overlay visible', page.stageImg.getAttribute('src').includes('/mockups/') && overlay().display === 'none', page.stageImg.getAttribute('src'));
check('tee init: selection is baked mascot', sel.artworkKey === 'mascot', sel);
check('tee: no "As shown" chip (baked art exists)', chips().length === 3 && !chips().some((c) => c.v === '__default'), chips().map((c) => c.v));

clickChip('logomark');
check('tee pick logomark: stage swaps to blank base (no overlap)', page.stageImg.getAttribute('src') === '/assets/store-base/tee--ash.jpg', page.stageImg.getAttribute('src'));
check('tee pick logomark: overlay visible with logomark', overlay().display === '' && overlay().src.includes('logomark'), overlay());
check('tee pick logomark: checkout art = logomark', win.storeConfigurator.selection.artworkKey === 'logomark', win.storeConfigurator.selection);

clickChip('mascot');
check('tee back to mascot on default colour: composite restored', page.stageImg.getAttribute('src').includes('/mockups/') && overlay().display === 'none', page.stageImg.getAttribute('src'));

clickColor(page.optsColor, 'Navy');
check('tee Navy + mascot: navy base with overlay (no composite)', page.stageImg.getAttribute('src') === '/assets/store-base/tee--navy.jpg' && overlay().display === '', page.stageImg.getAttribute('src') + ' / ' + overlay().display);

clickChip('logomark');
check('tee Navy + logomark: overlay swaps, still navy base', overlay().src.includes('logomark') && page.stageImg.getAttribute('src') === '/assets/store-base/tee--navy.jpg', overlay());

clickChip('mascot');
check('tee Navy + mascot re-pick: stays on navy base (not composite)', page.stageImg.getAttribute('src') === '/assets/store-base/tee--navy.jpg' && overlay().display === '', page.stageImg.getAttribute('src'));

clickColor(page.optsColor, 'Ash');
check('tee back to Ash with mascot: composite restored', page.stageImg.getAttribute('src').includes('/mockups/') && overlay().display === 'none', page.stageImg.getAttribute('src'));

// ── Scenario 2: mug — defaultArtwork compMug NOT in arts ──
const mugStage = 'https://punycodex-masters.vercel.app/mockups/zeus-mug.jpg';
const mugColors = [{ name: 'Black', hex: '#0c0c0c', mockup: '/assets/store-base/mug--black.jpg' }];
page = buildPage({ stageSrc: mugStage, colors: mugColors });
sel = runConfigurator(
  page,
  payload({
    defaultArtwork: 'compMug',
    artworks: teeArts,
    colors: mugColors,
    stageSrc: mugStage,
    baseMockup: '/assets/store-base/mug--black.jpg',
    productName: 'Zeús Temple Mug',
    kind: 'mug',
    labels: ['Black'],
  })
);
check('mug init: composite kept, overlay hidden (was: instant overlap)', page.stageImg.getAttribute('src') === mugStage && overlay().display === 'none', page.stageImg.getAttribute('src') + ' / ' + JSON.stringify(overlay()));
check('mug: "As shown" chip present + selected; checkout null (default print file)', chips().some((c) => c.v === '__default' && c.label === 'As shown') && win.storeConfigurator.selection.artworkKey === null, chips().map((c) => c.v) + ' / ' + win.storeConfigurator.selection.artworkKey);

clickChip('logomark');
check('mug pick logomark: blank base + overlay (no overlap)', page.stageImg.getAttribute('src') === '/assets/store-base/mug--black.jpg' && overlay().display === '' && overlay().src.includes('logomark'), page.stageImg.getAttribute('src') + ' / ' + JSON.stringify(overlay()));
check('mug pick logomark: checkout logomark', win.storeConfigurator.selection.artworkKey === 'logomark', win.storeConfigurator.selection);

clickChip('__default');
check('mug back to "As shown": composite restored + overlay hidden; checkout null', page.stageImg.getAttribute('src') === mugStage && overlay().display === 'none' && win.storeConfigurator.selection.artworkKey === null, page.stageImg.getAttribute('src') + ' / ' + JSON.stringify(overlay()) + ' / ' + win.storeConfigurator.selection.artworkKey);

// ── Scenario 3: notebook — single design art = composite master ──
const nbStage = 'https://punycodex-masters.vercel.app/mockups/zeus-notebook.jpg';
const nbColors = [{ name: 'Dotted', hex: null, mockup: '/assets/store-base/notebook--dotted.jpg' }];
page = buildPage({ stageSrc: nbStage, colors: nbColors });
runConfigurator(
  page,
  payload({
    defaultArtwork: 'compNotebook',
    artworks: [{ key: 'design', label: 'Design', src: '/sites/zeus/assets/zeus_comp-notebook.png' }],
    colors: nbColors,
    stageSrc: nbStage,
    baseMockup: '/assets/store-base/notebook--dotted.jpg',
    productName: 'Zeús Temple Notebook',
    kind: 'notebook',
    labels: ['Dotted'],
  })
);
check('notebook init: composite kept, overlay hidden, no chips (single design)', page.stageImg.getAttribute('src') === nbStage && overlay().display === 'none' && chips().length === 0, page.stageImg.getAttribute('src') + ' / ' + chips().length);

let fail = 0;
for (const [ok, name, extra] of results) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : `\n      got: ${JSON.stringify(extra)}`));
  if (!ok) fail++;
}
console.log(`\n${results.length - fail}/${results.length} checks passed`);
process.exit(fail ? 1 : 0);
