/**
 * One-off: extend hanuman + yamuna blog Mythology sections so the rendered
 * word count clears the 2400-word floor with margin (sweep dedupes trimmed
 * them below it). Content is standard, sourced material (Vālmīki Rāmāyaṇa /
 * Mahābhārata vanaparvan; Ṛg Veda 10.10; Bhāgavata tradition).
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'platform', 'blog', 'content');
const ANCHOR = '\n\n## Symbols & Iconography';

const ADDITIONS = {
  'hanuman.json': `

### The Immortal (The Chiranjivi)

Hanumān is a chiranjivi — one of the deathless, who live as long as the story is told. The tradition remembers the boon he asked of Rāma: not heaven, not release, but to remain in the world wherever Rāma's name is sung. So the epics can still meet him. In the Mahābhārata's forest years — an earlier age by the texts' own reckoning — Bhīma finds an old monkey lying across the path, tail stretched in the way, and cannot lift it though he is the strongest man alive. The monkey rises and names himself: the son of Vāyu, Bhīma's own elder brother by the wind. The scene is the tradition's quiet thesis — strength ages, devotion does not. Every generation that lifts, serves, or simply says the name, meets him again.`,

  'yamuna.json': `

### The Sister of Death (The Twin)

Her oldest hymn is a dialogue. In Ṛg Veda 10.10, Yamī — the river before she was a river — speaks with Yama, her twin, the first mortal, the man who found the path to the world of the fathers. The tradition never forgot the pairing: the sister who flows and the brother who waits. Because of him, her water carries a specific promise — bathing in Yamunā is held to free the bather from the fear of Yama, to keep his messengers at a distance. The pairing survives in the calendar: on Bhai Dooj, the festival of brothers and sisters, sisters mark their brothers' foreheads and invoke Yamunā's protection — the river who loved her brother standing between every brother and the dark. The twin of death became the river of life.`,
};

for (const [file, addition] of Object.entries(ADDITIONS)) {
  const fp = path.join(DIR, file);
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const occurrences = j.body.split(ANCHOR).length - 1;
  if (occurrences !== 1) throw new Error(`${file}: anchor found ${occurrences} times, expected 1`);
  j.body = j.body.replace(ANCHOR, `${addition}${ANCHOR}`);
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
  const words = j.body.split(/\s+/).filter(Boolean).length;
  console.log(`${file}: body now ${words} words (JSON)`);
}
