const fs = require('fs');

const scholars = {
  entryId: 'ngalyod',
  contentVersion: 1,
  sections: {
    overview: {
      body: `**Ngalyod** (*ngalyod*) — Rainbow Serpent — belongs to the Aboriginal Australian tradition of western Arnhem Land, catalogued under the Kunwinjku/Kuninjku language group. The name means "the rainbow"[^1].

Ngalyod is the great Rainbow Serpent: creator of rivers and waterholes, guardian of the wet season, and law-giver who established the social and ceremonial order of Kunwinjku country. In the wet she arcs across the sky as the rainbow; in the dry she sleeps beneath the earth in the permanent waters.

PuniCodex restores the name as **Ngalyod**. The plain ASCII form *ngalyod* is a DNS compromise: the early domain-name system could not carry the capitalised proper-name form or any Indigenous-script representation, so the lower-case string became the practical fallback. The Unicode restoration capitalises the initial **N** as the standard scholarly citation form for a proper name. Because no diacritic or distinctive special letter is added, the name is placed in Tier 2: the philological content is identical to the ASCII form, but the capitalisation marks the name as a name[^2].`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' },
        { citation: 'AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies), Kunwinjku language and subject resources.' }
      ],
      generatedFrom: ['lore:domains', 'lexicon:meaning', 'archetype:tier'],
      bespoke: false
    },
    'the-name': {
      body: `The name is attested in the oral traditions of the Kunwinjku and closely related Kuninjku peoples of western Arnhem Land as **Ngalyod**, meaning "the rainbow" and, by extension, the Rainbow Serpent with whom the rainbow is identified[^1].

No Indigenous writing system was used for Kunwinjku before European contact. The form **Ngalyod** is therefore a modern scholarly transliteration. The initial capital is not decorative: it signals that the word is a proper name, the standard convention when citing Aboriginal sacred figures in English-language scholarship. The ASCII form *ngalyod* erases that signal and treats the name as a common noun.

For a domainless ASCII name, the plain ASCII form is simply a technological compromise imposed by the DNS root zone. It is not a preferred spelling and carries no scholarly authority. The Unicode restoration **Ngalyod** is the citation form used in mythographic, linguistic, and art-historical discussion.

The letter-by-letter transformation runs:

- **n** → **N** — Same letter, capitalised as a proper name
- **g** → **g** — Same
- **a** → **a** — Same
- **l** → **l** — Same
- **y** → **y** — Same
- **o** → **o** — Same
- **d** → **d** — Same

Because the source tradition was oral, there is no ancient written form to recover; the best the Unicode address bar can do is to preserve the conventional citation spelling with its proper-name capitalisation. Related regional names for the Rainbow Serpent include **Yurlungur** (Yolŋu), **Wagyl** (Noongar), and **Julunggul** (some north-eastern traditions). These are not interchangeable with Ngalyod; each belongs to a specific country, language, and ceremonial complex[^2].`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' },
        { citation: 'AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies), Kunwinjku language and subject resources.' }
      ],
      generatedFrom: ['lexicon:greek', 'lexicon:meaning', 'lexicon:breakdown', 'archetype:tier', 'lore:etymology', 'original-scripts:provenance'],
      bespoke: false
    },
    pronunciation: {
      body: `The reconstructed pronunciation is **/ˈŋa.ljɔd/** — Kunwinjku / Kuninjku[^1].

For the modern English speaker, the closest approximation is: **'NGAL-yod'** — start with the 'ng' sound of English 'sing' followed by 'al', then a light 'yod' (as in the Hebrew letter-name). Avoid adding an initial vowel before the ng; the sound ŋ is the very first phoneme of the name.

Kindred and related forms of the figure:

- **Kunwinjku / Kuninjku** — Ngalyod, the Rainbow Serpent of western Arnhem Land
- **Yolŋu Matha** — Yurlungur, the copper python / rainbow serpent of north-eastern Arnhem Land
- **Noongar** — Wagyl, the rainbow serpent guardian of rivers in south-west Western Australia
- **English comparative term** — Rainbow Serpent, the scholarly umbrella coined for cross-regional discussion

Ngalyod is Tier 2 because the ASCII form *ngalyod* already encodes the same phonemic sequence; the restoration adds only the capitalisation that marks a proper name. The distinctive velar nasal /ŋ/ is represented by the digraph *ng*, which is available in ASCII, so no distinctive non-ASCII letter is required for phonemic recovery.`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' }
      ],
      generatedFrom: ['lore:pronunciation'],
      bespoke: false
    },
    domains: {
      body: `Ngalyod governs the domain of water, law, and seasonal renewal in Kunwinjku country. Her mythic acts created the rivers, waterholes, and wetlands of western Arnhem Land and established the moiety system, marriage rules, and ceremonial obligations that still structure social life.

Four domains are especially prominent:

- **The Rainbow** — Ngalyod's visible body, the sign of her movement between waterholes during the wet season.
- **Waterhole Guardian** — In the dry season she rests in the deep, permanent waters; their protection is a sacred duty.
- **Law Giver** — She divided the people into moieties and set the rules of kinship, ceremony, and land tenure.
- **Creator of Abundance** — She created the fish, waterlilies, and other foods that sustain the wetlands economy.

These domains are inseparable from the country itself. To speak of Ngalyod is to speak of specific places — Ubirr, Nourlangie, the Arnhem Land plateau — and of the clans who hold the right to speak for them[^2].`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' },
        { citation: "Taylor, Luke, 'Seeing the Inside: Bark Painting in Western Arnhem Land', Clarendon Press, 1996." }
      ],
      generatedFrom: ['lore:domains'],
      bespoke: false
    },
    symbols: {
      body: `The iconography associated with Ngalyod concentrates on a small set of recurring attributes, each a compressed statement about the figure's identity[^1]:

- **The rainbow** — the serpent's body seen in the sky after rain, linking waterhole to waterhole.
- **The waterhole** — her dry-season dwelling and the source of life in country.
- **Stone spear-points** — sacred objects sometimes identified as Ngalyod's teeth or gifts.
- **Lightning** — the flash that accompanies her movement and the breaking of storms.

In western Arnhem Land rock art, Ngalyod is frequently painted in the 'x-ray' style, showing the backbone, ribs, and internal organs. This convention identifies the figure as both a real python ancestor and a cosmic power; the image is not merely decorative but a visual statement of the continuity between animal body, landscape, and ancestral law.`,
      sources: [
        { citation: "Chaloupka, George, 'Journey in Time: The World's Longest Continuing Art Tradition', Reed Books, 1993." },
        { citation: "Taylor, Luke, 'Seeing the Inside: Bark Painting in Western Arnhem Land', Clarendon Press, 1996." }
      ],
      generatedFrom: ['lore:symbols'],
      bespoke: false
    },
    'original-script': {
      body: `The Kunwinjku source tradition was oral. No Indigenous writing system is securely attested for individual Kunwinjku names, so the form **Ngalyod** is a modern scholarly transliteration rather than an ancient written original[^1].

The scholarly transliteration encodes the reconstructed sound of the name: initial velar nasal /ŋ/, followed by /a/, the palatal lateral cluster /lj/, and the final syllable /ɔd/. The capitalisation marks the word as a proper name, the standard convention in English-language scholarship on Aboriginal sacred figures.

Because there is no original script in the Greek, Devanagari, or CJK sense, the project labels this form 'Scholarly Transliteration'. The ASCII fallback *ngalyod* is a DNS convenience; the restoration **Ngalyod** is the citation form.`,
      sources: [
        { citation: 'AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies), Kunwinjku language and subject resources.' },
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' }
      ],
      generatedFrom: ['original-scripts:provenance'],
      bespoke: false
    },
    mythology: {
      body: `The central myths of Ngalyod explain the shape of the country and the obligations of the people who live in it. In the Dreaming she travelled across a flat land, raising ridges and excavating waterholes with her body. She established the two moieties and the marriage rules that bind clans. She stocked the waters with fish and waterlilies and laid down the ceremonies through which her presence is acknowledged[^1].

One widely recorded narrative tells of a boy who mocked or wounded the serpent. Ngalyod swallowed him and carried him underground through the water system, releasing him transformed or at a great distance from home. The story is a charter for respectful behaviour at waterholes and a warning that the sacred power of country cannot be treated casually.

The return of the wet season is itself a mythic event: the first storms are read as Ngalyod moving between her waterhole dwellings, and the rainbow as her body made briefly visible. Seasonal knowledge and ceremonial action are therefore continuous with the Dreaming narrative.`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' }
      ],
      generatedFrom: ['lore:mythology'],
      bespoke: false
    },
    syncretism: {
      body: `The Rainbow Serpent is one of the most widely distributed figures in Aboriginal Australia, yet it is **not a single deity under many names**. Each language group knows a distinct serpent with its own country, kinship, and ceremonies: Yurlungur in Yolŋu country, Wagyl in Noongar country, Julunggul among some north-eastern groups, and Ngalyod among the Kunwinjku. Anthropologists and art historians have long debated whether these figures share a common origin or whether the rainbow-serpent concept is a convergence of regional powers onto a similar natural sign. What is clear is that Ngalyod must be understood on Kunwinjku terms first, before any wider comparison is attempted[^1].

Within the Aboriginal tradition, closely related names in the corpus include [[altjira|Altjira]], [[baiame|Baiame]], [[bunjil|Bunjil]], [[daramulum|Daramulum]], [[eingana|Eingana]], and [[gnowee|Gnowee]].`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' }
      ],
      generatedFrom: ['lore:syncretism', 'lexicon:pantheon'],
      bespoke: false
    },
    'cultural-legacy': {
      body: `Ngalyod survives most visibly in the rock-art galleries of western Arnhem Land, painted in both naturalistic and x-ray styles across thousands of years of artistic tradition. Sites such as Ubirr and Nourlangie are now managed as living heritage by their traditional owners, and the serpent remains a central figure in contemporary Kunwinjku bark painting and ceremony[^1].

More broadly, the Rainbow Serpent has become a national symbol of Indigenous Australian ecological knowledge and spiritual connection to country. That wider fame carries a risk: the specific clan-owned meanings of Ngalyod can be absorbed into a generic 'Aboriginal' icon. Restoring the Kunwinjku name is therefore an act of precision, resisting the flattening that comes with over-generalisation.`,
      sources: [
        { citation: "Chaloupka, George, 'Journey in Time: The World's Longest Continuing Art Tradition', Reed Books, 1993." },
        { citation: "Taylor, Luke, 'Seeing the Inside: Bark Painting in Western Arnhem Land', Clarendon Press, 1996." }
      ],
      generatedFrom: ['lore:culturalLegacy'],
      bespoke: false
    },
    archaeology: {
      body: `The primary material witnesses to Ngalyod are the rock-art galleries of western Arnhem Land, notably at sites such as Ubirr, Nourlangie, and the Arnhem Land plateau, where Rainbow Serpent figures appear in both naturalistic and x-ray styles across millennia of painting. Excavated occupation deposits, stone tool scatters, and fish-trap complexes document the long-term human use of the waterholes and wetlands associated with the serpent. These places remain under the custodianship of their traditional-owner clans; access and reproduction of designs are regulated by Indigenous cultural authority[^1].`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' }
      ],
      generatedFrom: ['lore:archaeology'],
      bespoke: false
    },
    'scholarly-sources': {
      body: `The account of Ngalyod given in this edition rests on the witnesses and reference works listed below. The Berndts' collections of Aboriginal myth provide the narrative and linguistic frame; AIATSIS resources anchor the name in Kunwinjku language; and the art-historical studies of Chaloupka and Taylor supply the material and iconographic context.

- [^1] Berndt, Ronald M. and Catherine H. Berndt, *The Speaking Land: Myth and Story in Aboriginal Australia*, Penguin, 1989.
- [^2] AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies), Kunwinjku language and subject resources.
- [^3] Chaloupka, George, *Journey in Time: The World's Longest Continuing Art Tradition*, Reed Books, 1993.
- [^4] Taylor, Luke, *Seeing the Inside: Bark Painting in Western Arnhem Land*, Clarendon Press, 1996.
- [^5] Berndt, Ronald M., Kunwinjku (Gunwinggu) religious texts and field recordings, AIATSIS.`,
      sources: [
        { citation: 'Berndt, Ronald M. and Catherine H. Berndt, The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1989.' },
        { citation: 'AIATSIS (Australian Institute of Aboriginal and Torres Strait Islander Studies), Kunwinjku language and subject resources.' },
        { citation: "Chaloupka, George, 'Journey in Time: The World's Longest Continuing Art Tradition', Reed Books, 1993." },
        { citation: "Taylor, Luke, 'Seeing the Inside: Bark Painting in Western Arnhem Land', Clarendon Press, 1996." },
        { citation: 'Berndt, Ronald M., Kunwinjku (Gunwinggu) religious texts and field recordings, AIATSIS.' }
      ],
      generatedFrom: ['lore:sources', 'source-catalog'],
      bespoke: false
    }
  }
};

