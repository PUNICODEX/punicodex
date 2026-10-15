// Rewrite the sia provenance record in original-scripts-extra.json so the
// PRIMARY writing is sjꜣ (𓋴𓇌𓄿, s + dual-reed glide + alef) matching the
// curated mapping and the lexicon unicode; sꜥ (𓋴𓂝) is kept as the attested
// variant. Scoped to the sia JSON block — other entries are untouched.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'type/js/original-scripts-extra.json');
let s = fs.readFileSync(FILE, 'utf8');

const key = '"sia": {';
const start = s.indexOf(key);
if (start < 0) throw new Error('sia block not found');
let depth = 0;
let end = -1;
for (let i = start + key.length - 1; i < s.length; i++) {
  if (s[i] === '{') depth++;
  else if (s[i] === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
let block = s.slice(start, end);

const rep = (oldStr, newStr) => {
  if (!block.includes(oldStr)) throw new Error('missing: ' + JSON.stringify(oldStr.slice(0, 50)));
  block = block.split(oldStr).join(newStr);
};

rep('"originalScript": "𓋴𓂝"', '"originalScript": "𓋴𓇌𓄿"');
rep('"original": "𓋴𓂝"', '"original": "𓋴𓇌𓄿"');
rep('"transliteration": "sꜥ"', '"transliteration": "sjꜣ"');
rep(
  '"phoneticReconstruction": "Egyptian sꜥ; vowels supplied by convention."',
  '"phoneticReconstruction": "Egyptian sjꜣ (attested variant skeleton sꜥ, 𓋴𓂝); vowels supplied by convention."'
);
rep(
  'Egyptian sꜥ “perception, intellect\\"; the personification',
  'Egyptian sjꜣ “perception, intellect\\"; the personification'
);

// Sign breakdown: s (S29) + dual reed leaves (M17, the y/j glide) + vulture (G1, alef ꜣ)
const signsStart = block.indexOf('"signs": [');
let sDepth = 0, sEnd = -1;
for (let i = block.indexOf('[', signsStart); i < block.length; i++) {
  if (block[i] === '[') sDepth++;
  else if (block[i] === ']') {
    sDepth--;
    if (sDepth === 0) { sEnd = i + 1; break; }
  }
}
const newSigns = `"signs": [
   {
    "sign": "𓋴",
    "name": "S29 folded cloth",
    "value": "s",
    "function": "phonogram (uniliteral)",
    "note": "The uniliteral s."
   },
   {
    "sign": "𓇌",
    "name": "M17 dual reed leaves",
    "value": "j (y glide)",
    "function": "phonogram",
    "note": "Writes the palatal glide; this is the sign that distinguishes sjꜣ from sꜥ."
   },
   {
    "sign": "𓄿",
    "name": "G1 vulture",
    "value": "ꜣ (alef)",
    "function": "phonogram",
    "note": "The Egyptological alef. An attested variant spelling writes the ayin 𓂝 instead, giving sꜥ — preserved at sꜥ.com."
   }
  ]`;
block = block.slice(0, signsStart) + newSigns + block.slice(sEnd);

// Steps: mirror the curated canonical story
const stepsStart = block.indexOf('"steps": [');
let tDepth = 0, tEnd = -1;
for (let i = block.indexOf('[', stepsStart); i < block.length; i++) {
  if (block[i] === '[') tDepth++;
  else if (block[i] === ']') {
    tDepth--;
    if (tDepth === 0) { tEnd = i + 1; break; }
  }
}
const newSteps = `"steps": [
   "The Egyptian name is written 𓋴𓇌𓄿 in hieroglyphs.",
   "S29 folded cloth (𓋴) is the uniliteral s; M17 dual reed leaves (𓇌) write the y/j glide; G1 vulture (𓄿) is the alef ꜣ.",
   "Together sjꜣ writes Sia, the personified perception/knowledge attested from the Pyramid Texts onward — Faulkner's dictionary headword.",
   "An attested variant skeleton sꜥ (𓋴𓂝, with the ayin forearm) is preserved at sꜥ.com and noted here for completeness.",
   "Egyptian writing does not record vowels; the vocalised form is a modern convention reconstructed from Coptic and Greek evidence."
  ]`;
block = block.slice(0, stepsStart) + newSteps + block.slice(tEnd);

s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(FILE, s);
console.log('sia provenance rewritten in original-scripts-extra.json');
