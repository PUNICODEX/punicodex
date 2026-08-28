const fs = require('fs');

const scholars = {
  entryId: 'bunjil',
  contentVersion: 1,
  sections: {
    overview: {
      body: "**Bunjil** (*bunjil*) — Creator Eaglehawk — belongs to the Aboriginal traditions of the Kulin nations in central Victoria, Australia. The name means 'the eaglehawk' and refers to the wedge-tailed eagle ancestor who shaped Country, gave law, and then withdrew into the sky.\n\nIn Kulin cosmology Bunjil is one of two moiety ancestors, paired with Waang the crow. The stories credit him with forming the land's surface, establishing social and ecological obligations, and finally ascending to become the star Altair. His wives became the black swans beside him, and his son Binbeal is the rainbow.\n\nPuniCodex restores the name as **Bunjil**. The plain ASCII form *bunjil* is a technological compromise required by the domain-name system: it drops only the capital initial that marks a proper name in English scholarly citation. Because the Kulin languages were traditionally oral and the ASCII spelling already contains the conventional transcription, the restoration is classified as Tier 2. The Unicode form remains the scholarly reference; the ASCII form is a practical convenience for DNS.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: 'Mudrooroo. Aboriginal Mythology: An A–Z (Thorsons, 1994).' }
      ],
      generatedFrom: ['lore:domains', 'lexicon:meaning', 'archetype:tier'],
      bespoke: false
    },
    'the-name': {
      body: "The name **Bunjil** is a theonym recorded from the Woiwurrung, Boonwurrung and related Kulin languages of central Victoria. It denotes the wedge-tailed eaglehawk (*Aquila audax*) in its ancestral, creative aspect.[^1] Because these languages were — and in revitalisation efforts continue to be — oral traditions, there is no pre-colonial alphabetic original script; the name survives in Latin transcriptions made by early settlers, missionaries and anthropologists.[^2]\n\nNo reconstructed Proto-Pama–Nyungan form can be offered with confidence; the word is recorded from the specific languages in which Bunjil's cult was central.[^3] Early colonial collectors produced a range of spellings — Winjeel, Wingeel, Pundjel, Bunjel, Punjel — as they attempted to write Aboriginal sounds with English letters. Modern Kulin communities and Victorian institutions generally prefer **Bunjil** or **Bundjil**.[^2]\n\nThe PuniCodex restoration **Bunjil** simply supplies the capital initial that English and Australian scholarly convention uses for a proper name. The ASCII form *bunjil* is therefore not an ancient spelling; it is a DNS compromise that flattens the name into all-lowercase letters. The spoken name and the mythic role remain intact.\n\nThe letter-by-letter transformation runs:\n\n- **b** → **B** — capitalised as a proper name\n- **u** → **u** — same\n- **n** → **n** — same\n- **j** → **j** — same\n- **i** → **i** — same\n- **l** → **l** — same\n\nNo distinctive diacritic or special letter is added, so the name remains Tier 2 in the PuniCodex system.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: 'AIATSIS. A. W. Howitt Collection (MS 69).' }
      ],
      generatedFrom: ['lexicon:meaning', 'lexicon:breakdown', 'lore:etymology', 'original-scripts:provenance', 'archetype:tier'],
      bespoke: false
    },
    pronunciation: {
      body: "The conventional scholarly reading of the name is **/ˈbʊn.dʒɪl/** — a two-syllable English transcription of the Kulin theonym.[^1] The first syllable carries stress and is pronounced with the short rounded vowel /ʊ/ as in English 'put'; the second syllable is an unstressed /dʒɪl/, with the affricate /dʒ/ as in 'jump' and a short /ɪ/ as in 'kit'. Some early colonial spellings such as 'Pundjel' and 'Punjel' suggest that the final syllable was heard with a light central vowel in certain dialects, but modern Kulin communities and Victorian institutions generally prefer the clearer 'Bun-jil' shape.[^2]\n\nBecause the source languages were — and in revitalisation efforts continue to be — oral traditions, the transcription is conventional rather than phonemically prescriptive.[^3] PuniCodex does not add a stress mark, length mark or distinctive letter: the ASCII form *bunjil* already encodes the same conventional spelling, and the capital in **Bunjil** simply restores proper-name convention. The name is therefore Tier 2 in the PuniCodex system: the Unicode form is the preferred scholarly citation, while the ASCII form is the practical domain-name compromise.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: 'Mudrooroo. Aboriginal Mythology: An A–Z (Thorsons, 1994).' }
      ],
      generatedFrom: ['lore:pronunciation'],
      bespoke: false
    },
    domains: {
      body: "Bunjil's domain is creation itself, conceived not as a single moment but as an ongoing relationship with Country. In Kulin thought he is the wedge-tailed eaglehawk who shaped the physical world, established law, and then took his place in the sky as a continuing watcher.\n\nHis influence extends across several registers. As **Creator of Country** he is responsible for landforms, water, plants, and animals. As **Law-Giver** he established the obligations that bind people to one another and to the land. As **Sky Ancestor** he provides a celestial point of reference, identified with the star Altair. As **Moiety Founder** he heads the eaglehawk half of the Kulin social order, balanced by Waang the crow.\n\nThese domains are not abstract categories; they are lived in the seasonal calendar, the songlines, the rock-art site of Bunjil's Shelter, and the contemporary cultural and environmental work of Kulin communities.",
      sources: [
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: "Briggs, Carolyn. 'Boon Wurrung Story.' Yarra Healing (2000)." },
        { citation: "Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009)." }
      ],
      generatedFrom: ['bespoke:scholarly-authorship'],
      bespoke: true
    },
    symbols: {
      body: "- **Wedge-tailed eagle** — Bunjil's living form and the largest bird of prey in Australia; a sign of creative authority and watchfulness.\n- **Spear** — the implement with which he commanded the rising sea to stop; also a sign of law-giving power.\n- **Black swan** — Bunjil's two wives, who became the stars flanking Altair after his ascent.\n- **Rainbow** — his son Binbeal, the rainbow spirit.\n- **Whirlwind / wind bag** — the means of his ascent to the sky, released by Waang or Bellin-Bellin.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: 'Mudrooroo. Aboriginal Mythology: An A–Z (Thorsons, 1994).' }
      ],
      generatedFrom: ['bespoke:scholarly-authorship'],
      bespoke: true
    },
    'original-script': {
      body: "No indigenous writing system is securely attested for individual Aboriginal names. The form shown is a modern scholarly transliteration.[^1]\n\nThe form **Bunjil** is therefore a scholarly transliteration rather than an attested ancient spelling; it encodes the reconstructed sound of the name for modern use, and no mark in it is decorative.\n\nThe Kulin languages were traditionally oral, and Bunjil has no original alphabetic script. The name survives in Latin transcription made by early settlers and anthropologists. PuniCodex therefore treats **Bunjil** as the scholarly citation form and **bunjil** as the DNS compromise. The restoration adds only the capital initial; the absence of diacritics or special letters places the name in Tier 2, not because the figure is less significant, but because the ASCII form already carries the conventional spelling.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' }
      ],
      generatedFrom: ['original-scripts:no-script-note', 'lore:originalScriptNote'],
      bespoke: false
    },
    mythology: {
      body: "Bunjil's stories belong to the Dreaming of the Kulin nations, especially the Woiwurrung, Boonwurrung and Wathaurong peoples. They explain how Country was made, how law was given, and how the creator withdrew into the sky so that he might continue to watch over the world.[^1]\n\n### Shaping the Land and the Law (Creation)\n\nIn the Dreaming, Bunjil travelled across what is now central Victoria. He formed the mountains, traced the rivers, named the plants and animals, and laid down the laws that govern how people relate to one another and to Country. These laws are not separate from the land; they are remembered in place names, songlines and the seasonal responsibilities of each clan.[^1]\n\n### The Sea That Would Not Stop Rising (Deluge)\n\nA Boonwurrung story tells of a time when the Kulin nations fell into conflict, neglecting family and Country. The sea rose in anger and threatened to flood the land. The people went to Bunjil and asked him to intervene. Bunjil agreed, but only if the people would change their ways and respect the law. He walked to the water's edge, raised his spear, and commanded the sea to stop. It did.\n\n### Lifted into the Sky (Ascent)\n\nWhen his work on earth was finished, Bunjil gathered his family and asked Waang, who kept the winds in skin bags, to release enough wind to carry them to the sky. Waang opened the whirlwind bag, and the wind lifted Bunjil and his people upward. Bunjil became the bright star Altair; his two wives, the black swans, became the stars on either side. Some accounts say he left this world from the island of Deen Maar.[^2]\n\n### Bunjil's Shelter (Sacred site)\n\nIn Gariwerd, the country now known as the Grampians, Bunjil took shelter in a cave in the Black Range. The rock-art site known as Bunjil's Shelter is one of the most important Aboriginal art places in Victoria and remains under the care of Traditional Owners. It is not merely a memory of the ancestor; it is a place where his presence is understood to remain.[^3]",
      sources: [
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: 'Mudrooroo. Aboriginal Mythology: An A–Z (Thorsons, 1994).' },
        { citation: "Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009)." }
      ],
      generatedFrom: ['lore:mythology'],
      bespoke: false
    },
    syncretism: {
      body: "Bunjil is not a solitary deity but one half of a Kulin social and cosmological pair. The eaglehawk moiety, headed by Bunjil, is balanced by the crow moiety, headed by Waang. This pairing structures kinship, marriage, and ritual obligations across the Kulin nations.[^1] Different clans emphasise different episodes — the Woiwurrung stress the sky ascent and Altair, the Boonwurrung remember the rising-sea story, and the Wathaurong preserve place-based accounts tied to the coast and to Bunjil's Shelter. In the colonial period the name was recorded under many spellings — Winjeel, Wingeel, Pundjel, Bunjel — reflecting dialect variation and the difficulty of rendering Aboriginal phonology in English orthography.[^1]\n\nKindred figures in the PuniCodex cross-tradition index include [[ahuramazda|AhuraMazdā]], [[audhumla|Auðhumla]], [[baiame|Baiame]], [[izanagi|Izanagi]], [[jagannatha|Jagannātha]] and [[oduduwa|Odùduwà]], each linked through creator / cosmogonic.",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' }
      ],
      generatedFrom: ['lore:syncretism', 'similarities:edges'],
      bespoke: false
    },
    'cultural-legacy': {
      body: "Bunjil remains a powerful symbol of Aboriginal Victoria. Bunjil's Shelter in the Black Range Scenic Reserve is a protected cultural site and a focus of education and tourism. Public art, including the giant sculpture *Eagle* in Melbourne, takes Bunjil as its inspiration.[^1] For the Wurundjeri, Boonwurrung and other Kulin communities, Bunjil is not only an ancestral figure but a living authority in discussions of land care, cultural identity and reconciliation.[^2] Educational resources, place-naming projects and environmental initiatives across central Victoria continue to draw on the figure of the creator eaglehawk, ensuring that the stories remain active in the present.[^1]",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." }
      ],
      generatedFrom: ['lore:culturalLegacy'],
      bespoke: false
    },
    archaeology: {
      body: "The principal material site associated with Bunjil is Bunjil's Shelter, a rock-art shelter in the Black Range Scenic Reserve within Gariwerd (Grampians National Park region), Victoria. The site is protected under the Aboriginal Heritage Act 2006 and is managed with Traditional Owner input.[^1] Textual witnesses include A. W. Howitt's ethnographic notes (AIATSIS MS 69), Aldo Massola's 1968 compilation, and contemporary community publications by Kulin educators and language custodians.[^2]",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009)." }
      ],
      generatedFrom: ['lore:archaeology'],
      bespoke: false
    },
    'scholarly-sources': {
      body: "The account of Bunjil given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the literary and religious texts supply the narrative evidence.\n\n- [^1] Howitt, A. W. *The Native Tribes of South-East Australia* (Macmillan, 1904).\n- [^2] Massola, Aldo. *Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia* (Lansdowne Press, 1968).\n- [^3] Mudrooroo. *Aboriginal Mythology: An A–Z* (Thorsons, 1994).\n- [^4] Briggs, Carolyn. 'Boon Wurrung Story.' *Yarra Healing* (2000).\n- [^5] Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009).\n- [^6] AIATSIS. A. W. Howitt Collection (MS 69).\n- [^7] National Indigenous Australians Agency. *Deen Maar Indigenous Protected Area* (2015).",
      sources: [
        { citation: 'Howitt, A. W. The Native Tribes of South-East Australia (Macmillan, 1904).' },
        { citation: "Massola, Aldo. Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia (Lansdowne Press, 1968)." },
        { citation: 'Mudrooroo. Aboriginal Mythology: An A–Z (Thorsons, 1994).' },
        { citation: "Briggs, Carolyn. 'Boon Wurrung Story.' Yarra Healing (2000)." },
        { citation: "Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009)." },
        { citation: 'AIATSIS. A. W. Howitt Collection (MS 69).' },
        { citation: 'National Indigenous Australians Agency. Deen Maar Indigenous Protected Area (2015).' }
      ],
      generatedFrom: ['lore:sources', 'source-catalog'],
      bespoke: false
    }
  }
};

