// Throwaway tuning aid: aggregate Levenshtein edit ops per pantheon.
'use strict';
const { PRONUNCIATION_ATLAS } = require('../type/js/pronunciation-atlas.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { derivePronunciation } = require('../type/js/pronunciation-rules.js');
const { normalize } = require('../scripts/validate-pronunciation-rules.js');

// Edit ops via full DP with backtrace. ops: sub(a→b), ins(b), del(a) — a=atlas, b=derived
function editOps(a, b) {
  const x = [...a];
  const y = [...b];
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i++) dp[i][0] = i;
  for (let j = 0; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  const ops = [];
  let i = x.length;
  let j = y.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)) {
      if (x[i - 1] !== y[j - 1]) ops.push(`sub ${x[i - 1]}→${y[j - 1]}`);
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push(`ins ${y[j - 1]}`);
      j--;
    } else {
      ops.push(`del ${x[i - 1]}`);
      i--;
    }
  }
  return ops;
}

const byId = new Map(LEXICON.map((e) => [e.id, e]));
const target = process.argv[2];
const agg = new Map();
for (const [id, atlas] of Object.entries(PRONUNCIATION_ATLAS)) {
  const entry = byId.get(id);
  if (!entry) continue;
  if (target && entry.pantheon !== target) continue;
  const d = derivePronunciation(entry);
  for (const op of editOps(normalize(atlas.ipa), normalize(d.ipa))) {
    agg.set(op, (agg.get(op) || 0) + 1);
  }
}
const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Top edit ops ${target ? 'for ' + target : 'overall'} (atlas→derived):`);
for (const [op, n] of sorted.slice(0, 30)) console.log(String(n).padStart(5), op);