const blogBody = `# How Ngalyod got its name back

The ASCII form *ngalyod* is missing something subtle but important. **Ngalyod** restores the capitalisation that marks it as a proper name — a name, not a common noun. That single restored letter changes how the name is read, cited, and understood. This post explains, with the full scholarly record behind it, what the restoration preserves: the Kunwinjku language evidence, the reconstructed sound, the myths the name carries, the art that has kept it visible for millennia, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the capital N in Ngalyod will look less like an ornament and more like what it is — recovered scholarly convention, pinned back in its proper place.

## At a Glance

- **Restored name:** Ngalyod
- **ASCII form:** ngalyod
- **Meaning:** "The rainbow"; the Rainbow Serpent of western Arnhem Land
- **Domain of influence:** Rainbow Serpent, water, law, monsoon
- **Pantheon:** Aboriginal Australian (Kunwinjku / Kuninjku)
- **Classification:** Tier 2
- **Original script:** Scholarly transliteration of an oral tradition

## Overview

**Ngalyod** (*ngalyod*) — Rainbow Serpent — belongs to the Aboriginal Australian tradition of western Arnhem Land. The name means "the rainbow".

Ngalyod is the great Rainbow Serpent: creator of rivers and waterholes, guardian of the wet season, and law-giver who established the social and ceremonial order of Kunwinjku country. In the wet she arcs across the sky as the rainbow; in the dry she sleeps beneath the earth in the permanent waters.

PuniCodex restores the name as **Ngalyod**. The plain ASCII form *ngalyod* is a DNS compromise: the early domain-name system could not carry the capitalised proper-name form or any Indigenous-script representation, so the lower-case string became the practical fallback. The Unicode restoration capitalises the initial **N** as the standard scholarly citation form for a proper name. Because no diacritic or distinctive special letter is added, the name is placed in Tier 2: the philological content is identical to the ASCII form, but the capitalisation marks the name as a name.

## The Country That Holds the Name

To understand Ngalyod, it helps to start with country. The Kunwinjku and closely related Kuninjku peoples live in the stone-country and flood-plain landscapes of western Arnhem Land, in Australia's Northern Territory. This is a world of dramatic seasonal contrast: during the wet season, torrential rains fill the rivers and billabongs, and the land seems to float between water and sky; during the dry season, the surface water retreats into permanent waterholes that become the focus of life, ritual, and memory.

In that setting, the rainbow is not merely a meteorological effect. It is read as the body of a powerful ancestral being moving between waterholes, and the waterholes themselves are read as her resting places. The same landscape feature can be a physical place, a mythic event, and a moral injunction all at once. That inseparability of land, story, and law is one of the defining characteristics of Aboriginal Australian cosmology, and Ngalyod is one of its most striking expressions in western Arnhem Land.

The region is also one of the world's great rock-art provinces. Galleries at Ubirr, Nourlangie, and across the Arnhem Land plateau preserve images of the Rainbow Serpent in both naturalistic and x-ray styles, some extending back many thousands of years. These images are not museum pieces: they are living witnesses, maintained under Indigenous authority, and they continue to inform ceremonial practice and clan identity today.

## What the Name Means

The name is attested in the oral traditions of the Kunwinjku and closely related Kuninjku peoples of western Arnhem Land as **Ngalyod**, meaning "the rainbow" and, by extension, the Rainbow Serpent with whom the rainbow is identified.

No Indigenous writing system was used for Kunwinjku before European contact. The form **Ngalyod** is therefore a modern scholarly transliteration. The initial capital is not decorative: it signals that the word is a proper name, the standard convention when citing Aboriginal sacred figures in English-language scholarship. The ASCII form *ngalyod* erases that signal and treats the name as a common noun.

For a domainless ASCII name, the plain ASCII form is simply a technological compromise imposed by the DNS root zone. It is not a preferred spelling and carries no scholarly authority. The Unicode restoration **Ngalyod** is the citation form used in mythographic, linguistic, and art-historical discussion.

The letter-by-letter transformation runs:

- **n** → **N** — Same letter, capitalised as a proper name
- **g** → **g** — Same
- **a** → **a** — Same
- **l** → **l** — Same
- **y** → **y** — Same
- **o** → **o** — Same
- **d** → **d** — Same

Because the source tradition was oral, there is no ancient written form to recover; the best the Unicode address bar can do is to preserve the conventional citation spelling with its proper-name capitalisation. Related regional names for the Rainbow Serpent include **Yurlungur** (Yolŋu), **Wagyl** (Noongar), and **Julunggul** (some north-eastern traditions). These are not interchangeable with Ngalyod; each belongs to a specific country, language, and ceremonial complex.

## How to Say It

The reconstructed pronunciation is **/ˈŋa.ljɔd/** — Kunwinjku / Kuninjku.

For the modern English speaker, the closest approximation is: **'NGAL-yod'** — start with the 'ng' sound of English 'sing' followed by 'al', then a light 'yod'. Avoid adding an initial vowel before the ng; the sound ŋ is the very first phoneme of the name.

Kindred and related forms of the figure include **Yurlungur** in Yolŋu country, **Wagyl** in Noongar country, and **Julunggul** in some north-eastern traditions. These are related Rainbow Serpent figures, but each belongs to a specific country, language, and ceremonial complex; they are not simply alternate spellings of Ngalyod.

Ngalyod is Tier 2 because the ASCII form *ngalyod* already encodes the same phonemic sequence; the restoration adds only the capitalisation that marks a proper name. The distinctive velar nasal /ŋ/ is represented by the digraph *ng*, which is available in ASCII, so no distinctive non-ASCII letter is required for phonemic recovery.

## The Rainbow Serpent in Kunwinjku Myth

Ngalyod governs the domain of water, law, and seasonal renewal in Kunwinjku country. Her mythic acts created the rivers, waterholes, and wetlands of western Arnhem Land and established the moiety system, marriage rules, and ceremonial obligations that still structure social life.

Four domains are especially prominent:

- **The Rainbow** — Ngalyod's visible body, the sign of her movement between waterholes during the wet season.
- **Waterhole Guardian** — In the dry season she rests in the deep, permanent waters; their protection is a sacred duty.
- **Law Giver** — She divided the people into moieties and set the rules of kinship, ceremony, and land tenure.
- **Creator of Abundance** — She created the fish, waterlilies, and other foods that sustain the wetlands economy.

The central myths explain the shape of the country and the obligations of the people who live in it. In the Dreaming she travelled across a flat land, raising ridges and excavating waterholes with her body. She established the two moieties and the marriage rules that bind clans. A widely recorded narrative tells of a boy who mocked or wounded the serpent; Ngalyod swallowed him and carried him underground through the water system, releasing him transformed or far from home. The story teaches that waterholes and sacred sites must be approached with restraint.

The return of the wet season is itself a mythic event: the first storms are read as Ngalyod moving between her waterhole dwellings, and the rainbow as her body made briefly visible. Seasonal knowledge and ceremonial action are therefore continuous with the Dreaming narrative. This is not a mythology confined to a distant past; it is an ongoing interpretive frame for reading weather, water, and social obligation.

## Rock Art and Living Legacy

Ngalyod survives most visibly in the rock-art galleries of western Arnhem Land, painted in both naturalistic and x-ray styles across thousands of years of artistic tradition. Sites such as Ubirr and Nourlangie are now managed as living heritage by their traditional owners, and the serpent remains a central figure in contemporary Kunwinjku bark painting and ceremony.

The x-ray style is especially significant. By showing the backbone, ribs, and internal organs of the serpent, the artist asserts a continuity between the animal ancestor, the human community, and the country. The image is not merely decorative but a visual statement of the continuity between animal body, landscape, and ancestral law. Such paintings also encode restricted knowledge: the full meaning of a design is available only to those who have been initiated into the appropriate clan and ceremonial level.

More broadly, the Rainbow Serpent has become a national symbol of Indigenous Australian ecological knowledge and spiritual connection to country. That wider fame carries a risk: the specific clan-owned meanings of Ngalyod can be absorbed into a generic 'Aboriginal' icon. Restoring the Kunwinjku name is therefore an act of precision, resisting the flattening that comes with over-generalisation.

## The Unicode Restoration

PuniCodex classifies restorations by whether they recover a distinctive feature that plain ASCII loses. For Greek names, that feature is usually a stress mark or a length mark. For names in scripts such as Japanese or Chinese, the original characters themselves are distinctive but cannot be represented in the Latin alphabet at all.

For Ngalyod, the only difference between the ASCII form *ngalyod* and the restored form **Ngalyod** is the capitalisation of the initial N. Capitalisation is not a phonemic feature, but it is a scholarly convention that marks the word as a proper name. Because the convention is real and the ASCII form erases it, the restoration has value; but because no diacritic or special letter is involved, the name remains Tier 2.

The restoration is therefore modest in technical terms but meaningful in symbolic terms. It asks the address bar to acknowledge what dictionaries, encyclopedias, and scholarly articles already do: that this string is a proper name, a sacred figure, not a common noun. It also makes visible the DNS's historical inability to represent Indigenous writing systems and the compromises that have flowed from that limitation.

## Why a Domainless Flagship Still Matters

Ngalyod is a domainless flagship. That means PuniCodex has not been able to acquire a Unicode domain that matches the restored form, yet the entry receives the full flagship treatment: a dedicated temple page, scholarly content, a blog post, and a place in the lexicon's public interface. Why invest this effort in a name that does not currently resolve to a owned domain?

The reason is that the PuniCodex project is not only a domain-leasing platform; it is also a scholarly lexicon and a search engine for the Unicode web. A name can be culturally significant, philologically interesting, and publicly valuable even if no matching domain is available. By treating Ngalyod as a flagship, the project signals that Indigenous names are not an afterthought or a filler category. They are first-class entries with the same editorial standards as the Greek, Egyptian, and Norse names that dominate popular mythology.

The domainless status also makes a practical point. It shows that the value of a restoration does not depend on market ownership. A name can be restored because it deserves to be cited correctly, not because someone has bought the matching dot-com. In the long run, that principle protects the integrity of the lexicon from being reduced to a catalogue of premium real estate.

## Tier 2 and the Classification Logic

PuniCodex uses a tier system to communicate how much philological information a restoration recovers. Tier 1 restorations recover a feature that ASCII cannot represent: a Greek stress mark, a macron, a distinctive non-Latin letter, or an original character. Tier 2 restorations recover a convention that ASCII erases but that does not alter the phonemic or script identity of the name.

Ngalyod sits in Tier 2 because the only recovered element is the capitalisation of the initial N. The phonemes remain the same; the spelling remains the same; the only change is the scholarly marker that turns a common-noun string into a proper name. That is enough to justify the restoration, but not enough to place the name in Tier 1.

This classification is not a value judgment about the figure. Ngalyod is one of the most important beings in Kunwinjku cosmology. The tier label simply describes the technical relationship between the ASCII form and the restored form. It keeps the project's linguistic claims precise and avoids the inflation that would come from treating every capitalisation change as a Tier 1 recovery.

## Conclusion

The restoration of **Ngalyod** is small in letter-count but significant in principle. It insists that a Kunwinjku sacred name should appear in the address bar as a name, not as an anonymous string. It acknowledges that the ASCII form is a technological compromise, not a scholarly spelling. It honours the rock-art galleries, the waterholes, and the ceremonial traditions that have kept the figure alive across millennia. And it reminds us that the Dreaming is not a single generic story but a tapestry of specific languages, countries, and clans — each with its own names, including this one.

In a digital environment that still privileges the Latin alphabet and the lower-case string, restoring Ngalyod is a small act of recognition. It says that the name matters, that the country matters, and that the scholarly conventions we use to cite sacred names are worth preserving even when the change is as quiet as a single capital letter.`;

const blog = {
  entryId: 'ngalyod',
  title: 'How Ngalyod got its name back',
  description: 'Discover Ngalyod: the Kunwinjku Rainbow Serpent, the restoration of the name, and the scholars preserving it.',
  keywords: [
    'Ngalyod',
    'ngalyod',
    'Rainbow Serpent',
    'Aboriginal mythology',
    'Kunwinjku',
    'Arnhem Land',
    'Unicode domain',
    'PuniCodex',
    'IDN',
    'Indigenous name restoration'
  ],
  tags: ['aboriginal', 'Tier 2', 'Unicode', 'scholarly transliteration', 'restoration'],
  author: 'PuniCodex Team',
  publishedAt: '2026-08-28',
  body: blogBody,
  readingTime: '16 min read'
};

fs.writeFileSync('platform/scholars/content/ngalyod.json', JSON.stringify(scholars, null, 2));
fs.writeFileSync('platform/blog/content/ngalyod.json', JSON.stringify(blog, null, 2));
console.log('wrote both files');
