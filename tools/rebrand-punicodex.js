/**
 * One-off rebrand sweep: PÚNYCODEX/PUNYCODEX/Punycodex/punycodex -> PuniCodex family.
 * Exact case-sensitive variants only — the technical term "punycode" can never
 * match these patterns (it lacks the trailing x), so it is preserved verbatim.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');

const found = execSync('git grep -hio "punycodex" -- . ":!node_modules"', {
  encoding: 'utf8',
  maxBuffer: 1 << 28,
});
const weird = new Set();
for (const m of found.split('\n').filter(Boolean)) {
  if (!['punycodex', 'Punycodex', 'PUNYCODEX', 'PÚNYCODEX', 'PunyCodex'].includes(m)) weird.add(m);
}
if (weird.size) {
  console.error('Non-standard casings found, aborting:', [...weird].join(', '));
  process.exit(1);
}

const files = execSync(
  'git grep -Il -e PÚNYCODEX -e PUNYCODEX -e Punycodex -e punycodex -- . ":!node_modules"',
  { encoding: 'utf8', maxBuffer: 1 << 28 }
)
  .split('\n')
  .filter(Boolean);

const REPLACEMENTS = [
  [/PÚNYCODEX/g, 'PuniCodex'],
  [/PUNYCODEX/g, 'PUNICODEX'],
  [/PunyCodex/g, 'PuniCodex'],
  [/Punycodex/g, 'Punicodex'],
  [/punycodex/g, 'punicodex'],
];

let changed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let out = src;
  for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
  if (out !== src) {
    fs.writeFileSync(f, out);
    changed++;
  }
}
console.log(`swept ${files.length} files with matches; modified ${changed}`);