const blogBody = `# How Bunjil got its capital back

The ASCII form *bunjil* looks like any other lowercase domain string. But **Bunjil** is not any other name: it is the creator eaglehawk of the Kulin nations of central Victoria, the ancestor who shaped Country, gave law, and then withdrew into the sky as the star Altair. This post explains why the Unicode restoration capitalises the first letter, what that capital letter preserves, and how a Tier 2 classification still honours a figure of immense cultural depth.

## At a Glance

- **Restored name:** Bunjil
- **ASCII form:** bunjil
- **Meaning:** "The eaglehawk"
- **Domain of influence:** Creator, law-giver, sky ancestor, moiety founder
- **Pantheon:** Australian Aboriginal (Kulin nations)
- **Classification:** Tier 2
- **Original script:** None — the Kulin languages were traditionally oral; the name survives in Latin transcription

## The Land and the People

Bunjil belongs to the Aboriginal traditions of the Kulin nations, the collective of Indigenous peoples whose Country covers much of what is now central Victoria, including the country of the Woiwurrung, Boonwurrung and Wathaurong language groups. In these traditions, the land is not inert scenery; it is Country — a living entity that includes the people, animals, plants, waters, skies and stories that belong together. Knowledge of Country is carried in oral narrative, song, dance, art and place names, and it is held collectively by custodians who are responsible for particular tracts of land and water.

The Kulin social order is structured in part by a moiety system that divides people, animals and natural phenomena into two complementary groups. One half is associated with the wedge-tailed eaglehawk, Bunjil; the other with the crow, Waang. This pairing is not simply symbolic. It shapes marriage rules, kinship terminology, ritual responsibilities and the telling of stories. A person's place in the world is partly defined by which moiety they belong to, and the stories of Bunjil and Waang encode the proper relationships between different parts of Country.

When Europeans arrived in central Victoria from the 1830s onward, they recorded Kulin languages in Latin letters, often inconsistently. Early settlers, missionaries and anthropologists wrote down the names, stories and social institutions they encountered, but their transcriptions were shaped by English phonology and spelling habits. The name we now write as **Bunjil** appears in colonial sources under many forms — Winjeel, Wingeel, Pundjel, Bunjel, Punjel — because English orthography had no ready way to represent the sounds of Woiwurrung or Boonwurrung. Modern Kulin communities and Victorian institutions generally prefer the spelling **Bunjil** or, in some contexts, **Bundjil**.

## The Meaning of the Name

The name **Bunjil** is a theonym: a name for a divine or ancestral being. In the Kulin languages of central Victoria it denotes the wedge-tailed eaglehawk, *Aquila audax*, in its ancestral, creative aspect. The wedge-tailed eagle is the largest bird of prey in Australia, and its high, wide-ranging flight makes it a natural emblem for a creator who sees all of Country and can move between earth and sky. Bunjil is not merely an eaglehawk; he is the eaglehawk ancestor, the figure whose actions in the Dreaming established the world as it is.

Because the Kulin languages were traditionally oral, there is no pre-colonial alphabetic original script for the name. It survives in the Latin transcriptions made by early settlers and anthropologists, and in the ongoing oral and revitalisation work of Kulin communities. No reconstructed Proto-Pama–Nyungan form can be offered with confidence; the word is recorded from the specific languages in which Bunjil's cult was central. The PuniCodex restoration therefore treats the capitalised Latin transcription **Bunjil** as the scholarly citation form and the lowercase **bunjil** as the DNS compromise.

The letter-by-letter transformation is minimal:

- **b** → **B** — capitalised as a proper name
- **u** → **u** — same
- **n** → **n** — same
- **j** → **j** — same
- **i** → **i** — same
- **l** → **l** — same

No distinctive diacritic or special letter is added, so the name is classified as Tier 2 in the PuniCodex system. That does not mean Bunjil is less important than a Tier 1 name; it means that the conventional spelling is already recoverable from the ASCII string, and the only thing the restoration supplies is the capital initial that marks a proper name.

## Myths and Symbols

Bunjil's stories are preserved in the Dreaming narratives of the Kulin nations. They explain how Country was made, how law was given, and how the creator withdrew into the sky so that he might continue to watch over the world.

### Shaping the Land and the Law

In the Dreaming, Bunjil travelled across what is now central Victoria. He formed the mountains, traced the rivers, named the plants and animals, and laid down the laws that govern how people relate to one another and to Country. These laws are not separate from the land; they are remembered in place names, songlines and the seasonal responsibilities of each clan. To know the law is to know the land, and to know the land is to know the stories of Bunjil.

### The Sea That Would Not Stop Rising

A Boonwurrung story tells of a time when the Kulin nations fell into conflict, neglecting family and Country. The sea rose in anger and threatened to flood the land. The people went to Bunjil and asked him to intervene. Bunjil agreed, but only if the people would change their ways and respect the law. He walked to the water's edge, raised his spear, and commanded the sea to stop. It did. The story is not only an explanation of coastal geography; it is a moral account of the consequences of forgetting social and ecological obligations.

### Lifted into the Sky

When his work on earth was finished, Bunjil gathered his family and asked Waang, who kept the winds in skin bags, to release enough wind to carry them to the sky. Waang opened the whirlwind bag, and the wind lifted Bunjil and his people upward. Bunjil became the bright star Altair; his two wives, the black swans, became the stars on either side. Some accounts say he left this world from the island of Deen Maar. In this way Bunjil did not abandon Country; he took his place in the sky as a continuing watcher, his eagle's eye still turned toward the land he made.

### Bunjil's Shelter

In Gariwerd, the country now known as the Grampians, Bunjil took shelter in a cave in the Black Range. The rock-art site known as Bunjil's Shelter is one of the most important Aboriginal art places in Victoria and remains under the care of Traditional Owners. It is not merely a memory of the ancestor; it is a place where his presence is understood to remain. The site is protected under the Aboriginal Heritage Act 2006 and continues to be a focus of education, research and respectful visitation.

Bunjil's symbols are drawn from the living world: the wedge-tailed eagle as his living form and sign of creative authority; the spear with which he commanded the rising sea to stop; the black swans that were his two wives; the rainbow that is his son Binbeal; and the whirlwind or wind bag that lifted him to the sky. Each symbol is also a reminder that the creator's power is expressed through natural phenomena that can still be observed.

## Cultural Significance Today

Bunjil remains a powerful symbol of Aboriginal Victoria. Bunjil's Shelter in the Black Range Scenic Reserve is a protected cultural site and a focus of education and tourism. Public art, including the giant sculpture *Eagle* in Melbourne, takes Bunjil as its inspiration. For the Wurundjeri, Boonwurrung and other Kulin communities, Bunjil is not only an ancestral figure but a living authority in discussions of land care, cultural identity and reconciliation.

The figure of the creator eaglehawk also appears in place names, educational resources and environmental initiatives across central Victoria. Language revitalisation projects return Bunjil's name to contemporary use, while land-management partnerships draw on the ancestral logic of caring for Country that the stories encode. In these contexts Bunjil is not a relic of the past but a continuing presence whose stories guide present-day decisions about how people ought to live on the land.

The cultural significance of Bunjil extends beyond Victoria as well. For many Australians, the name has become one of the most accessible entry points into Aboriginal cosmology. It appears in school curricula, museum exhibitions and public monuments, often accompanied by explanations of the moiety system, the Dreaming and the concept of Country. That visibility matters because it shapes how non-Indigenous Australians understand the depth and continuity of Indigenous knowledge.

## Unicode Restoration and the Tier 2 Classification

PuniCodex restores the name as **Bunjil**. The plain ASCII form *bunjil* is a technological compromise: the early domain-name system could not carry meaning, only letters, and it forced every name into lowercase. The restoration adds back the capital initial that English and Australian scholarly convention uses for a proper name. Because no diacritic or special letter is needed to recover the conventional spelling, the name is placed in Tier 2.

The Tier 2 label is mechanical, not evaluative. It simply means that the ASCII string already contains the conventional spelling and that the only information missing from it is typographic — the capital letter that signals a proper name. A Tier 1 name, by contrast, is one where the ASCII form loses a distinctive phonemic or orthographic feature such as a stress mark, length mark or non-Latin letter. For Bunjil, no such feature is present in the conventional Latin transcription, so the restoration is a small but meaningful typographic repair.

The Unicode form remains the philologically complete reference. When scholars cite the creator eaglehawk in English-language writing, they write **Bunjil** with a capital initial. The ASCII spelling *bunjil* is the practical convenience that the domain-name system demands. PuniCodex makes that relationship explicit: the flagship page presents **Bunjil** as the restored form, explains why the capital matters, and treats *bunjil.com* as the DNS compromise rather than the canonical name.

## Why a Domainless Flagship Matters

A flagship temple in PuniCodex does not require a live domain to be included in the lexicon. The project's goal is to restore and explain scholarly citation forms for names, not merely to list names that already have registered websites. Bunjil's inclusion as a domainless flagship is therefore a statement that Aboriginal names belong in the Unicode namespace even when the practical, legal and cultural questions of domain registration have not been resolved.

For a name like Bunjil, the domainless flagship carries particular weight. The Kulin languages were traditionally oral, and the name has no original alphabetic script. That absence does not make the name less real or less worthy of accurate representation. On the contrary, it highlights the colonial asymmetry built into DNS: a system designed for ASCII lowercase cannot preserve oral traditions, Indigenous ownership protocols or the capital letter that distinguishes a proper name from a common noun. By building a flagship page for Bunjil, PuniCodex creates a place where the restored name, its meaning, its mythology and its cultural context can be found and cited.

The domainless flagship also serves as an invitation to custodians and communities. Should a Kulin organisation or representative ever choose to register or use a Bunjil domain, the PuniCodex entry documents the correct scholarly form, explains the Tier 2 classification, and provides a public reference point. Until then, the entry stands as a reminder that the internet's naming systems are still catching up with the diversity of the world's names.

## Sources and Further Reading

- Howitt, A. W. *The Native Tribes of South-East Australia* (Macmillan, 1904).
- Massola, Aldo. *Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia* (Lansdowne Press, 1968).
- Mudrooroo. *Aboriginal Mythology: An A–Z* (Thorsons, 1994).
- Briggs, Carolyn. 'Boon Wurrung Story.' *Yarra Healing* (2000).
- Parks Victoria. 'Bunjil Shelter – Black Range Scenic Reserve, Stawell – Visitor Guide' (2009).
- AIATSIS. A. W. Howitt Collection (MS 69).
- National Indigenous Australians Agency. *Deen Maar Indigenous Protected Area* (2015).
`;

const blog = {
  entryId: 'bunjil',
  title: "How Bunjil got its capital back",
  description: "Discover Bunjil: the creator eaglehawk of the Kulin nations, the story behind the name restoration, and why the ASCII form is a DNS compromise.",
  keywords: ["Bunjil","bunjil","Australian Aboriginal mythology","Kulin nation","creator eaglehawk","Unicode domain","PuniCodex","IDN","name restoration"],
  tags: ["aboriginal","Tier 2","Unicode","restoration","Australian","no original script"],
  author: "PuniCodex Team",
  publishedAt: "2026-08-28",
  body: blogBody,
  readingTime: "18 min read"
};

fs.writeFileSync('platform/scholars/content/bunjil.json', JSON.stringify(scholars, null, 2));
fs.writeFileSync('platform/blog/content/bunjil.json', JSON.stringify(blog, null, 2));

console.log('rewrote both files');
