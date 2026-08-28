const fs = require('fs');

// Rewrite scholars content
const scholars = {
  entryId: 'wandjina',
  contentVersion: 1,
  sections: {
    overview: {
      body: "**Wandjina** (*wandjina*) — Cloud, Rain Spirits, Aboriginal Australian — belongs to the Kimberley traditions of Western Australia. The name means 'The cloud spirits'[^1].\n\nWandjina are the cloud-and-rain ancestors of the Kimberley: powerful beings who control the monsoon, shape the country, and enforce the Law. Their images, painted in rock shelters with large eyes, no mouth, and radiating halos, are among the most distinctive and culturally significant works of Aboriginal Australian art. They are not merely representations; in proper understanding, the paintings are sites where ancestral power remains present.\n\nPuniCodex restores the name as **Wandjina**. The plain ASCII form *wandjina* is the conventional scholarly romanisation of the Worrorra word; the restoration capitalises the proper name. Because the Aboriginal languages of the Kimberley were not written in a European sense before colonisation, and because this restoration does not add diacritics or distinctive letters absent from the ASCII form, the name is placed in Tier 2. The Unicode form remains the philologically complete reference, while the ASCII spelling is a practical compromise for the domain-name system[^2].",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['lore:domains', 'lexicon:meaning', 'archetype:tier'],
      bespoke: false
    },
    'the-name': {
      body: "The name is attested orally in the Worrorra language of the north Kimberley coast and in related Ngarinyin and Wunambal forms such as **Wanjina**. Etymologically it is glossed as 'The cloud spirits'[^1], though this gloss names the beings' function in the cosmos rather than analysing a transparent compound in the Indo-European sense. The word belongs to the language families of the Kimberley and carries its meaning as a proper noun of ancestral power rather than as a descriptive term like 'rain-maker'.\n\nThe spelling **Wandjina** follows the conventional romanisation used by AIATSIS and by researchers including Ian Crawford[^2]. The cluster 'dj' records a palato-alveolar affricate close to English 'j,' though the original Aboriginal laminal articulation is not fully captured by Latin letters. The name is a proper noun of ancestral power; it names a class of beings, a set of clan estates, and a corpus of painted images and associated Law.\n\nThe ASCII form *wandjina* survives only because the early domain-name system could not carry Aboriginal characters or diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Wandjina** gives the conventional scholarly citation form with initial capitalisation. The name is Tier 2 because the restoration does not add a distinctive diacritic or special letter absent from the ASCII form.\n\nThe letter-by-letter transformation runs:\n\n- **w** → **W** — Same, capitalised\n- **a** → **a** — Same\n- **n** → **n** — Same\n- **d** → **d** — Same\n- **j** → **j** — Same\n- **i** → **i** — Same\n- **n** → **n** — Same\n- **a** → **a** — Same",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['lexicon:greek', 'lexicon:meaning', 'lexicon:breakdown', 'archetype:tier'],
      bespoke: false
    },
    pronunciation: {
      body: "The conventional reading of the name is **/wɒnˈdʒiːnə/** — a Worrorra/Ngarinyin approximation[^1].\n\nFor the English speaker, the closest approximation is: 'won-JEE-nuh' — stress the middle syllable, keep the first vowel like British 'hot,' and pronounce the final 'a' as a light open vowel. The cluster 'dj' represents a laminal palatal stop or affricate that English speakers usually render as the 'j' in 'jump,' but the Kimberley articulation is made with a flatter tongue position and a tighter release. The first syllable is short and rounded, the second is long and carries the word's principal stress, and the final syllable is short and unstressed.\n\nWandjina is Tier 2 because the ASCII form *wandjina* already represents the same phonemic sequence; no stress mark, length mark, or distinctive letter is required to recover the spoken name. The Aboriginal laminal consonants and the exact vowel qualities of the Kimberley languages are not reproducible in basic Latin script, but the scholarly romanisation records the name well enough for citation and discussion[^2].\n\nThe related forms **Wanjina** (Ngarinyin/Wunambal) and **Wanjarri** preserve the same consonant skeleton with minor spelling variation. In all cases, the middle syllable carries the stress, and the name names both individual ancestral beings and the collective cloud-and-rain powers of the Kimberley.",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['lore:pronunciation'],
      bespoke: false
    },
    domains: {
      body: "Wandjina are first of all the powers of **cloud, rain, and storm**. Their eyes are said to be the source of lightning; their halos are the clouds and storm light of the wet season; their anger is thunder and destructive cyclone. They control the monsoon that replenishes the waterholes, rivers, and coastal plains of the Kimberley after the long dry.\n\nBeyond weather, they are the **owners and managers of country**. Each Wandjina is associated with specific clan estates, sacred sites, and stretches of the ancestral journey across the Kimberley. They gave the Law that governs kinship, marriage, food restrictions, fire management, and the proper treatment of sacred places.\n\nThey are also **figures of restricted knowledge**. The right to paint, name, and speak for a Wandjina belongs to senior initiated custodians. The images are refreshed rather than replaced, and their reproduction is controlled by cultural protocol. This means that the Wandjina domain is not only meteorological or territorial but also juridical: they embody the authority through which Aboriginal people of the Kimberley maintain their relationship to land and to one another[^3].",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' },
        { citation: 'Mowaljarlai, David, and Jutta Malnic, Yorro Yorro: Everything Standing Up Alive.' }
      ],
      generatedFrom: ['bespoke:scholarly-authorship'],
      bespoke: true
    },
    symbols: {
      body: "- **Large eyes** — The source of lightning; the all-seeing gaze of the ancestors.\n- **Absence of mouth** — A sign of sacred reticence; the Wandjina do not speak casually, and their power is enacted rather than narrated.\n- **Radiating halo** — Clouds, storm light, and the luminescence of the wet-season sky.\n- **Rock shelter** — The gallery walls where the Wandjina retreated after bestowing Law, leaving their images as witnesses.\n- **Rainbow serpent** — A related power of water and transformation, sometimes associated with the same sacred geography.\n- **Waterhole and river** — The country the Wandjina replenish and protect.",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['bespoke:scholarly-authorship'],
      bespoke: true
    },
    mythology: {
      body: "Wandjina cosmology is not a single linear narrative but a body of law carried by clan estates, initiation sequences, and painted galleries. The common thread is that the Wandjina came from the sea and the sky, shaped the country, gave Law to the people, and then returned to the rock walls, where their images remain as living presences.\n\nIn one widespread account, the Wandjina travelled across the Kimberley in the ancestral past, creating the hills, rivers, waterholes, and species that define the country. Each clan holds the part of the journey that passes through its estate; the full map of their travels is known only through the combined authority of many custodians. When their work was complete, they lay down on the rock-shelter walls and left their images behind, yet they remain present in cloud and rain.\n\nThe giving of Law is central to the tradition. The Wandjina established the rules governing kinship, marriage, food restrictions, fire management, and the treatment of sacred sites. This Law is not static scripture but a living obligation transmitted through initiation, story, and country.\n\nAs the build-up gives way to the monsoon, the Wandjina are understood to be active in the thunderheads and lightning that cross the coast. Their anger can bring destructive cyclones; their blessing brings the rain that fills the waterholes and revives the country after the long dry.\n\nWandjina paintings are periodically refreshed by those authorised to do so. A faded image is not abandoned; it is a spirit in need of care. The act of repainting is a renewal of the relationship between the custodians, the ancestors, and the country[^3].",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' },
        { citation: 'Mowaljarlai, David, and Jutta Malnic, Yorro Yorro: Everything Standing Up Alive.' }
      ],
      generatedFrom: ['bespoke:scholarly-authorship'],
      bespoke: true
    },
    'original-script': {
      body: "The Aboriginal languages of the Kimberley were not written in a European sense before colonisation. The name is known orally in Worrorra, Ngarinyin, and Wunambal forms and was first rendered in Latin script by anthropologists and linguists in the twentieth century. The spelling **Wandjina** follows the conventional scholarly romanisation used by AIATSIS and by researchers such as Ian Crawford[^1].\n\nThe scholarly transliteration is *Wandjina*, giving the normalised reading /wɒnˈdʒiːnə/. Because the distinctive sounds and semantic fields of the original languages cannot be conveyed by basic Latin letters alone, and because the restoration does not add diacritics or special letters, the name is classified as Tier 2. The Unicode form remains the scholarly citation form; the ASCII form is a DNS compromise[^2].",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['original-scripts:provenance'],
      bespoke: false
    },
    'cultural-legacy': {
      body: "The Wandjina are among the most recognisable and culturally significant rock-art traditions in Australia. Their galleries in the Kimberley, including sites on the Mitchell Plateau and along the Gibb River Road, are visited under strict protocols and are sometimes closed to the public. The images have shaped Australian understandings of Indigenous art, cosmology, and land tenure, and they continue to be a focus of heritage management, repatriation discussions, and Aboriginal self-determination. Contemporary Kimberley artists work within and against this legacy, producing new art that honours ancestral authority while addressing modern audiences[^3].",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' },
        { citation: 'Mowaljarlai, David, and Jutta Malnic, Yorro Yorro: Everything Standing Up Alive.' }
      ],
      generatedFrom: ['lore:culturalLegacy'],
      bespoke: false
    },
    syncretism: {
      body: "Wandjina belief has never been a unified 'religion' in the colonial sense; it is a regional complex shared across linguistically distinct peoples of the Kimberley, including the Worrora, Ngarinyin, and Wunambal. Each group holds its own portion of the total tradition, and knowledge is stratified by age, gender, and initiation status. In the late twentieth century, artists such as David Mowaljarlai and other Kimberley elders began to explain Wandjina significance to wider Australian and international audiences, not as a syncretic new movement but as a deliberate act of cultural translation on their own terms[^1].\n\nThe Wandjina have also entered Australian popular culture, sometimes without permission, prompting ongoing debates about copyright, cultural heritage, and the right of traditional owners to control sacred imagery. These disputes are not merely legal; they concern the continuity of custodial authority and the conditions under which sacred knowledge can be shared. The Mowanjum Art Centre and other Kimberley organisations have played a leading role in asserting that authority and in educating outsiders about proper protocols[^2].\n\nWithin the Aboriginal Australian tradition, closely related names in the corpus include [[altjira|Altjira]], [[baiame|Baiame]], [[bunjil|Bunjil]], [[daramulum|Daramulum]], [[eingana|Eingana]], and [[gnowee|Gnowee]].",
      sources: [
        { citation: 'Mowaljarlai, David, and Jutta Malnic, Yorro Yorro: Everything Standing Up Alive.' },
        { citation: 'Akerman, Kim, and Tim Willing, "Mowanjum Artists of the Kimberley".' }
      ],
      generatedFrom: ['lore:syncretism', 'lexicon:pantheon'],
      bespoke: false
    },
    archaeology: {
      body: "The Kimberley region contains thousands of Wandjina rock-art sites, with major galleries at locations such as the Mitchell Plateau, the Lawley River area, and the Wunaamin Miliwundi Ranges. Radiocarbon and stylistic dating suggest the Wandjina painting tradition extends back at least several thousand years, with ongoing production and renewal into the present. The sites are protected under Western Australian heritage law and Aboriginal custodial authority[^1].",
      sources: [
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' }
      ],
      generatedFrom: ['lore:archaeology'],
      bespoke: false
    },
    'scholarly-sources': {
      body: "The account of Wandjina given in this edition rests on the witnesses and reference works listed below. The primary ethnographic and linguistic sources secure the form and meaning of the name; the secondary studies supply historical, artistic, and cultural context.\n\n- [^1] AIATSIS — Wandjina entry and Kimberley language resources.\n- [^2] Crawford, Ian M., *The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia*.\n- [^3] Mowaljarlai, David, and Jutta Malnic, *Yorro Yorro: Everything Standing Up Alive*.\n- [^4] Akerman, Kim, and Tim Willing, 'Mowanjum Artists of the Kimberley'.\n- [^5] Berndt, Ronald M., and Catherine H. Berndt, *The Speaking Land*.\n- [^6] Elkin, A. P., *Aboriginal Men of High Degree*.\n- [^7] Australian Museum and Kimberley Aboriginal Law and Culture Centre (KALACC) records.",
      sources: [
        { citation: 'AIATSIS — Wandjina entry and Kimberley language resources.' },
        { citation: 'Crawford, Ian M., The Art of the Wandjina: Aboriginal Cave Paintings in Kimberley, Western Australia.' },
        { citation: 'Mowaljarlai, David, and Jutta Malnic, Yorro Yorro: Everything Standing Up Alive.' },
        { citation: "Akerman, Kim, and Tim Willing, 'Mowanjum Artists of the Kimberley'." },
        { citation: 'Berndt, Ronald M., and Catherine H. Berndt, The Speaking Land.' },
        { citation: 'Elkin, A. P., Aboriginal Men of High Degree.' },
        { citation: 'Australian Museum and Kimberley Aboriginal Law and Culture Centre (KALACC) records.' }
      ],
      generatedFrom: ['lore:sources', 'source-catalog'],
      bespoke: false
    }
  }
};

