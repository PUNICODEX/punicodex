const fs = require('fs');
const path = require('path');

const IDS = [
  'inti',
  'viracocha',
  'pachamama',
  'mamaquilla',
  'mamaqucha',
  'illapa',
  'supay',
  'urcaguary',
  'ekkeko',
  'wamani',
];

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function readJson(id) {
  const file = path.join(__dirname, '..', 'platform', 'blog', 'content', `${id}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(id, data) {
  const file = path.join(__dirname, '..', 'platform', 'blog', 'content', `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const bodies = {
  inti: `# The name Inti and the world it opens

A name is a door. **Inti** opens onto an entire world: the domain of sun, empire, agriculture, an Incan tradition, and centuries of storytelling, worship, and scholarship. This post walks through that world room by room — the name and its roots, the original script, the sound of it, the myths, the symbols, the sites, the afterlife across cultures — and ends at the newest room of all: a Unicode domain that makes the whole structure addressable. *inti* gets you to the same building, but only the restored form tells you why it was built.

## At a Glance

- **Restored name:** Inti
- **ASCII form:** inti
- **Meaning:** "Sun"
- **Domain of influence:** Sun, Empire, Agriculture
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Inti** (*inti*) — Sun, Empire, Agriculture · Sun — belongs to the Incan tradition, where it is catalogued under the domain "Sun, Empire, Agriculture". The name means "Sun". As the solar deity at the head of the imperial pantheon, Inti was far more than a celestial body. He was the divine ancestor of the Inca royal line, the patron of conquest and agriculture, and the luminous center of a state religion that bound the Andes together from Cusco to the edges of Tahuantinsuyu.

PuniCodex restores the name as **Inti** and serves its temple at [its temple](https://punicodex.com/inti/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *inti* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Inti** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Sun". The term belongs to the Quechua language family and is cognate with related words for the sun across the central Andes. Its very brevity speaks to its importance: the most powerful body in the sky carries the shortest name, as if the language itself could not contain the light in more than two syllables.

The ASCII form *inti* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Inti** recovers the full diacritic detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **i** → **I** — Same
- **n** → **n** — Same
- **t** → **t** — Same
- **i** → **i** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names in the way that Greek or Egyptian names were written. The Inca kept records through knotted cords called quipu and through oral tradition transmitted by specialists. The form shown here is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for contemporary use, and no mark in it is decorative.

The form **Inti** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. Because the name was preserved orally, every modern spelling is a reconstruction. By choosing one conventional form and defending it in the address bar, the PuniCodex project makes the name stable, searchable, and addressable without pretending to have recovered a lost manuscript.

## Pronunciation

The reconstructed pronunciation of the name is **/inti/** — Restored scholarly form.

Phoneme by phoneme:

- **inti** — The canonical restored form Inti.

For the modern speaker, the closest approximation is: Say "inti" with the stress and length implied by the scholarly restoration "Inti". The vowels are clean and short, the consonants crisp, and the overall effect is the sound of sunlight striking stone.

The ASCII form "inti" is a DNS compromise; the restoration "Inti" preserves the name's scholarly dignity.

## Mythology

The stories of Inti place sun, empire, agriculture at the center of a living mythological world.

### Origins

Incan tradition holds that Inti was the son of Viracocha, the creator who rose from the waters of Lake Titicaca and fashioned the cosmos. Where Viracocha shaped the world in shadow, Inti kindled it into visibility. He was the generous sun whose warmth made maize grow, whose light revealed the contours of the empire, and whose favor legitimized the rule of the Inca kings. Myths recount that Inti sent his children — Manco Capac and Mama Ocllo — to found Cusco and to bring civilization to the peoples of the Andes. In this narrative the sun is not a distant lamp but an active ancestor, intervening in history to establish order.

### The Sun and the State

Inti's connection to empire was not metaphorical. The Inca ruler was considered the Sapa Inca, the son of the sun, and his authority derived directly from Inti. Imperial expansion was framed as a civilizing mission authorized by the solar deity. Conquered peoples were expected to acknowledge Inti, though they were often allowed to keep their local gods as long as they accepted the sun's supremacy. This theological federalism helped bind a vast multilingual empire under a single celestial patron.

### Worship and Memory

Devotees and later tradition-keepers preserved Inti in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. The most important ceremony was Inti Raymi, the Festival of the Sun held at the June solstice. It drew thousands to Cusco for processions, fasts, sacrifices, and the symbolic kindling of a new fire. After Spanish suppression the rite went underground, survived in folk memory, and was revived in the twentieth century as a major public celebration of Andean identity.

## Symbols & Iconography

The iconography associated with Inti concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Inti, carrying scholarly and cultural weight.
- **Domain** — Sun, Empire, Agriculture
- **Golden disk** — A radiant solar image, sometimes with a human face, symbolizing the sun's personhood and power.
- **Sun rays** — Straight or triangular rays represent the emanation of light, warmth, and imperial authority.
- **Maize and coca** — Agricultural offerings given to Inti in recognition of his gifts.

## Archaeology & Evidence

The most important material witness to Inti's cult is the Coricancha, the Golden Enclosure at the center of Cusco. This temple was sheathed in gold sheets and filled with representations of the sun, including a golden disk named Punchao that was said to contain the ashes of dead Inca rulers. After the conquest the Spanish built the Convent of Santo Domingo on the same foundations, and today the curved Inca wall of the Coricancha still rises beneath the colonial church.

No monument, inscription, or artifact in the current PuniCodex corpus is yet assigned to Inti with certainty beyond this well-known complex. That absence should be read honestly: for an Incan name of this type the material record is expected to be thin, and the primary evidence remains the textual testimony gathered in chronicles and oral tradition. Were such evidence to surface, it would take recognizable forms: votive or dedicatory inscriptions naming Inti, sanctuary or cult remains tied to the sun, and iconography matching its traditional attributes.

## Realm & Domain

**Inti** is sun, empire, agriculture. The name means "Sun" and belongs to the Incan tradition.

### Sacred Name

The restoration Inti returns the figure to scholarly recognition.

### Sun

Central domain: sun, empire, agriculture.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[amaterasu|Amaterasu]], [[apollon|Apóllōn]], [[arinniti|Arinna]], [[beli|Beli]], [[dazhbog|Dažbog]], and [[gnowee|Gnowee]], each linked through sun and light. The comparison is not arbitrary. Solar deities everywhere share a double nature: they are life-givers and, by their absence or intensity, agents of destruction. Inti's imperial role is unusual in its political explicitness, but the underlying logic — the sun as the visible source of order — is nearly universal.

## Cultural Legacy

Inti remains a touchstone for understanding Incan religion, art, and identity. His image appears on the flags of Peru and Argentina, in civic monuments across the Andes, and in the revived Inti Raymi celebrations that draw visitors from around the world. The name has also entered environmental discourse: Pachamama and Inti are often invoked together as symbols of an indigenous Andean cosmology that places reciprocal care between humans and the natural world at the center of ethics.

The legacy is not purely romantic. For scholars, Inti is a case study in how state religion can unify an empire; for Quechua and Aymara communities, the name is a living link to ancestors; for the wider public, it is one of the few Incan divine names that has crossed into global awareness. The Unicode restoration adds one more layer: it makes the name locatable on the internet exactly as scholars write it.

## The Scholarly Record

The account of Inti given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the literary and religious texts supply the narrative evidence. Key names in the modern study of Incan language and religion include Rodolfo Cerrón-Palomino, whose Quechua and Aymara scholarship underpins much contemporary understanding of these names.

## A Meditation

To contemplate Inti is to hold the idea of sun, empire, and agriculture in the mind and to ask what of it endures. The name means "Sun" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as sun, empire, agriculture · Sun.

Sit with the restored form — Inti — and the spelling itself becomes the practice: the capital I marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *inti* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Inti is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *inti* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *inti* to **Inti**, one character at a time:

- **i** → **I** — Same
- **n** → **n** — Same
- **t** → **t** — Same
- **i** → **i** — Same

## The Incan Pantheon

Inti is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script — the fastest way to see where this name sits among its kin.

## Frequently Asked Questions

**What does Inti mean?** The traditional gloss is "Sun."

**Which tradition does Inti belong to?** Inti is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Inti classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization rather than a recovery of lost marks.

**Can I use Inti in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts inti to Inti for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition. Every claim is traceable to a canonical source.

## Typing Inti

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *inti* into **Inti** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Urcaguary](/urcaguary/), [Wiraqucha](/viracocha/), [Pachamama](/pachamama/), and [Mama Quilla](/mamaquilla/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Inti is one of its standing proofs. Visit, share, cite, type it yourself: each use is a small rehearsal for a web where no name has to hide its marks to be found.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Inti**, the map does not lead through diacritics or special letters, because the source tradition wrote the name in oral and quipu tradition rather than in the Latin alphabet. The ASCII form *inti* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The original oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character — **i**, **n**, **t**, **i** — so visitors can see exactly what is being carried forward and what is not. What looks like "no change" is, in fact, a deliberate choice to keep the name stable, searchable, and addressable.

## Inti in Its Tradition

**Inti** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Sun, Empire, Agriculture — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin. When the address bar shows **Inti**, it marks the boundary between a generic search term and a named entry in a living catalog of myth.

That catalog is the point of the project. Every restored name is a vote for specificity: the web should know the difference between a figure and a keyword, between a tradition and a trend. **Inti** is one such vote.

## What You Will Find in the Temple

The temple page for **Inti** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly. Each tab is generated from the same canonical sources, so the domain, the blog, the scholars page, and the search index all agree.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Inti** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a manuscript can paste it into a browser. That practical reality changes the status of the restoration. Before Unicode domains, a scholar could write the name correctly in an article while the public web flattened it to *inti*. Now the public web can carry the correct form end to end. The punycode translation happens silently, so the infrastructure remains compatible while the visible name keeps its marks.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Inti**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Sun" anchors the name in its semantic field; without that anchor, the marks would float free of the figure they name. The restored form **Inti** and the ASCII form *inti* share the same Latin letters; the restoration here is a conventional capitalization rather than a recovery of lost diacritics or special characters. Those adjustments are not arbitrary styling. They follow the tier rule that places Inti in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial, which means the same standard applies to every entry in the lexicon. A visitor who disagrees with the classification can at least see exactly which evidence produced it, because every step is recorded in the Scholarly Edition.

## Related Names

- [Supay](/supay/)
- [Ekkeko](/ekkeko/)
- [Pachacámac](/pachacamac/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino on Quechua language and religion, the chronicles of Garcilaso de la Vega, and the archaeological record of the Coricancha in Cusco.`,

  viracocha: `# The many faces of Wiraqucha

No important name has only one face. **Wiraqucha** appears as a figure of myth, a scholarly reconstruction, a piece of material culture, a memory carried across languages, and — most recently — a Unicode domain. This post looks at each face in turn: the name and its roots, the Incan transcription original, the reconstructed pronunciation, the mythological record, the symbols and sanctuaries, the cross-cultural afterlife, and the engineering that lets the restored spelling resolve in a browser. Taken together, those faces explain why *viracocha* was never going to be enough — and why the restored form is worth a domain of its own.

## At a Glance

- **Restored name:** Wiraqucha
- **ASCII form:** viracocha
- **Meaning:** "Sea of fat"
- **Domain of influence:** Creator, Sky, Sea Foam
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Wiraqucha** (*viracocha*) — Creator, Sky, Sea Foam · Sea of fat — belongs to the Incan tradition, where it is catalogued under the domain "Creator, Sky, Sea Foam". The name means "Sea of fat". As the creator deity who shaped the world from the waters of Lake Titicaca, Wiraqucha occupies a position of unique importance in Andean cosmology. He is the maker of the sun, moon, stars, and human beings, the god who destroyed an earlier race of giants with a flood, and the divine wanderer who walked among mortals in the guise of a beggar before disappearing across the western ocean.

PuniCodex restores the name as **Wiraqucha** and serves its temple at [its temple](https://punicodex.com/viracocha/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *viracocha* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Wiraqucha** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Sea of fat". The form has also been interpreted as "foam of the sea" or "grease of the sea," evoking the whitecaps that break on the surface of Lake Titicaca. The spelling shift from Spanish *Viracocha* to Quechua-influenced *Wiraqucha* reflects a scholarly effort to remove colonial phonetic interference and restore the sound of the name as it would have been spoken in the Incan world.

The ASCII form *viracocha* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Wiraqucha** recovers the full detail of the scholarly transliteration directly in the address bar. The transformation is deliberate: the initial **v** becomes **W**, the **cocha** becomes **qucha**, each change restoring a Quechua phoneme that Spanish orthography had flattened.

The letter-by-letter transformation runs:

- **v** → **W** — W
- **i** → **i** — Same
- **r** → **r** — Same
- **a** → **a** — Same
- **c** → **q** — Q
- **o** → **u** — U: quechua qu cluster
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition, and the names we have passed first through Spanish colonial ears and pens. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Wiraqucha** is a scholarly transliteration rather than an attested ancient spelling. It encodes the reconstructed sound of the name for modern use. The shift from *Viracocha* to *Wiraqucha* is one of the most consequential orthographic decisions in the modern study of Andean religion, because it replaces a Spanish-colonial spelling with one that honors Quechua phonology.

## Pronunciation

The reconstructed pronunciation of the name is **/wi.ɾa.kut͡ʃa/** — Restored scholarly form.

Phoneme by phoneme:

- **wi** — Labial glide followed by a high front vowel.
- **ra** — Alveolar tap and open vowel.
- **qu** — Voiceless velar stop before the high back vowel.
- **cha** — Affricate and low vowel.

For the modern speaker, the closest approximation is: "wee-rah-KOO-chah," with a light tap on the second syllable and stress falling toward the end. The ASCII form "viracocha" preserves none of this texture; the restoration "Wiraqucha" preserves the Quechua consonants that Spanish spelling obscured.

## Mythology

The stories of Wiraqucha place creator, sky, and sea foam at the center of a living mythological world.

### Origins

Incan tradition holds that Wiraqucha rose from the waters of Lake Titicaca at a place called Tiahuanaco, now identified with the archaeological site of Tiwanaku in Bolivia. In the darkness before the sun existed, he created the heavens, the stars, the moon, and finally the sun itself. Some accounts say he made a first race of giants, found them disobedient or foolish, and turned them to stone before sending a great flood. From the survivors or from new clay he fashioned the present human beings, assigning each group its language, dress, and territory.

### The Wanderer

After creating the world, Wiraqucha did not retire to the sky. He traveled the Andes in the disguise of an old beggar, teaching, testing, and sometimes weeping at human cruelty. He performed miracles, established cults, and left sacred objects at important shrines. Eventually he reached the Pacific coast at Manta in what is now Ecuador, walked across the ocean toward the setting sun, and promised to return. When the Spanish conquistador Pizarro arrived, some Andeans are said to have wondered whether the pale, bearded strangers were the returning creator — a misunderstanding with devastating consequences.

### Worship and Memory

Devotees and later tradition-keepers preserved Wiraqucha in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Though Inti received the imperial cult in Cusco, Wiraqucha was honored as the greater, older power behind the sun. Temples and oracles across the Andes claimed his authority, and his iconography often shows him as a staff-bearing traveler or as a figure emerging from water.

## Symbols & Iconography

The iconography associated with Wiraqucha concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Wiraqucha, carrying scholarly and cultural weight.
- **Domain** — Creator, Sky, Sea Foam
- **Staff** — The traveler's staff, symbolizing his wandering teaching ministry.
- **Sea foam** — The white, frothy substance from which he was born and which his name evokes.
- **Tears** — In some accounts Wiraqucha weeps for human suffering.
- **Sun disk** — As the maker of Inti, he is sometimes shown with a radiant disk.

## Archaeology & Evidence

The most impressive material context for Wiraqucha's mythology is the site of Tiwanaku, near Lake Titicaca. Its monumental gateways, carved monoliths, and terraced platforms predate the Inca and may have shaped the myths that the Inca later attached to the creator. The famous Gateway of the Sun, with its weeping central figure, has often been interpreted as a representation of the creator deity, though the identification remains debated.

No monument in the current PuniCodex corpus is yet assigned to Wiraqucha with certainty beyond this complex. That absence should be read honestly: for an Incan name of this type the material record is expected to be fragmentary, and the primary evidence remains the textual testimony gathered in chronicles and oral tradition. Were such evidence to surface, it would take recognizable forms: votive or dedicatory inscriptions naming Wiraqucha, sanctuary remains tied to creation and water, and iconography matching his traditional attributes.

## Realm & Domain

**Wiraqucha** is creator, sky, sea foam. The name means "Sea of fat" and belongs to the Incan tradition.

### Sacred Name

The restoration Wiraqucha returns the figure to scholarly recognition.

### Creator

Central domain: creator, sky, sea foam.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include figures of high creation, flood, and wandering teaching, though exact matches are difficult because Wiraqucha combines so many roles. The comparison with Mesoamerican creator deities and with Old World flood narratives is suggestive but must be made cautiously. What is clear is that the name has traveled far beyond the Andes: *Viracocha* appears in travel writing, new-age spirituality, and even place names across South America.

## Cultural Legacy

Wiraqucha remains a touchstone for understanding Incan religion, art, and identity. The ruins of Tiwanaku attract pilgrims, archaeologists, and tourists, and the name continues to function as a symbol of indigenous Andean civilization. In some modern Andean spiritual movements, Wiraqucha is invoked as a creator who predates and transcends colonial religion. The restored spelling **Wiraqucha** has become a small banner of that revival: a way of writing the name that refuses the colonial form.

## The Scholarly Record

The account of Wiraqucha given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the chronicles of Sarmiento de Gamboa, Juan de Betanzos, and Garcilaso de la Vega supply the narrative evidence. The archaeological record of Tiwanaku provides a material backdrop, even if direct identification with the myth remains uncertain.

## A Meditation

To contemplate Wiraqucha is to hold the idea of creation, sky, and sea foam in the mind and to ask what it means for the maker of the world to weep. The name means "Sea of fat" — an earthy, almost humble image for the source of all things. The tradition remembers the name as creator, sky, sea foam · Sea of fat.

Sit with the restored form — Wiraqucha — and the spelling itself becomes the practice: each consonant is a small act of attention, a refusal to let the plain ASCII form *viracocha* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Wiraqucha is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *viracocha* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *viracocha* to **Wiraqucha**, one character at a time:

- **v** → **W** — W
- **i** → **i** — Same
- **r** → **r** — Same
- **a** → **a** — Same
- **c** → **q** — Q
- **o** → **u** — U: quechua qu cluster
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same

## The Incan Pantheon

Wiraqucha is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Wiraqucha mean?** The traditional gloss is "Sea of fat."

**Which tradition does Wiraqucha belong to?** Wiraqucha is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Wiraqucha classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the change is a recovery of Quechua orthography, not the addition of diacritics.

**Can I use Wiraqucha in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts viracocha to Wiraqucha for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Wiraqucha

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *viracocha* into **Wiraqucha** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Pachamama](/pachamama/), and [Urcaguary](/urcaguary/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Wiraqucha is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Wiraqucha**, the map leads through orthographic decisions rather than diacritics. The ASCII form *viracocha* preserves the Spanish-colonial pronunciation, while **Wiraqucha** restores the Quechua consonants and vowels. The **V → W** change is not a stylistic flourish; it reflects the absence of a /v/ phoneme in Quechua. The **co → qu** change restores the uvular-velar cluster and the original /u/ vowel. These are not decorations. They are the residue of scholarly decisions about how the name sounded before it passed through Spanish ears.

## Wiraqucha in Its Tradition

**Wiraqucha** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Creator, Sky, Sea Foam — places it at the top of the pantheon. When the address bar shows **Wiraqucha**, it marks the boundary between a generic search term and a named entry in a living catalog of myth.

## What You Will Find in the Temple

The temple page for **Wiraqucha** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Wiraqucha** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *viracocha*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Wiraqucha**, the chain begins with the attested form in colonial chronicles, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Sea of fat" anchors the name in its semantic field. The restored form **Wiraqucha** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Pachamama](/pachamama/)
- [Mamaqucha](/mamaqucha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Sarmiento de Gamboa and Garcilaso de la Vega, and the archaeological record of Tiwanaku.`,

  pachamama: `# How Pachamama got its accent back

The ASCII form *pachamama* is missing something. **Pachamama** restores the marks the source language used to distinguish this name from a thousand others — and those marks change how the name is read, pronounced, and understood. This post explains, with the full scholarly record behind it, what each restored mark preserves: the Incan transcription evidence, the reconstructed sound, the myths the name carries, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the marks in Pachamama will look less like ornaments and more like what they are — recovered evidence, pinned back in its proper place.

## At a Glance

- **Restored name:** Pachamama
- **ASCII form:** pachamama
- **Meaning:** "Mother Earth"
- **Domain of influence:** Earth, Harvest, Mother
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Pachamama** (*pachamama*) — Earth, Harvest, Mother · Mother Earth — belongs to the Incan tradition, where it is catalogued under the domain "Earth, Harvest, Mother". The name means "Mother Earth". She is the fertile soil beneath every field, the provider of potatoes and maize, the mother who receives offerings of coca and chicha, and the cosmic force that makes reciprocity between humans and the land not merely ethical but necessary. Of all the Incan divine names that have entered global vocabulary, Pachamama is perhaps the most widely recognized.

PuniCodex restores the name as **Pachamama** and serves its temple at [its temple](https://punicodex.com/pachamama/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *pachamama* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Pachamama** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Mother Earth". It is composed of two Quechua words: *pacha*, which can mean earth, world, universe, or time, and *mama*, mother. The compound is therefore richer than its English translation suggests: Pachamama is not only the terrestrial mother but the matrix of space and time within which life unfolds.

The ASCII form *pachamama* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Pachamama** recovers the full diacritic detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **p** → **P** — Same
- **a** → **a** — Same
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Pachamama** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. Its very transparency — every letter corresponds cleanly to a Quechua phoneme — is part of its scholarly virtue. The name does not need exotic characters to be restored; it needs to be kept free from the drift of casual romanization.

## Pronunciation

The reconstructed pronunciation of the name is **/pat͡ʃaˈmama/** — Restored scholarly form.

Phoneme by phoneme:

- **pa** — Voiceless bilabial stop and open vowel.
- **cha** — Affricate and low vowel.
- **ma** — Bilabial nasal and low vowel, repeated.

For the modern speaker, the closest approximation is: "pah-chah-MAH-mah," with the main stress on the third syllable. The double *mama* gives the name its maternal resonance. The ASCII form "pachamama" captures the same letters; the restoration "Pachamama" preserves the capitalization that marks it as a proper name.

## Mythology

The stories of Pachamama place earth, harvest, and mother at the center of a living mythological world.

### Origins

Incan tradition does not tell a single creation story for Pachamama in the way that Greek myth narrates the birth of Gaia. Instead, the earth mother is simply present: she is the ground, the source, the one who feeds and finally receives all beings. Myths describe her as a power closely associated with agriculture, fertility, and the household hearth. She is the one who makes crops grow, who must be thanked before eating, and who can withhold her gifts if neglected.

### Worship and Memory

Devotees and later tradition-keepers preserved Pachamama in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. The most important domestic rite is the daily offering of a few drops of drink or morsels of food to the earth before consuming them. Larger offerings, called *despachos*, are prepared by ritual specialists and buried or burned as gifts to Pachamama and the mountain spirits. August, the coldest and hungriest month in the southern Andes, is widely observed as the Month of Pachamama, when offerings are especially elaborate.

### The Reciprocal Cosmos

The theology implicit in Pachamama's cult is one of reciprocity, often called *ayni* in Quechua. Humans receive food, water, and shelter from the earth; in return they must give thanks, offerings, and care. This is not a transactional relationship in the modern sense but a way of maintaining the balance of the cosmos. Pollution, greed, and neglect are not merely moral failures; they are disturbances in the relationship between people and the living earth.

## Symbols & Iconography

The iconography associated with Pachamama concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Pachamama, carrying scholarly and cultural weight.
- **Domain** — Earth, Harvest, Mother
- **Planted fields** — Maize, potatoes, quinoa, and other Andean crops.
- **Coca leaves** — The standard offering given to the earth.
- **Chicha** — Corn beer poured as libation.
- **Open hands** — The gesture of giving and receiving in reciprocity.

## Archaeology & Evidence

The cult of Pachamama is less tied to a single monumental temple than to the entire agricultural landscape. Terraced fields, irrigation canals, buried offerings, and household altars all constitute evidence of her veneration. Archaeologists recover miniature vessels, food remains, and coca leaves from offering contexts that can be interpreted as gifts to the earth mother.

No monument in the current PuniCodex corpus is yet assigned to Pachamama with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be distributed across the landscape rather than concentrated in a single building. Were such evidence to surface, it would take recognizable forms: dedicatory inscriptions, offering assemblages, and iconography matching her traditional attributes.

## Realm & Domain

**Pachamama** is earth, harvest, mother. The name means "Mother Earth" and belongs to the Incan tradition.

### Sacred Name

The restoration Pachamama returns the figure to scholarly recognition.

### Earth

Central domain: earth, harvest, mother.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[gaia|Gaia]], [[tellus|Tellus]], [[zemyna|Žemyna]], and [[nerthus|Nerthus]], each linked through earth and fertility. The comparison is instructive. Earth mothers appear in nearly every agrarian tradition, yet each is shaped by the particular landscape that produced her. Pachamama is inseparable from the high Andes: the thin air, the terraced slopes, the potatoes and quinoa, the cold August nights when offerings are burned.

## Cultural Legacy

Pachamama remains a touchstone for understanding Incan religion, art, and identity. The name has become an international symbol of ecological consciousness and indigenous spirituality, appearing in environmental movements, yoga studios, political speeches, and constitutional texts. Bolivia and Ecuador have granted legal rights to Pachamama in their constitutions, recognizing the earth as a subject with standing in environmental law.

The global popularity of the name is not without controversy. Some Andean scholars and community leaders warn that Pachamama is being emptied of specific cultural content and turned into a generic label for nature worship. The Unicode restoration participates in a different project: it keeps the name attached to its Quechua form and its scholarly record, so that the global recognition does not come at the cost of cultural precision.

## The Scholarly Record

The account of Pachamama given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; ethnographic studies supply the evidence of contemporary practice. Key modern authorities include Rodolfo Cerrón-Palomino on Quechua language and Catherine Allen on Andean ritual and ecology.

## A Meditation

To contemplate Pachamama is to hold the idea of earth, harvest, and mother in the mind and to ask what it means to be fed by a world that is also alive. The name means "Mother Earth" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as earth, harvest, mother · Mother Earth.

Sit with the restored form — Pachamama — and the spelling itself becomes the practice: the capital P marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *pachamama* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Pachamama is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *pachamama* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *pachamama* to **Pachamama**, one character at a time:

- **p** → **P** — Same
- **a** → **a** — Same
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same

## The Incan Pantheon

Pachamama is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Pachamama mean?** The traditional gloss is "Mother Earth."

**Which tradition does Pachamama belong to?** Pachamama is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Pachamama classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization rather than a recovery of lost marks.

**Can I use Pachamama in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts pachamama to Pachamama for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, ethnographies, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Pachamama

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *pachamama* into **Pachamama** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Wiraqucha](/viracocha/), and [Mama Quilla](/mamaquilla/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Pachamama is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Pachamama**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *pachamama* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Pachamama in Its Tradition

**Pachamama** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Earth, Harvest, Mother — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Pachamama** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Pachamama** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *pachamama*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Pachamama**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Mother Earth" anchors the name in its semantic field. The restored form **Pachamama** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Mamaqucha](/mamaqucha/)
- [Wiraqucha](/viracocha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, Catherine Allen's ethnography of Andean ritual, and the ethnographic record of contemporary Quechua and Aymara communities.`,

  mamaquilla: `# The hidden history behind Mama Quilla

Behind the modern ASCII form *mamaquilla* hides a much longer story. **Mama Quilla** reaches back through manuscripts, inscriptions, and oral tradition long before it ever touched a keyboard, and every mark in the restored spelling is a receipt from that journey. In what follows we trace the name from its Incan transcription attestations through its mythology, its cult, its symbols, and its afterlife in other cultures — and we show how the PuniCodex project turned that philological record into a Unicode domain that resolves today. The history was never lost. It was only waiting for the infrastructure to catch up.

## At a Glance

- **Restored name:** Mama Quilla
- **ASCII form:** mamaquilla
- **Meaning:** "Mother moon"
- **Domain of influence:** Moon, Marriage
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Mama Quilla** (*mamaquilla*) — Moon, Marriage · Mother moon — belongs to the Incan tradition, where it is catalogued under the domain "Moon, Marriage". The name means "Mother moon". She is the silver counterpart to the golden sun, the wife and sister of Inti, the mother of the first Inca ancestors, and the deity who regulated the calendar, protected women, and governed the rituals of marriage. In a pantheon dominated by solar imperial power, Mama Quilla preserves the lunar, domestic, and calendrical dimensions of the sacred.

PuniCodex restores the name as **Mama Quilla** and serves its temple at [its temple](https://punicodex.com/mamaquilla/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *mamaquilla* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Mama Quilla** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Mother moon". It is composed of *mama*, mother, and *quilla* or *killa*, moon. Some scholars prefer the spelling *Mama Killa* to reflect Quechua phonology more closely, but *Mama Quilla* remains widely used in English and Spanish scholarly literature. The PuniCodex form preserves the two-word structure that the ASCII form collapses into one.

The ASCII form *mamaquilla* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Mama Quilla** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **m** → **M** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **q** → **Q** — Same, capitalized
- **u** → **u** — Same
- **i** → **i** — Same
- **l** → **l** — Same
- **l** → **l** — Same
- **a** → **a** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Mama Quilla** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The two-word spelling reflects the compound structure of the name and separates the maternal title from the lunar noun.

## Pronunciation

The reconstructed pronunciation of the name is **/ˈmama ˈkiʎa/** — Restored scholarly form.

Phoneme by phoneme:

- **ma** — Bilabial nasal and low vowel, repeated.
- **qui** — Voiceless velar stop before front vowel.
- **lla** — Palatal lateral approximant and low vowel.

For the modern speaker, the closest approximation is: "MAH-mah KEE-yah," with stress on both words. The palatal *ll* sound of Andean Spanish and Quechua gives the name its distinctive shimmer. The ASCII form "mamaquilla" flattens this into an English-friendly sequence; the restoration "Mama Quilla" at least preserves the original spacing and capitalization.

## Mythology

The stories of Mama Quilla place moon and marriage at the center of a living mythological world.

### Origins

Incan tradition holds that Mama Quilla was the daughter of Wiraqucha and the wife and sister of Inti. From their union sprang Manco Capac and Mama Ocllo, the siblings sent to earth to found the Inca dynasty. This genealogy makes Mama Quilla the divine grandmother of the imperial line and ties the moon to the legitimacy of Inca rule. Her silver light was understood as the reflection of her brother-husband's golden radiance.

### The Moon and Marriage

Mama Quilla presided over marriage, fertility, and the lives of women. Young women preparing for marriage made offerings to her, and married women sought her protection during childbirth. The lunar cycles governed not only the calendar but also the rhythms of female life. Eclipses of the moon were interpreted as attacks on Mama Quilla; people shouted, beat drums, and brandished weapons to drive away the creature — sometimes imagined as a serpent or puma — that threatened to devour her.

### Worship and Memory

Devotees and later tradition-keepers preserved Mama Quilla in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Chroniclers describe a Temple of the Moon near Cusco, where silver images and offerings were dedicated to her. Though less wealthy than the Coricancha, this temple was central to the religious life of women and to the regulation of the calendar.

## Symbols & Iconography

The iconography associated with Mama Quilla concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Mama Quilla, carrying scholarly and cultural weight.
- **Domain** — Moon, Marriage
- **Silver disk** — The moon rendered as a silver mirror or plate.
- **Crescent** — The waxing and waning phases tied to female cycles.
- **Marriage fringe** — Textile ornaments associated with bridal rites.
- **Lunar animals** — The puma or serpent that threatens the eclipsed moon.

## Archaeology & Evidence

The Temple of the Moon near Cusco is the most important material context for Mama Quilla's cult, though it has not survived as completely as the Coricancha. Chroniclers describe it as a place of silver, the metal associated with the moon, where women made offerings and where the calendar was adjusted against lunar observations.

No monument in the current PuniCodex corpus is yet assigned to Mama Quilla with certainty beyond this complex. That absence should be read honestly: for an Incan name of this type the material record is expected to be fragmentary, and the primary evidence remains the textual testimony gathered in chronicles and oral tradition.

## Realm & Domain

**Mama Quilla** is moon, marriage. The name means "Mother moon" and belongs to the Incan tradition.

### Sacred Name

The restoration Mama Quilla returns the figure to scholarly recognition.

### Moon

Central domain: moon, marriage.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[selene|Selene]], [[chandra|Chandra]], [[tsukuyomi|Tsukuyomi]], and [[mani|Máni]], each linked through moon and light. The comparison highlights both universality and difference. Lunar deities everywhere regulate time and fertility, but Mama Quilla's role as wife of the sun and ancestress of an imperial dynasty gives her a political dimension rarely matched elsewhere.

## Cultural Legacy

Mama Quilla remains a touchstone for understanding Incan religion, art, and identity. The name survives in Andean folk calendars, in feminist and goddess-spirituality circles, and in scholarly reconstructions of Inca cosmology. The August festival cycle and the continuing observance of lunar phases in rural communities keep the moon's sacred character alive long after the imperial cult has passed.

## The Scholarly Record

The account of Mama Quilla given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the chronicles of Garcilaso, Cobo, and others supply the narrative evidence.

## A Meditation

To contemplate Mama Quilla is to hold the idea of moon, marriage, and motherhood in the mind and to ask what it means for a light to be reflected rather than original. The name means "Mother moon" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as moon, marriage · Mother moon.

Sit with the restored form — Mama Quilla — and the spacing itself becomes the practice: two words, two domains, two kinds of care. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Mama Quilla is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *mamaquilla* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *mamaquilla* to **Mama Quilla**, one character at a time:

- **m** → **M** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **q** → **Q** — Same, capitalized
- **u** → **u** — Same
- **i** → **i** — Same
- **l** → **l** — Same
- **l** → **l** — Same
- **a** → **a** — Same

## The Incan Pantheon

Mama Quilla is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Mama Quilla mean?** The traditional gloss is "Mother moon."

**Which tradition does Mama Quilla belong to?** Mama Quilla is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Mama Quilla classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration restores word spacing and capitalization.

**Can I use Mama Quilla in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts mamaquilla to Mama Quilla for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Mama Quilla

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *mamaquilla* into **Mama Quilla** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Pachamama](/pachamama/), and [Mamaqucha](/mamaqucha/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Mama Quilla is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Mama Quilla**, the map leads through word spacing and capitalization rather than diacritics. The ASCII form *mamaquilla* collapses two words into one; the restoration separates them, reflecting the compound structure of the divine name. This is not a trivial change. Many Andean divine names are compounds of a title plus a noun — *Mama Quilla*, *Mamaqucha*, *Pachamama* — and the spacing carries semantic information. The restoration asks the web to honor that structure.

## Mama Quilla in Its Tradition

**Mama Quilla** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Moon, Marriage — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Mama Quilla** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Mama Quilla** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *mamaquilla*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Mama Quilla**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Mother moon" anchors the name in its semantic field. The restored form **Mama Quilla** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Pachamama](/pachamama/)
- [Mamaqucha](/mamaqucha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Garcilaso de la Vega and Bernabé Cobo, and the ethnographic record of lunar rituals in the Andes.`,

  mamaqucha: `# The many faces of Mamaqucha

No important name has only one face. **Mamaqucha** appears as a figure of myth, a scholarly reconstruction, a piece of material culture, a memory carried across languages, and — most recently — a Unicode domain. This post looks at each face in turn: the name and its roots, the Incan transcription original, the reconstructed pronunciation, the mythological record, the symbols and sanctuaries, the cross-cultural afterlife, and the engineering that lets the restored spelling resolve in a browser. Taken together, those faces explain why *mamaqucha* was never going to be enough — and why the restored form is worth a domain of its own.

## At a Glance

- **Restored name:** Mamaqucha
- **ASCII form:** mamaqucha
- **Meaning:** "Mother sea"
- **Domain of influence:** Sea, Fishermen
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Mamaqucha** (*mamaqucha*) — Sea, Fishermen · Mother sea — belongs to the Incan tradition, where it is catalogued under the domain "Sea, Fishermen". The name means "Mother sea". She is the mistress of lakes and ocean, the provider of fish, the protector of sailors, and the watery mother who complements the earth mother Pachamama. While the high Andes are a world of mountains and altitude, Mamaqucha reminds us that the Incan cosmos also reached down to the Pacific and inward to the great lakes of the altiplano.

PuniCodex restores the name as **Mamaqucha** and serves its temple at [its temple](https://punicodex.com/mamaqucha/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *mamaqucha* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Mamaqucha** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Mother sea". It is composed of *mama*, mother, and *qucha*, lake or sea. The same word lies behind the name of Lake Titicaca's sacred geography and behind Spanish colonial renderings such as *Mamacocha*. The PuniCodex form keeps the two morphemes together, reflecting the compound structure of the name.

The ASCII form *mamaqucha* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Mamaqucha** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **m** → **M** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **q** → **q** — Same
- **u** → **u** — Same
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Mamaqucha** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The compound structure — *mama* plus *qucha* — mirrors other Andean divine names and anchors the figure in the vocabulary of water and maternity.

## Pronunciation

The reconstructed pronunciation of the name is **/ˈmama ˈkut͡ʃa/** — Restored scholarly form.

Phoneme by phoneme:

- **ma** — Bilabial nasal and low vowel, repeated.
- **qu** — Voiceless velar stop before high back vowel.
- **cha** — Affricate and low vowel.

For the modern speaker, the closest approximation is: "MAH-mah KOO-chah," with stress on both words. The Quechua *qu* cluster and the affricate *ch* give the name its Andean character. The ASCII form "mamaqucha" preserves the letters but not the phonetic structure; the restoration "Mamaqucha" at least restores the scholarly capitalization.

## Mythology

The stories of Mamaqucha place sea and fishermen at the center of a living mythological world.

### Origins

Incan tradition associates Mamaqucha with the waters from which Wiraqucha emerged and with the lakes and ocean that surround and sustain the world. As a mother of waters, she is the source of fish, the regulator of tides, and the power that must be placated before voyages. Her domain extends from the coastal waters of Peru to the highland lakes where fishermen have plied reed boats for millennia.

### The Sea and the Fishermen

Mamaqucha's cult was especially important among coastal and lakeside communities. Fishermen made offerings before setting out, gave back a portion of their catch, and asked her to calm storms and fill nets. The sea was not a blank wilderness but a maternal personage whose moods determined prosperity or disaster. This personification of water as mother shaped Andean attitudes toward the Pacific and toward Lake Titicaca long after the empire fell.

### Worship and Memory

Devotees and later tradition-keepers preserved Mamaqucha in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Offerings of shells, coca, and chicha were made at shrines near bodies of water, and the name appears in colonial chronicles as one of the maternal powers of the Andean cosmos.

## Symbols & Iconography

The iconography associated with Mamaqucha concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Mamaqucha, carrying scholarly and cultural weight.
- **Domain** — Sea, Fishermen
- **Waves** — The movement of lakes and ocean.
- **Fish and shellfish** — The gifts of the water mother.
- **Reed boat** — The traditional craft of Andean fishermen.
- **Coca and chicha** — Standard offerings given before fishing.

## Archaeology & Evidence

The material evidence for Mamaqucha's cult is distributed along the coast and around the highland lakes. Fishing gear, offering deposits, and coastal shrines all testify to a long relationship between Andean peoples and the personified sea. Lake Titicaca, with its sacred islands and reed boats, is the most important surviving landscape associated with water deities.

No monument in the current PuniCodex corpus is yet assigned to Mamaqucha with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be distributed across the landscape rather than concentrated in a single building.

## Realm & Domain

**Mamaqucha** is sea, fishermen. The name means "Mother sea" and belongs to the Incan tradition.

### Sacred Name

The restoration Mamaqucha returns the figure to scholarly recognition.

### Sea

Central domain: sea, fishermen.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[nethuns|Neptunus]], [[ymir|Ymir]], and other water deities. The comparison must be made carefully, because Mamaqucha is specifically a mother of waters rather than a sovereign of the ocean depths. Her maternal character links her more closely to Pachamama than to the Roman Neptune, yet the shared recognition of water as a sacred power is real.

## Cultural Legacy

Mamaqucha remains a touchstone for understanding Incan religion, art, and identity. The name survives in place names, in coastal folklore, and in the continuing reverence shown to lakes and the sea in Andean communities. Environmental movements have also drawn on the figure of the water mother to argue for the protection of rivers, lakes, and oceans from pollution and extraction.

## The Scholarly Record

The account of Mamaqucha given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; colonial chronicles and ethnographic studies supply the evidence of practice.

## A Meditation

To contemplate Mamaqucha is to hold the idea of sea, fishermen, and motherhood in the mind and to ask what it means for the ocean to be addressed as mother. The name means "Mother sea" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as sea, fishermen · Mother sea.

Sit with the restored form — Mamaqucha — and the spelling itself becomes the practice: the capital M marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *mamaqucha* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Mamaqucha is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *mamaqucha* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *mamaqucha* to **Mamaqucha**, one character at a time:

- **m** → **M** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **q** → **q** — Same
- **u** → **u** — Same
- **c** → **c** — Same
- **h** → **h** — Same
- **a** → **a** — Same

## The Incan Pantheon

Mamaqucha is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Mamaqucha mean?** The traditional gloss is "Mother sea."

**Which tradition does Mamaqucha belong to?** Mamaqucha is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Mamaqucha classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Mamaqucha in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts mamaqucha to Mamaqucha for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Mamaqucha

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *mamaqucha* into **Mamaqucha** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Mama Quilla](/mamaquilla/), [Wiraqucha](/viracocha/), and [Pachamama](/pachamama/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Mamaqucha is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Mamaqucha**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *mamaqucha* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Mamaqucha in Its Tradition

**Mamaqucha** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Sea, Fishermen — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Mamaqucha** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Mamaqucha** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *mamaqucha*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Mamaqucha**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Mother sea" anchors the name in its semantic field. The restored form **Mamaqucha** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Mama Quilla](/mamaquilla/)
- [Pachamama](/pachamama/)
- [Wiraqucha](/viracocha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Bernabé Cobo, and ethnographic studies of coastal and lakeside Andean communities.`,

  illapa: `# How Illapa got its accent back

The ASCII form *illapa* is missing something. **Illapa** restores the marks the source language used to distinguish this name from a thousand others — and those marks change how the name is read, pronounced, and understood. This post explains, with the full scholarly record behind it, what each restored mark preserves: the Incan transcription evidence, the reconstructed sound, the myths the name carries, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the marks in Illapa will look less like ornaments and more like what they are — recovered evidence, pinned back in its proper place.

## At a Glance

- **Restored name:** Illapa
- **ASCII form:** illapa
- **Meaning:** "Thunder"
- **Domain of influence:** Thunder, Lightning, War
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Illapa** (*illapa*) — Thunder, Lightning, War · Thunder — belongs to the Incan tradition, where it is catalogued under the domain "Thunder, Lightning, War". The name means "Thunder". He is the storm god of the Andes, the deity whose golden sling cracks the sky and whose lightning bolts are the spears of heaven. In a region where agriculture depends on the timely arrival of rains, Illapa was not merely a warrior but a bringer of life, a fearsome power whose favor meant survival.

PuniCodex restores the name as **Illapa** and serves its temple at [its temple](https://punicodex.com/illapa/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *illapa* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Illapa** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "Thunder". It is sometimes elaborated as *Chuqui Illapa*, "Golden Spear" or "Golden Sling," a title that captures the weapon with which the god strikes the sky. The name belongs to the Quechua storm vocabulary and is related to words for thunder, lightning, and meteorological violence across the central Andes.

The ASCII form *illapa* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Illapa** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **i** → **I** — Same, capitalized
- **l** → **l** — Same
- **l** → **l** — Same
- **a** → **a** — Same
- **p** → **p** — Same
- **a** → **a** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Illapa** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The doubled *ll* represents the palatal lateral sound that is one of the most distinctive phonemes of Quechua and southern Andean Spanish.

## Pronunciation

The reconstructed pronunciation of the name is **/iˈʎapa/** — Restored scholarly form.

Phoneme by phoneme:

- **i** — High front vowel.
- **lla** — Palatal lateral approximant and low vowel.
- **pa** — Voiceless bilabial stop and low vowel.

For the modern speaker, the closest approximation is: "ee-YAH-pah," with the distinctive palatal *ll* giving the name its Andean sound. The ASCII form "illapa" preserves the letters but not the phonetic structure; the restoration "Illapa" at least restores the scholarly capitalization.

## Mythology

The stories of Illapa place thunder, lightning, and war at the center of a living mythological world.

### Origins

Incan tradition holds that Illapa was a son of Inti, the sun, or a separate celestial power in his own right. He lived in the upper world, dressed in shining garments, and carried a sling and a mace of gold. When he drew water from the Milky Way and hurled it at the earth, the sound of his sling cracking the sky was thunder, and the flash of his weapon was lightning. The rain that followed was the water he had drawn, released by the force of the strike.

### The Storm Bringer

Illapa's mythology is inseparable from Andean agriculture. The coastal deserts and highland plains depend on rain, and the arrival of the rainy season was interpreted as the god's movement across the sky. Droughts were signs of his anger or absence; storms were signs of his presence. Fishermen and farmers alike looked to the sky for his signals, and ritual specialists sought to influence his mood through offerings and prayers.

### Worship and Memory

Devotees and later tradition-keepers preserved Illapa in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Chroniclers describe a temple to Illapa in Cusco, where the god was honored with sacrifices, especially in times of drought. Human sacrifice, though rare and reserved for extreme emergencies, was reportedly practiced to secure rain.

## Symbols & Iconography

The iconography associated with Illapa concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Illapa, carrying scholarly and cultural weight.
- **Domain** — Thunder, Lightning, War
- **Golden sling** — The weapon whose crack produces thunder.
- **Lightning bolt** — The spear or flash of the storm god.
- **War mace** — The weapon that links him to the domain of war.
- **Rain and dark clouds** — The meteorological signs of his presence.

## Archaeology & Evidence

The material evidence for Illapa's cult is scattered across the Andes in the form of offerings, shrines on high peaks, and depictions of warriors or sky beings. High-altitude ritual sites, where lightning-struck rocks and sacrificed animals have been found, may reflect the cult of the storm god. The chronicles describe a temple in Cusco, though its exact location and remains are not well documented.

No monument in the current PuniCodex corpus is yet assigned to Illapa with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be distributed across the landscape and the sky.

## Realm & Domain

**Illapa** is thunder, lightning, war. The name means "Thunder" and belongs to the Incan tradition.

### Sacred Name

The restoration Illapa returns the figure to scholarly recognition.

### Thunder

Central domain: thunder, lightning, war.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[thor|Thórr]], [[zeus|Zeus]], [[perun|Perun]], and [[jupiter|Iuppiter]], each linked through thunder and sky. The comparison is striking: storm gods everywhere carry weapons, ride the sky, and punish oath-breakers. Illapa's golden sling is the Andean equivalent of Thor's hammer or Zeus's thunderbolt.

## Cultural Legacy

Illapa remains a touchstone for understanding Incan religion, art, and identity. The name survives in Andean folklore, where thunder and lightning are still personified, and in scholarly discussions of Andean meteorological cults. The god's role as bringer of rain gives him continuing relevance in regions where climate change has made water scarcity an urgent concern.

## The Scholarly Record

The account of Illapa given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; colonial chronicles supply the narrative evidence.

## A Meditation

To contemplate Illapa is to hold the idea of thunder, lightning, and war in the mind and to ask what it means for the sky itself to be armed. The name means "Thunder" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as thunder, lightning, war · Thunder.

Sit with the restored form — Illapa — and the spelling itself becomes the practice: the capital I marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *illapa* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Illapa is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *illapa* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *illapa* to **Illapa**, one character at a time:

- **i** → **I** — Same, capitalized
- **l** → **l** — Same
- **l** → **l** — Same
- **a** → **a** — Same
- **p** → **p** — Same
- **a** → **a** — Same

## The Incan Pantheon

Illapa is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Illapa mean?** The traditional gloss is "Thunder."

**Which tradition does Illapa belong to?** Illapa is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Illapa classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Illapa in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts illapa to Illapa for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Illapa

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *illapa* into **Illapa** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Wiraqucha](/viracocha/), and [Urcaguary](/urcaguary/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Illapa is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Illapa**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *illapa* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Illapa in Its Tradition

**Illapa** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Thunder, Lightning, War — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Illapa** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Illapa** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *illapa*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Illapa**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "Thunder" anchors the name in its semantic field. The restored form **Illapa** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Wiraqucha](/viracocha/)
- [Supay](/supay/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Bernabé Cobo and Juan de Betanzos, and the ethnographic record of Andean storm rituals.`,

  supay: `# The hidden history behind Supay

Behind the modern ASCII form *supay* hides a much longer story. **Supay** reaches back through manuscripts, inscriptions, and oral tradition long before it ever touched a keyboard, and every mark in the restored spelling is a receipt from that journey. In what follows we trace the name from its Incan transcription attestations through its mythology, its cult, its symbols, and its afterlife in other cultures — and we show how the PuniCodex project turned that philological record into a Unicode domain that resolves today. The history was never lost. It was only waiting for the infrastructure to catch up.

## At a Glance

- **Restored name:** Supay
- **ASCII form:** supay
- **Meaning:** "The spirit"
- **Domain of influence:** Underworld, Death
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Supay** (*supay*) — Underworld, Death · The spirit — belongs to the Incan tradition, where it is catalogued under the domain "Underworld, Death". The name means "The spirit". He is the ruler of the underworld, the Uku Pacha, the domain beneath the earth's surface where the dead dwell and where minerals lie hidden. But Supay is not simply a devil. In the Andean cosmos, he is a necessary power, the guardian of a realm that must exist if the world above is to flourish.

PuniCodex restores the name as **Supay** and serves its temple at [its temple](https://punicodex.com/supay/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *supay* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Supay** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "The spirit". The word *supay* in Quechua refers to a spirit or demon, and by extension to the ruler of the spirits of the dead. Spanish missionaries quickly identified Supay with the Christian devil, a translation that has colored popular understanding ever since but that oversimplifies the Andean theology of the underworld.

The ASCII form *supay* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Supay** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **s** → **S** — Same, capitalized
- **u** → **u** — Same
- **p** → **p** — Same
- **a** → **a** — Same
- **y** → **y** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Supay** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The name's association with demons and the devil is largely a colonial overlay; the older Andean sense is broader and more neutral.

## Pronunciation

The reconstructed pronunciation of the name is **/suˈpay/** — Restored scholarly form.

Phoneme by phoneme:

- **su** — Voiceless alveolar fricative and high back vowel.
- **pay** — Bilabial stop, open vowel, and palatal approximant.

For the modern speaker, the closest approximation is: "soo-PAHY," with stress on the second syllable. The final *y* is a consonantal glide. The ASCII form "supay" preserves the letters; the restoration "Supay" restores the capitalization.

## Mythology

The stories of Supay place underworld and death at the center of a living mythological world.

### Origins

Incan tradition divides the cosmos into three realms: Hanan Pacha, the upper world of the sky; Kay Pacha, the surface world of living humans; and Uku Pacha, the lower world of the dead and of mineral wealth. Supay rules Uku Pacha. He is not the source of evil in a Christian sense but the lord of a necessary domain. The dead go to his realm; miners enter his domain when they dig; offerings must be made to him to ensure safe passage and return.

### The Lord of the Underworld

Supay's court is populated by spirits, demons, and the souls of the dead. He is sometimes imagined as a horned figure, a visual equation with the Christian devil that began in the colonial period and continues in folk art today. But in the older strata of belief, his form is less fixed. He is the power beneath the earth, the one who owns the metals and who must be paid for whatever is taken from his realm.

### Worship and Memory

Devotees and later tradition-keepers preserved Supay in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Miners across the Andes make offerings to *El Tío*, a cigar-smoking figure who represents the lord of the mine and who is widely understood as a transformation of Supay under Catholic pressure. The festival of Ñatitas, in which decorated skulls are venerated in Bolivia, also preserves the ancient intimacy between the living and the dead.

## Symbols & Iconography

The iconography associated with Supay concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Supay, carrying scholarly and cultural weight.
- **Domain** — Underworld, Death
- **Horns** — A colonial-era visual equation with the Christian devil.
- **Mining tools** — Pickaxes, lamps, and dynamite offered to the mine lord.
- **Coca and alcohol** — Standard offerings given to Supay and El Tío.
- **Skulls** — Symbols of the dead who dwell in the underworld.

## Archaeology & Evidence

The material evidence for Supay's cult is found in mines, cemeteries, and offering sites across the Andes. Miners' shrines, often located deep underground, contain statues of El Tío covered with offerings of coca, cigarettes, and alcohol. These shrines are direct descendants of pre-Columbian offerings to the underworld lord.

No monument in the current PuniCodex corpus is yet assigned to Supay with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be distributed across mines and cemeteries rather than concentrated in a single temple.

## Realm & Domain

**Supay** is underworld, death. The name means "The spirit" and belongs to the Incan tradition.

### Sacred Name

The restoration Supay returns the figure to scholarly recognition.

### Underworld

Central domain: underworld, death.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include [[hades|Hádēs]], [[hel|Hel]], and [[osiris|Osiris]], each linked through underworld and death. The comparison is useful but must be nuanced. Unlike Hades, Supay is not primarily a judge of the dead; he is the owner of a realm whose resources the living need. The economic dimension of the underworld — metals, miners, offerings — is central to Supay in a way that has few exact parallels.

## Cultural Legacy

Supay remains a touchstone for understanding Incan religion, art, and identity. The name appears in Andean folklore, in mining rituals, in the diabolical figures of carnival, and in scholarly discussions of colonial religious transformation. The identification with the devil has made Supay a powerful symbol in both Christian and anti-Christian contexts. For some, he represents the demonization of indigenous religion; for others, he is a figure of resistance, a deity who survived colonial suppression by hiding inside a Christian mask.

## The Scholarly Record

The account of Supay given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; colonial chronicles and ethnographic studies of mining communities supply the evidence of practice.

## A Meditation

To contemplate Supay is to hold the idea of underworld, death, and spirit in the mind and to ask what it means for the realm of the dead to be a place of wealth as well as fear. The name means "The spirit" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as underworld, death · The spirit.

Sit with the restored form — Supay — and the spelling itself becomes the practice: the capital S marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *supay* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Supay is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *supay* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *supay* to **Supay**, one character at a time:

- **s** → **S** — Same, capitalized
- **u** → **u** — Same
- **p** → **p** — Same
- **a** → **a** — Same
- **y** → **y** — Same

## The Incan Pantheon

Supay is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Supay mean?** The traditional gloss is "The spirit."

**Which tradition does Supay belong to?** Supay is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Supay classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Supay in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts supay to Supay for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Supay

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *supay* into **Supay** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Urcaguary](/urcaguary/), [Inti](/inti/), and [Wiraqucha](/viracocha/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Supay is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Supay**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *supay* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Supay in Its Tradition

**Supay** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Underworld, Death — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Supay** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Supay** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *supay*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Supay**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "The spirit" anchors the name in its semantic field. The restored form **Supay** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Urcaguary](/urcaguary/)
- [Inti](/inti/)
- [Wiraqucha](/viracocha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Polo de Ondegardo and Acosta, and ethnographic studies of Andean mining rituals.`,

  urcaguary: `# How Urcaguary got its accent back

The ASCII form *urcaguary* is missing something. **Urcaguary** restores the marks the source language used to distinguish this name from a thousand others — and those marks change how the name is read, pronounced, and understood. This post explains, with the full scholarly record behind it, what each restored mark preserves: the Incan transcription evidence, the reconstructed sound, the myths the name carries, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the marks in Urcaguary will look less like ornaments and more like what they are — recovered evidence, pinned back in its proper place.

## At a Glance

- **Restored name:** Urcaguary
- **ASCII form:** urcaguary
- **Meaning:** "He of the underground"
- **Domain of influence:** Underworld Jewels
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Urcaguary** (*urcaguary*) — Underworld Jewels · He of the underground — belongs to the Incan tradition, where it is catalogued under the domain "Underworld Jewels". The name means "He of the underground". He is the serpentine guardian of subterranean treasure, the lord of gems and metals hidden beneath the earth, and a figure closely related to the underworld power Supay. Where Supay rules the dead, Urcaguary guards the wealth of the depths.

PuniCodex restores the name as **Urcaguary** and serves its temple at [its temple](https://punicodex.com/urcaguary/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *urcaguary* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Urcaguary** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "He of the underground". The name seems to be built from *urcu*, mountain or hill, with a suffix indicating agency or possession. The result is a title rather than a personal name: he who belongs to the mountain's interior, the one whose home is the ore-filled dark.

The ASCII form *urcaguary* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Urcaguary** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **u** → **U** — Same, capitalized
- **r** → **r** — Same
- **c** → **c** — Same
- **a** → **a** — Same
- **g** → **g** — Same
- **u** → **u** — Same
- **a** → **a** — Same
- **r** → **r** — Same
- **y** → **y** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Urcaguary** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The name's descriptive structure — "he of the underground" — suggests that it functioned as a title or epithet before it became fixed as a divine name.

## Pronunciation

The reconstructed pronunciation of the name is **/uɾkaˈɣwaɾi/** — Restored scholarly form.

Phoneme by phoneme:

- **ur** — High back vowel and alveolar tap.
- **ca** — Voiceless velar stop and low vowel.
- **gua** — Voiced velar fricative or stop followed by labial glide and vowel.
- **ry** — Alveolar tap and palatal approximant.

For the modern speaker, the closest approximation is: "oor-kah-GWAH-ree," with stress on the third syllable. The Quechua-influenced *gua* cluster gives the name its Andean texture. The ASCII form "urcaguary" preserves the letters; the restoration "Urcaguary" restores the scholarly capitalization.

## Mythology

The stories of Urcaguary place underworld jewels at the center of a living mythological world.

### Origins

Incan tradition associates Urcaguary with the interior of mountains and the earth, the place where precious metals and gemstones are found. He is often depicted as a serpent or dragon-like being, a shape that evokes both the veins of ore in rock and the dangerous, subterranean pathways that miners must follow. His realm overlaps with Uku Pacha, the underworld ruled by Supay, but his specific concern is wealth rather than death.

### The Guardian of Jewels

Urcaguary is the one who owns the treasures hidden in the earth. To take gold, silver, or emeralds without his permission is to invite disaster. Miners and treasure seekers therefore make offerings before entering the depths, asking Urcaguary to reveal his wealth or at least not to punish those who disturb it. The theology is one of reciprocity: the earth gives, but only to those who ask properly and give in return.

### Worship and Memory

Devotees and later tradition-keepers preserved Urcaguary in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Though less prominent than Inti or Pachamama in the imperial cult, he remained important in mining regions and in the folk religion of treasure and wealth. Offerings of coca, alcohol, and miniature tools were left at mineshafts and prospecting sites.

## Symbols & Iconography

The iconography associated with Urcaguary concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Urcaguary, carrying scholarly and cultural weight.
- **Domain** — Underworld Jewels
- **Serpent or dragon** — The form of the subterranean treasure guardian.
- **Gems and metals** — Emeralds, gold, silver, and other underground wealth.
- **Mine shaft** — The opening into his realm.
- **Coca and alcohol** — Standard offerings given to the lord of the depths.

## Archaeology & Evidence

The material evidence for Urcaguary's cult is found in mining landscapes across the Andes. Offerings buried at the entrances of mines, statues of serpentine beings, and the rich mineral deposits themselves all testify to a long relationship between Andean peoples and the personified wealth of the earth.

No monument in the current PuniCodex corpus is yet assigned to Urcaguary with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be distributed across mining regions rather than concentrated in a single temple.

## Realm & Domain

**Urcaguary** is underworld jewels. The name means "He of the underground" and belongs to the Incan tradition.

### Sacred Name

The restoration Urcaguary returns the figure to scholarly recognition.

### Underworld Jewels

Central domain: underworld jewels.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include underworld treasure guardians and earth spirits from many traditions. The comparison must be made carefully, because Urcaguary is specifically an Andean figure whose serpentine form and association with mining reflect the particular geology and economy of the central Andes. Yet the worldwide motif of a dragon or serpent guarding hidden treasure shows that the idea of a subterranean wealth guardian is not unique.

## Cultural Legacy

Urcaguary remains a touchstone for understanding Incan religion, art, and identity. The name survives in mining folklore, in stories of buried treasure, and in the continuing practice of offering to the earth before extraction. Environmental debates about mining in the Andes sometimes invoke figures like Urcaguary to argue that extraction should be governed by reciprocity rather than exploitation.

## The Scholarly Record

The account of Urcaguary given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; colonial chronicles and ethnographic studies of mining communities supply the evidence of practice.

## A Meditation

To contemplate Urcaguary is to hold the idea of underworld jewels and hidden wealth in the mind and to ask what it means for the earth's treasures to be guarded. The name means "He of the underground" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as underworld jewels · He of the underground.

Sit with the restored form — Urcaguary — and the spelling itself becomes the practice: the capital U marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *urcaguary* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Urcaguary is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *urcaguary* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *urcaguary* to **Urcaguary**, one character at a time:

- **u** → **U** — Same, capitalized
- **r** → **r** — Same
- **c** → **c** — Same
- **a** → **a** — Same
- **g** → **g** — Same
- **u** → **u** — Same
- **a** → **a** — Same
- **r** → **r** — Same
- **y** → **y** — Same

## The Incan Pantheon

Urcaguary is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Urcaguary mean?** The traditional gloss is "He of the underground."

**Which tradition does Urcaguary belong to?** Urcaguary is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Urcaguary classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Urcaguary in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts urcaguary to Urcaguary for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, chronicles, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Urcaguary

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *urcaguary* into **Urcaguary** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Supay](/supay/), [Inti](/inti/), and [Wiraqucha](/viracocha/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Urcaguary is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Urcaguary**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *urcaguary* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Urcaguary in Its Tradition

**Urcaguary** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Underworld Jewels — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Urcaguary** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Urcaguary** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *urcaguary*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Urcaguary**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "He of the underground" anchors the name in its semantic field. The restored form **Urcaguary** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Supay](/supay/)
- [Inti](/inti/)
- [Wiraqucha](/viracocha/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, the chronicles of Polo de Ondegardo, and ethnographic studies of Andean mining and treasure folklore.`,

  ekkeko: `# Ekkeko in 2026: why scholars still care

In 2026, names are treated as data points. **Ekkeko** is a reminder that they are also cultural artifacts — and that the difference matters for search engines, AI training corpora, and anyone who types the name of an Incan figure into a browser. Scholars never stopped caring about the difference between *ekkeko* and Ekkeko; the web simply made that care actionable. What follows is the full scholarly picture — name, script, sound, myth, cult, and legacy — followed by the engineering compromise that lets a restored spelling live at a real address. The question is not whether the name is old. It is whether the digital world is old enough to hold it.

## At a Glance

- **Restored name:** Ekkeko
- **ASCII form:** ekkeko
- **Meaning:** "The dwarf"
- **Domain of influence:** Luck, Abundance
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Ekkeko** (*ekkeko*) — Luck, Abundance · The dwarf — belongs to the Incan tradition, where it is catalogued under the domain "Luck, Abundance". The name means "The dwarf". He is the small household god of prosperity, a smiling figure who carries goods and blessings on his back, and the patron of one of the most joyful festivals in the Andean calendar. Unlike the cosmic deities of the imperial pantheon, Ekkeko belongs to the house, the market stall, and the family altar.

PuniCodex restores the name as **Ekkeko** and serves its temple at [its temple](https://punicodex.com/ekkeko/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *ekkeko* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Ekkeko** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "The dwarf". The word appears in both Quechua and Aymara contexts, though the figure is especially prominent among Aymara-speaking communities around Lake Titicaca and in the Bolivian highlands. The doubled *k* gives the name its distinctive sound and may reflect a reduplicative or affectionate formation.

The ASCII form *ekkeko* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Ekkeko** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **e** → **E** — Same, capitalized
- **k** → **k** — Same
- **k** → **k** — Same
- **e** → **e** — Same
- **k** → **k** — Same
- **o** → **o** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Ekkeko** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The doubled *k* is one of the name's most distinctive phonetic features and should be preserved in any serious romanization.

## Pronunciation

The reconstructed pronunciation of the name is **/eˈkːeko/** — Restored scholarly form.

Phoneme by phoneme:

- **e** — Mid front vowel.
- **kke** — Geminate or strongly articulated voiceless velar stop followed by mid front vowel.
- **ko** — Voiceless velar stop and mid back vowel.

For the modern speaker, the closest approximation is: "eh-KEH-koh," with a noticeable emphasis on the doubled consonant. The ASCII form "ekkeko" preserves the letters; the restoration "Ekkeko" restores the capitalization.

## Mythology

The stories of Ekkeko place luck and abundance at the center of a living mythological world.

### Origins

Ekkeko is a dwarf figure, often depicted as a cheerful man with a large bundle of goods strapped to his back. His mythological origins are less elaborate than those of Inti or Wiraqucha; he seems to have emerged from household and market rituals rather than from imperial theology. In some accounts he is a trickster or a child of the mountain spirits; in others he is simply a power who brings prosperity to those who honor him.

### The God of Abundance

Ekkeko's defining attribute is the bundle he carries. It contains miniature versions of everything the household desires: money, houses, cars, food, diplomas, and even tiny airplanes for travelers. The logic is sympathetic magic: by giving Ekkeko a miniature of what you want, you encourage the full-sized thing to come into your life. The figure is placed on the family altar, offered cigarettes or coca, and treated as a living member of the household.

### Worship and Memory

Devotees and later tradition-keepers preserved Ekkeko in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. The most important public celebration is the Alasitas festival, held in La Paz and other Andean cities in January. During Alasitas, vendors sell miniature objects of every kind, and people buy tiny versions of their dreams to give to Ekkeko or to the Virgin of Copacabana, with whom the dwarf has been syncretized.

## Symbols & Iconography

The iconography associated with Ekkeko concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Ekkeko, carrying scholarly and cultural weight.
- **Domain** — Luck, Abundance
- **Bundle of goods** — Miniature objects representing desired blessings.
- **Cigarette or cigar** — The offering most commonly given to Ekkeko.
- **Smiling face** — The cheerful demeanor of the prosperity bringer.
- **Miniatures** — Houses, cars, money, and other tokens of Alasitas.

## Archaeology & Evidence

The material evidence for Ekkeko's cult consists chiefly of household altars, market stalls, and the vast commerce in miniature goods during Alasitas. Figurines of Ekkeko are mass-produced and widely sold, yet they descend from older household images made of clay, wood, or stone. The continuity between colonial and modern figures is well documented.

No monument in the current PuniCodex corpus is yet assigned to Ekkeko with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is expected to be found in households and markets rather than in monumental temples.

## Realm & Domain

**Ekkeko** is luck, abundance. The name means "The dwarf" and belongs to the Incan tradition.

### Sacred Name

The restoration Ekkeko returns the figure to scholarly recognition.

### Luck and Abundance

Central domain: luck, abundance.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include household prosperity spirits and tricksters from many traditions. The comparison must be made carefully, because Ekkeko's specific bundle imagery and his association with the Alasitas festival are distinctly Andean. Yet the worldwide motif of a small domestic spirit who brings wealth is not uncommon.

## Cultural Legacy

Ekkeko remains a touchstone for understanding Incan religion, art, and identity. The name is ubiquitous in Bolivian popular culture, appearing in songs, cartoons, tourist art, and political imagery. Alasitas has become a major cultural event that blends indigenous, Catholic, and commercial elements, and Ekkeko has been claimed by both nationalist and indigenous movements as a symbol of Andean prosperity.

## The Scholarly Record

The account of Ekkeko given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; ethnographic studies of Alasitas and household religion supply the evidence of practice.

## A Meditation

To contemplate Ekkeko is to hold the idea of luck, abundance, and the dwarf in the mind and to ask what it means for prosperity to arrive in a small package. The name means "The dwarf" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as luck, abundance · The dwarf.

Sit with the restored form — Ekkeko — and the spelling itself becomes the practice: the capital E marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *ekkeko* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Ekkeko is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *ekkeko* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *ekkeko* to **Ekkeko**, one character at a time:

- **e** → **E** — Same, capitalized
- **k** → **k** — Same
- **k** → **k** — Same
- **e** → **e** — Same
- **k** → **k** — Same
- **o** → **o** — Same

## The Incan Pantheon

Ekkeko is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Ekkeko mean?** The traditional gloss is "The dwarf."

**Which tradition does Ekkeko belong to?** Ekkeko is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Ekkeko classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Ekkeko in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts ekkeko to Ekkeko for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, ethnographies, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Ekkeko

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *ekkeko* into **Ekkeko** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Pachamama](/pachamama/), and [Mama Quilla](/mamaquilla/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Ekkeko is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Ekkeko**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *ekkeko* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Ekkeko in Its Tradition

**Ekkeko** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Luck, Abundance — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Ekkeko** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Ekkeko** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *ekkeko*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Ekkeko**, the chain begins with the attested form in Aymara and Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "The dwarf" anchors the name in its semantic field. The restored form **Ekkeko** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Pachamama](/pachamama/)
- [Supay](/supay/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, ethnographic studies of the Alasitas festival, and the ethnographic record of Aymara household religion.`,

  wamani: `# From Incan transcription to Unicode: the journey of Wamani

Long before it was a domain, this name traveled through scripts. **Wamani** begins in Incan transcription, passes through scholarly transliteration, and ends — for now — inside the punycode machinery of the global DNS. Each stage of that journey preserves some information and loses some, and the craft of restoration is knowing exactly which marks matter. This post follows the name stage by stage: the original script, the reconstructed pronunciation, the mythological record, the material evidence, and finally the Unicode form that carries all of it into the address bar. Think of it as a biography of a name, told through its spelling.

## At a Glance

- **Restored name:** Wamani
- **ASCII form:** wamani
- **Meaning:** "The falcon"
- **Domain of influence:** Sacred Mountain
- **Pantheon:** Incan
- **Classification:** Tier 2

## Overview

**Wamani** (*wamani*) — Sacred Mountain · The falcon — belongs to the Incan tradition, where it is catalogued under the domain "Sacred Mountain". The name means "The falcon". It denotes the mountain deity, the apu or wamani who guards a territory, controls the weather and water sources, and receives the offerings of those who live in the mountain's shadow. The term overlaps with the better-known Quechua word *apu*, but *wamani* has its own regional history and associations, including the meanings of falcon, flag, or banner.

PuniCodex restores the name as **Wamani** and serves its temple at [its temple](https://punicodex.com/wamani/). The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2. The plain ASCII form *wamani* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete.

## The Name

No indigenous written attestation survives for this name; **Wamani** is a scholarly transliteration of the reconstructed spoken form. Etymologically the name means "The falcon". In Quechua and related Andean languages, the word can refer to a falcon, a banner, or a regional division, and by extension to the divine power of a particular mountain. The polysemy is significant: the mountain deity is both a soaring presence and a territorial marker.

The ASCII form *wamani* survives only because the early domain-name system could not carry diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Wamani** recovers the full detail of the scholarly transliteration directly in the address bar. The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.

The letter-by-letter transformation runs:

- **w** → **W** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **n** → **n** — Same
- **i** → **i** — Same

## The Original Script

No indigenous writing system is securely attested for individual Incan names. The Inca kept records through quipu and oral tradition. The form shown is therefore a modern scholarly transliteration that encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.

The form **Wamani** is a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use. The name's range of meanings — falcon, banner, mountain deity — reflects the Andean habit of seeing landscape features as animate powers.

## Pronunciation

The reconstructed pronunciation of the name is **/waˈmani/** — Restored scholarly form.

Phoneme by phoneme:

- **wa** — Labial approximant and open vowel.
- **ma** — Bilabial nasal and open vowel.
- **ni** — Alveolar nasal and high front vowel.

For the modern speaker, the closest approximation is: "wah-MAH-nee," with stress on the second syllable. The ASCII form "wamani" preserves the letters; the restoration "Wamani" restores the capitalization.

## Mythology

The stories of Wamani place sacred mountain at the center of a living mythological world.

### Origins

Incan tradition holds that every major mountain has a wamani or apu, a personal power that governs the territory around it. These beings are not abstract forces; they are persons with wills, moods, and relationships. A wamani can be generous, sending rain and protecting travelers, or angry, sending avalanches and storms. The mythology of any given community is therefore anchored in the specific mountains visible from its fields.

### The Falcon and the Banner

The meaning "falcon" connects the mountain deity to the sky and to predatory power. Falcons and hawks are common symbols of sovereignty and watchfulness across the Andes. The meaning "banner" or "flag" connects the wamani to political identity: a group's wamani is the symbol of its land and its autonomy. The deity thus fuses natural geography, animal power, and social identity in a single name.

### Worship and Memory

Devotees and later tradition-keepers preserved Wamani in ritual, text, and iconography, ensuring the name survived into the modern scholarly record. Travelers make offerings at cairns called apachetas before crossing mountain passes. Communities pour libations of chicha and offer coca leaves to the apus before planting, herding, or undertaking any important journey. The mountains are addressed directly, as living lords of the land.

## Symbols & Iconography

The iconography associated with Wamani concentrates in a small set of recurring attributes, each a compressed statement about the name:

- **Name** — The restored form Wamani, carrying scholarly and cultural weight.
- **Domain** — Sacred Mountain
- **Mountain peak** — The body of the deity itself.
- **Falcon** — The soaring predator linked to the name's meaning.
- **Apacheta** — The stone cairn where offerings are left.
- **Coca and chicha** — Standard offerings given to the mountain lord.

## Archaeology & Evidence

The material evidence for Wamani's cult is found in the Andean landscape itself. Mountain-top shrines, offering platforms, cairns, and high-altitude burial sites all testify to the sacred status of peaks. Archaeologists have recovered children sacrificed in capacocha ceremonies on some of the highest mountains, a dramatic expression of the belief that the wamani must be fed.

No monument in the current PuniCodex corpus is yet assigned to Wamani with certainty beyond this diffuse material record. That absence should be read honestly: for an Incan name of this type the evidence is the landscape itself, and the primary record is the ongoing practice of mountain veneration.

## Realm & Domain

**Wamani** is sacred mountain. The name means "The falcon" and belongs to the Incan tradition.

### Sacred Name

The restoration Wamani returns the figure to scholarly recognition.

### Sacred Mountain

Central domain: sacred mountain.

### Living Tradition

Honored in Incan myth, cult, and cultural memory.

### Unicode Restoration

Preserved as a flagship temple despite the unregistrable plain-ASCII form.

## Across Cultures

Kindred figures in the PuniCodex cross-tradition index include mountain deities and nature spirits from many traditions. The comparison must be made carefully, because the wamani is not a generic mountain god but the personalized power of a specific peak. Yet the worldwide recognition of high places as sacred is real and ancient.

## Cultural Legacy

Wamani remains a touchstone for understanding Incan religion, art, and identity. The term and its synonym *apu* are widely used in contemporary Andean spirituality, environmental activism, and tourism branding. Mountains like Ausangate, Salkantay, and Illimani are addressed as living persons by pilgrims and climbers. The concept of the sacred mountain has also influenced debates about indigenous land rights and environmental protection.

## The Scholarly Record

The account of Wamani given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; ethnographic studies of mountain ritual supply the evidence of practice.

## A Meditation

To contemplate Wamani is to hold the idea of sacred mountain and falcon in the mind and to ask what it means for a landscape feature to be a person. The name means "The falcon" — and a name that carries its meaning so openly invites meditation rather than mere recollection. The tradition remembers the name as sacred mountain · The falcon.

Sit with the restored form — Wamani — and the spelling itself becomes the practice: the capital W marks the start of a proper name, a small act of attention, a refusal to let the plain ASCII form *wamani* stand in for the whole. What the tradition preserved in this name, the restoration asks the reader to preserve in turn.

## The Unicode Restoration

Wamani is classified as **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The ASCII fallback *wamani* still resolves everywhere, but it is the restored form that carries the name's full information. That is the whole thesis of this temple: the marks are the message.

## Character by Character

The journey from *wamani* to **Wamani**, one character at a time:

- **w** → **W** — Same, capitalized
- **a** → **a** — Same
- **m** → **m** — Same
- **a** → **a** — Same
- **n** → **n** — Same
- **i** → **i** — Same

## The Incan Pantheon

Wamani is one of eleven entries the PuniCodex lexicon catalogues under the Incan pantheon. The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all restorations by tradition, tier, or script.

## Frequently Asked Questions

**What does Wamani mean?** The traditional gloss is "The falcon."

**Which tradition does Wamani belong to?** Wamani is catalogued in the Incan pantheon of the PuniCodex lexicon.

**Why is Wamani classified as Tier 2?** Because the restoration needs no distinctive letters or diacritics its ASCII form would lose — the restoration is a conventional capitalization.

**Can I use Wamani in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts wamani to Wamani for copying and pasting.

**Where does the scholarly information come from?** The entry is built from lexica, ethnographies, and reviewed scholarly sources listed in the Scholarly Edition.

## Typing Wamani

You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *wamani* into **Wamani** as you type, and the browser extension offers the same conversion inside any text field. Copy the restored form, paste it into the address bar, and the DNS does the rest.

## Sister Temples

Other temples in the Incan pantheon include [Inti](/inti/), [Pachamama](/pachamama/), and [Illapa](/illapa/) — each with its own restoration story, its own scholarly record, and its own place in the lexicon.

## Why This Restoration Matters

A door only matters if people walk through it. The temple is open, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and Wamani is one of its standing proofs.

## Explore Further

This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).

## A Closer Look at the Marks

A restored name is a small map. In the case of **Wamani**, the map does not lead through diacritics or special letters, because the source tradition preserved the name orally and through quipu rather than in the Latin alphabet. The ASCII form *wamani* and the restored form share the same letters; the restoration is a decision about which conventional spelling should serve as the public reference.

That decision is not cosmetic. The oral attestation carries semantic and phonetic information that no romanization can fully reproduce. By fixing one conventional spelling as the canonical domain form, the project prevents the drift that happens when a name is romanized differently in every article, map, and database. The breakdown still lists each character so visitors can see exactly what is being carried forward and what is not.

## Wamani in Its Tradition

**Wamani** does not stand alone. It belongs to the Incan tradition, where it is counted among eleven names in the PuniCodex lexicon. Its sphere — Sacred Mountain — places it beside other figures who govern similar aspects of experience. The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin.

## What You Will Find in the Temple

The temple page for **Wamani** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly.

## The Restoration on the Live Web

A domain name is a kind of publication. When **Wamani** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a scholarly article can paste it into a browser. Before Unicode domains, a scholar could write the name correctly while the public web flattened it to *wamani*. Now the public web can carry the correct form end to end.

## Restoration Notes

Restoring a name is not a single decision; it is a sequence of smaller decisions, each backed by a different kind of evidence. For **Wamani**, the chain begins with the attested form in Quechua oral tradition, continues through the standard scholarly romanizations, and ends with the DNS-compatible Unicode spelling used by this temple. The meaning "The falcon" anchors the name in its semantic field. The restored form **Wamani** follows the tier rule that places it in **Tier 2**: the restoration needs no distinctive letters or diacritics its ASCII form would lose. The rule is mechanical, not editorial.

## Related Names

- [Inti](/inti/)
- [Illapa](/illapa/)
- [Pachamama](/pachamama/)

## Sources

The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post include works by Cerrón-Palomino, ethnographic studies of Andean mountain cults, and the archaeological record of high-altitude shrines and capacocha sites.`,
};

function readingTime(words) {
  const minutes = Math.max(10, Math.round(words / 200));
  return `${minutes} min read`;
}

const results = [];
for (const id of IDS) {
  const data = readJson(id);
  const body = bodies[id];
  if (!body) {
    throw new Error(`Missing body for ${id}`);
  }
  const wc = countWords(body);
  if (wc < 2400 || wc > 4200) {
    throw new Error(`Word count for ${id} out of range: ${wc}`);
  }
  data.body = body;
  data.readingTime = readingTime(wc);
  writeJson(id, data);
  results.push({ id, words: wc, readingTime: data.readingTime });
}

console.table(results);