fs.writeFileSync('platform/scholars/content/wandjina.json', JSON.stringify(scholars, null, 2));
console.log('Wrote scholars file');

// Rewrite blog content
const blogPath = 'platform/blog/content/wandjina.json';
const blog = JSON.parse(fs.readFileSync(blogPath, 'utf8'));

const newBody = `# How Wandjina got its capital back

The ASCII form *wandjina* is missing something. **Wandjina** restores the mark the scholarly tradition uses to distinguish this name from a common noun — and that mark changes how the name is read, cited, and respected. This post explains, with the full scholarly record behind it, what the restoration preserves: the Worrorra and Kimberley-language evidence, the reconstructed sound, the custodial context of the rock-art galleries, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the capital letter in Wandjina will look less like an ornament and more like what it is — recovered proper-name status, pinned back in its proper place.

## At a Glance

- **Restored name:** Wandjina
- **ASCII form:** wandjina
- **Meaning:** "The cloud spirits"
- **Domain of influence:** Cloud, Rain Spirits
- **Pantheon:** Aboriginal Australian
- **Classification:** Tier 2
- **Original script:** Oral tradition in Worrorra, Ngarinyin, and Wunambal; first rendered in Latin script by twentieth-century linguists and anthropologists

## Overview

**Wandjina** (*wandjina*) — Cloud, Rain Spirits, Aboriginal Australian — belongs to the Kimberley traditions of Western Australia. The name means "The cloud spirits".

Wandjina are the cloud-and-rain ancestors of the Kimberley: powerful beings who control the monsoon, shape the country, and enforce the Law. Their images, painted in rock shelters with large eyes, no mouth, and radiating halos, are among the most distinctive and culturally significant works of Aboriginal Australian art. They are not merely representations; in proper understanding, the paintings are sites where ancestral power remains present.

PuniCodex restores the name as **Wandjina**. The plain ASCII form *wandjina* is the conventional scholarly romanisation of the Worrorra word; the restoration capitalises the proper name. Because the Aboriginal languages of the Kimberley were not written in a European sense before colonisation, and because this restoration does not add diacritics or distinctive letters absent from the ASCII form, the name is placed in Tier 2. The Unicode form remains the philologically complete reference, while the ASCII spelling is a practical compromise for the domain-name system.

## The Name and Its Meanings

The name is attested orally in the Worrorra language of the north Kimberley coast and in related Ngarinyin and Wunambal forms such as **Wanjina**. Etymologically it is glossed as "The cloud spirits," though this gloss names the beings' function in the cosmos rather than analysing a transparent compound in the Indo-European sense. The word belongs to the language families of the Kimberley and carries its meaning as a proper noun of ancestral power rather than as a descriptive term like "rain-maker".

The spelling **Wandjina** follows the conventional romanisation used by AIATSIS and by researchers including Ian Crawford. The cluster "dj" records a palato-alveolar affricate close to English "j," though the original Aboriginal laminal articulation is not fully captured by Latin letters. The name is a proper noun of ancestral power; it names a class of beings, a set of clan estates, and a corpus of painted images and associated Law.

The ASCII form *wandjina* survives only because the early domain-name system could not carry Aboriginal characters or diacritics; it is a technological compromise, not an ancient spelling. The Unicode restoration **Wandjina** gives the conventional scholarly citation form with initial capitalisation. The name is Tier 2 because the restoration does not add a distinctive diacritic or special letter absent from the ASCII form.

## Pronunciation and Sound

The conventional reading of the name is **/wɒnˈdʒiːnə/** — a Worrorra/Ngarinyin approximation. For the English speaker, the closest approximation is: "won-JEE-nuh" — stress the middle syllable, keep the first vowel like British "hot," and pronounce the final "a" as a light open vowel.

The cluster "dj" represents a laminal palatal stop or affricate that English speakers usually render as the "j" in "jump," but the Kimberley articulation is made with a flatter tongue position and a tighter release. The first syllable is short and rounded, the second is long and carries the word's principal stress, and the final syllable is short and unstressed.

Wandjina is Tier 2 because the ASCII form *wandjina* already represents the same phonemic sequence; no stress mark, length mark, or distinctive letter is required to recover the spoken name. The Aboriginal laminal consonants and the exact vowel qualities of the Kimberley languages are not reproducible in basic Latin script, but the scholarly romanisation records the name well enough for citation and discussion.

## The Cloud-and-Rain Powers

Wandjina are first of all the powers of **cloud, rain, and storm**. Their eyes are said to be the source of lightning; their halos are the clouds and storm light of the wet season; their anger is thunder and destructive cyclone. They control the monsoon that replenishes the waterholes, rivers, and coastal plains of the Kimberley after the long dry.

Beyond weather, they are the **owners and managers of country**. Each Wandjina is associated with specific clan estates, sacred sites, and stretches of the ancestral journey across the Kimberley. They gave the Law that governs kinship, marriage, food restrictions, fire management, and the proper treatment of sacred places.

They are also **figures of restricted knowledge**. The right to paint, name, and speak for a Wandjina belongs to senior initiated custodians. The images are refreshed rather than replaced, and their reproduction is controlled by cultural protocol. This means that the Wandjina domain is not only meteorological or territorial but also juridical: they embody the authority through which Aboriginal people of the Kimberley maintain their relationship to land and to one another.

## The Wandjina in Myth and Law

Wandjina cosmology is not a single linear narrative but a body of law carried by clan estates, initiation sequences, and painted galleries. The common thread is that the Wandjina came from the sea and the sky, shaped the country, gave Law to the people, and then returned to the rock walls, where their images remain as living presences.

In one widespread account, the Wandjina travelled across the Kimberley in the ancestral past, creating the hills, rivers, waterholes, and species that define the country. Each clan holds the part of the journey that passes through its estate; the full map of their travels is known only through the combined authority of many custodians. When their work was complete, they lay down on the rock-shelter walls and left their images behind, yet they remain present in cloud and rain.

The giving of Law is central to the tradition. The Wandjina established the rules governing kinship, marriage, food restrictions, fire management, and the treatment of sacred sites. This Law is not static scripture but a living obligation transmitted through initiation, story, and country.

As the build-up gives way to the monsoon, the Wandjina are understood to be active in the thunderheads and lightning that cross the coast. Their anger can bring destructive cyclones; their blessing brings the rain that fills the waterholes and revives the country after the long dry. Wandjina paintings are periodically refreshed by those authorised to do so. A faded image is not abandoned; it is a spirit in need of care. The act of repainting is a renewal of the relationship between the custodians, the ancestors, and the country.

## Rock Art and Living Presence

The Wandjina are painted in rock shelters across the Kimberley, with major galleries on the Mitchell Plateau and along the Gibb River Road. The figures are immediately recognisable: large, dark eyes; no mouth; and a radiating halo that suggests cloud, storm light, or spiritual power.

These images are not "art" in the modern Western sense of objects made for display. They are living presences that require renewal. When a painting fades, authorised custodians repaint it, restoring the relationship between the ancestors, the country, and the community. The act of painting is itself a continuation of the Law.

Because the images are sacred and restricted, their reproduction is tightly controlled. Photographs, drawings, and commercial uses of Wandjina designs by outsiders have been the subject of legal and cultural disputes. The PuniCodex temple does not reproduce these images; it restores and contextualises the name so that searchers can find accurate, respectful information without violating custodial protocols.

## Custodians, Protocols, and Cultural Survival

The Wandjina tradition is not a closed book, but it is a governed one: access to deeper knowledge depends on relationship, initiation, and respect for country. Senior men and women hold different aspects of the Law, and the right to speak for a particular Wandjina is tied to clan estate and descent. A person from one estate does not speak for the Wandjina of another; authority is distributed across the region like the network of waterholes and rock shelters that mark the ancestral journey.

In the twentieth century, displacement, missionisation, and government policy disrupted many Kimberley communities. Yet the Wandjina tradition survived because it was carried by people who continued to visit country, repaint galleries, and transmit Law through family networks. Organisations such as the Kimberley Aboriginal Law and Culture Centre (KALACC) and the Mowanjum Art Centre have been instrumental in supporting this continuity, providing spaces where elders can teach younger generations and where artists can engage with wider audiences on their own terms.

The appearance of Wandjina imagery in Australian popular culture has raised urgent questions about copyright, cultural heritage, and the right of traditional owners to control sacred designs. These disputes highlight a broader principle: Indigenous intellectual property is not simply a matter of individual ownership but of collective custodial responsibility. Respectful engagement begins with accurate naming, proper attribution, and recognition of the authority that determines what may be shared. Outsiders who wish to learn must first learn how to listen, and how to accept that some knowledge is not offered to everyone.

This custodial context is why the PuniCodex entry emphasises textual restoration rather than image reproduction. The name Wandjina can travel across the internet in ways that the sacred paintings cannot. By restoring the capital letter and explaining the provenance of the romanisation, the temple keeps the focus on language and scholarship rather than on the unauthorised circulation of restricted designs.

## The Unicode Restoration and Tier 2 Logic

The PuniCodex tier system is mechanical, not editorial. A name is Tier 1 only if its restoration adds a distinctive feature that ASCII loses: a preserved diacritic, a long vowel, a stress mark, or a distinctive non-ASCII letter. For **Wandjina**, the only change from the ASCII *wandjina* is the initial capital letter, which marks proper-name status but does not add a phonemic or script feature absent from the ASCII form.

That does not mean the restoration is unimportant. In English and in scholarly citation, a capital letter distinguishes a proper name from a common noun. Restoring the capital to Wandjina signals that this is a named ancestral power, not a generic word. It is a small mark with a large semantic consequence.

Because the Kimberley languages were not written before colonisation, there is no original alphabet to restore. The best the domain-name system can do is preserve the conventional scholarly romanisation with its proper-name capitalisation. The Unicode form **Wandjina** therefore represents the philologically complete reference for a name that has always been oral, visual, and custodial rather than alphabetic.

## Why the Domainless Flagship Matters

A flagship temple does not require an owned domain to matter. The Wandjina entry is a flagship because it carries a full scholarly treatment: accurate pronunciation, a clear account of original-script provenance, an explanation of tier classification, and respectful contextualisation of a living tradition. The absence of an owned Unicode domain is itself instructive: it shows where the limits of the current domain-name system lie and why careful restoration of names like Wandjina is necessary even when no registrar can yet sell the ideal form.

For searchers, the domainless flagship is a destination. It gathers reliable information about a figure who might otherwise be misrepresented or reduced to a stock image. For the PuniCodex project, it is a statement that Aboriginal Australian traditions belong in the same reference architecture as Greek, Egyptian, and Norse names — not as an afterthought, but as a first-class entry with its own scholarly apparatus and custodial sensitivity.

The domainless flagship also serves a practical purpose in the search engine. When someone types "wandjina" into a browser, the PuniCodex result can direct them to a page that explains the name, its provenance, and its cultural context. Without such a destination, the query might lead to unlicensed merchandise, misidentified photographs, or superficial summaries. The temple is therefore a form of cultural stewardship in the domain-name space, filling a gap that neither registrars nor social-media platforms are designed to address.

## Conclusion

Restoring **Wandjina** does not add an accent or a special character. It adds recognition: the recognition that this string of letters names a living ancestral power, a custodial tradition, and one of the great rock-art heritages of the world. The ASCII form *wandjina* is a DNS convenience; the Unicode form **Wandjina** is the scholarly citation form, the respectful beginning of a longer conversation.

In an age when sacred images circulate as content, the Wandjina remind us that some names carry obligations. To type them correctly is a small act of care. The PuniCodex temple therefore stands as both a reference point and a gesture of respect: a place where the name is spelled as scholars spell it, where its provenance is explained, and where visitors are reminded that behind every restored Unicode string there is a human community, a country, and a Law that continues to speak.

## Related Names

Wandjina sits within a broader Aboriginal Australian corpus that includes sky, land, and ancestral figures from many language groups. [[Altjira]] is the Arrernte sky father of the Central Desert; [[Baiame]] and [[Bunjil]] are creator figures of southeastern Australia; [[Daramulum]] is a south-eastern law-giver and sky hero; [[Eingana]] is a rainbow-serpent creatrix of northern Australia; and [[Gnowee]] is a solar figure whose search for her son lights the day.

Each of these names raises similar questions about romanisation, provenance, and custodial protocol. Together they demonstrate that Aboriginal Australian mythology is not a single pantheon but a continent-wide field of related traditions, each with its own language, country, and authority structures. Wandjina is one of its most visually distinctive and culturally significant expressions.

## Sources

The scholarly record on Wandjina rests on ethnographic work by Ian Crawford, Kim Akerman, and others, as well as the writings of Kimberley elders such as David Mowaljarlai. AIATSIS maintains authoritative language and cultural entries, and the Kimberley Aboriginal Law and Culture Centre (KALACC) supports ongoing custodial authority.

Readers who wish to engage further should seek out resources produced by Kimberley Aboriginal organisations and by institutions that work with, rather than over, traditional owners. The Wandjina tradition is not a closed book, but it is a governed one: access to deeper knowledge depends on relationship, initiation, and respect for country.`;

blog.body = newBody;
fs.writeFileSync(blogPath, JSON.stringify(blog, null, 2));
console.log('Wrote blog file');
console.log('blog word count:', newBody.split(/\s+/).filter(Boolean).length);
