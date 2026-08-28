const fs = require('fs');

const scholarsPath = './platform/scholars/content/gnowee.json';
const blogPath = './platform/blog/content/gnowee.json';

const oldScholars = JSON.parse(fs.readFileSync(scholarsPath, 'utf8'));
const oldBlog = JSON.parse(fs.readFileSync(blogPath, 'utf8'));

// Scholars rewrite
const s = oldScholars.sections;

const theNameBody =
`The name **Gnowee** is attested as a Woiwurrung proper noun in ethnographic records from the Melbourne region. It identifies the Sun Woman of the Wurundjeri-willam clan. The name does not decompose transparently into a common noun in the surviving Woiwurrung vocabulary; it functions as a theonym, a personal name attached to a cosmological figure[^1].

The PuniCodex restoration **Gnowee** capitalizes the conventional spelling, marking it as a proper name. The ASCII form *gnowee* is a technological compromise: the domain-name system originally accepted only the basic Latin alphabet and could not encode the capitalization conventions by which the name is cited in English-language scholarship. The Unicode restoration therefore gives the scholarly citation form, while the ASCII string is a DNS-compatible alias.

Because no diacritic, length mark, or distinctive letter is required to recover the spoken name from the ASCII form, the entry is classified Tier 2. The transformation is straightforward:

- **g** → **G** — Same, capitalized
- **n** → **n** — Same
- **o** → **o** — Same
- **w** → **w** — Same
- **e** → **e** — Same
- **e** → **e** — Same

The spoken form is approximately 'GNOH-wee', with stress on the first syllable. Some Woiwurrung-language pronunciations render the initial cluster closer to 'NOH-wee' or 'NYOH-wee', reflecting the original phonology now only partially recoverable from colonial-era transcriptions[^2].

The name **Gnowee** is a Woiwurrung theonym. It does not appear to derive transparently from a known common noun in the surviving Woiwurrung lexicon, and it should be treated as a proper name rather than as a compound. The spelling follows the conventions used by nineteenth-century recorders of the Melbourne-region languages and later standardized in Aboriginal-myth reference works[^1].

Colonial-era orthographies for Victorian languages were inconsistent, and the same figure appears in print with minor spelling variants. The form **Gnowee** is the one most widely used in twentieth-century collections and in contemporary Wurundjeri educational materials. No pre-contact written form exists; the name survives only in Latin transcription[^3].`;

const newScholars = {
  entryId: oldScholars.entryId,
  contentVersion: oldScholars.contentVersion,
  sections: {
    overview: s.overview,
    'the-name': {
      body: theNameBody,
      sources: [
        { citation: "Massola, Aldo, Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia, Lansdowne Press, 1968." },
        { citation: "Reed, A. W., Aboriginal Myths, Legends and Fables, Reed Books, 1982." },
        { citation: "AIATSIS — Australian Institute of Aboriginal and Torres Strait Islander Studies." }
      ],
      generatedFrom: [
        "lexicon:greek",
        "lexicon:meaning",
        "lexicon:breakdown",
        "archetype:tier",
        "lore:etymology"
      ],
      bespoke: s['the-name'].bespoke
    },
    pronunciation: s.pronunciation,
    domains: s.domains,
    symbols: s.symbols,
    mythology: s.mythology,
    'original-script': s['original-script'],
    syncretism: s.syncretism,
    'cultural-legacy': s['cultural-legacy'],
    archaeology: s.archaeology,
    'scholarly-sources': {
      body: "The account of Gnowee given in this edition rests on the witnesses and reference works listed below. Lexica and etymological dictionaries secure the form and meaning of the name; the literary and religious texts supply the narrative evidence. Contemporary cultural authority rests with the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation, and any public use of the narrative should be checked against its guidance.\n\n- [^1] Massola, Aldo, *Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia*, Lansdowne Press, 1968.\n- [^2] Reed, A. W., *Aboriginal Myths, Legends and Fables*, Reed Books, 1982.\n- [^3] Parker, K. Langloh, *Australian Legendary Tales*, 1896.\n- [^4] AIATSIS — Australian Institute of Aboriginal and Torres Strait Islander Studies.\n- [^5] Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation.\n- [^6] William Thomas, Assistant Protector of Aborigines, Port Phillip District, nineteenth-century field notes.\n- [^7] Berndt, Ronald M. and Berndt, Catherine H., *The Speaking Land: Myth and Story in Aboriginal Australia*, Penguin, 1994.",
      sources: [
        { citation: "Massola, Aldo, Bunjil's Cave: Myths, Legends and Superstitions of the Aborigines of South-East Australia, Lansdowne Press, 1968." },
        { citation: "Reed, A. W., Aboriginal Myths, Legends and Fables, Reed Books, 1982." },
        { citation: "Parker, K. Langloh, Australian Legendary Tales, 1896." },
        { citation: "AIATSIS — Australian Institute of Aboriginal and Torres Strait Islander Studies." },
        { citation: "Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation." },
        { citation: "William Thomas, Assistant Protector of Aborigines, Port Phillip District, nineteenth-century field notes." },
        { citation: "Berndt, Ronald M. and Berndt, Catherine H., The Speaking Land: Myth and Story in Aboriginal Australia, Penguin, 1994." }
      ],
      generatedFrom: ["lore:sources", "source-catalog"],
      bespoke: false
    }
  }
};

fs.writeFileSync(scholarsPath, JSON.stringify(newScholars, null, 2));

// Blog rewrite
const blogBody = `# How Gnowee lit the sky: restoring the Wurundjeri Sun Woman

The ASCII form *gnowee* looks like any other lowercase string. **Gnowee** restores something small but decisive: the capital letter that tells us this is a proper name, a person, a figure of Wurundjeri culture. In this post we explain what the name preserves, what the myth says, why the story continues to matter, and why a domain-name restoration can be an act of cultural citation.

## At a Glance

- **Restored name:** Gnowee
- **ASCII form:** gnowee
- **Meaning:** The sun
- **Domain of influence:** Sun Goddess, Aboriginal
- **Pantheon:** Aboriginal (Wurundjeri / Woiwurrung, Kulin nation)
- **Classification:** Tier 2
- **Original script:** Latin transcription; Woiwurrung was an oral language before colonization

## The Country and the People

Gnowee belongs to the Wurundjeri people of the Woiwurrung language group, part of the Kulin nation whose country covers much of what is now central Victoria, Australia. The Wurundjeri-willam clan held responsibility for the land along the Yarra River and its tributaries, including the river flats, forests, and volcanic plains around present-day Melbourne. For tens of thousands of years the Woiwurrung language named the plants, animals, seasons, and celestial bodies of this country. The sun, in the Woiwurrung telling, is not an abstract force but a person with a story: Gnowee, the woman who became the sun.

Understanding Gnowee begins with understanding country. In Aboriginal cosmology, country is not merely a backdrop for myth; it is the living context in which the story makes sense. The stringybark that Gnowee uses for her torch is the same stringybark that grows in Wurundjeri forests. The yams she digs are the same yams that fed her people. The dark earth that once hid her son is the soil of Wurundjeri land. The myth is therefore a map of relationship as much as a map of the sky.

## The Name and Its Meaning

The name **Gnowee** is a Woiwurrung proper noun. It does not decompose transparently into a common noun in the surviving vocabulary; it functions as a theonym, a personal name attached to the Sun Woman figure. The spelling follows the conventions used by nineteenth-century recorders of the Melbourne-region languages and later standardized in Aboriginal-myth reference works such as Massola's *Bunjil's Cave* and Reed's *Aboriginal Myths, Legends and Fables*.

The meaning recorded for the name is straightforward and profound: Gnowee means the sun. In many mythologies the sun is named after the deity who embodies it; in the Woiwurrung telling the reverse is also true: the deity is named after the light she carries. The name thus collapses the distinction between person and phenomenon. To say Gnowee is to say the sun, and to say the sun is to invoke the woman still searching for her child.

The PuniCodex restoration **Gnowee** capitalizes the conventional spelling, marking it as a proper name. The ASCII form *gnowee* is a technological compromise: the domain-name system originally accepted only the basic Latin alphabet and could not encode the capitalization conventions by which the name is cited in English-language scholarship. The Unicode restoration therefore gives the scholarly citation form, while the ASCII string is a DNS-compatible alias.

The letter-by-letter transformation runs:

- **g** → **G** — Same, capitalized
- **n** → **n** — Same
- **o** → **o** — Same
- **w** → **w** — Same
- **e** → **e** — Same
- **e** → **e** — Same

The spoken form is approximately 'GNOH-wee', with stress on the first syllable. Some Woiwurrung pronunciations render the initial cluster closer to 'NOH-wee' or 'NYOH-wee'. Colonial-era orthographies were inconsistent, and minor spelling variants appear in print, but **Gnowee** is the form most widely used in contemporary Wurundjeri educational materials.

Because no diacritic, length mark, or distinctive letter is required to recover the spoken name from the ASCII form, the entry is classified Tier 2. This is not a judgment of cultural importance. The Woiwurrung language was not written before colonization, and the colonial transcriptions that survive do not record phonemic length, tone, or stress for this name. Where later sources do not justify adding diacritics, PuniCodex does not invent them. The restoration is therefore minimal but accurate: it gives the conventional scholarly spelling with the capitalization the name deserves.

## The Myth in Detail

The central myth of Gnowee is the story of the woman who became the sun. In the time before light, Gnowee left her son sleeping beneath a tree while she went out to dig for yams. She wandered too far, and when she turned back she could no longer find her camp. In despair she made a great torch of stringybark, climbed into the sky, and began to travel across it, searching for him. That torch is the sun; she carries it still.

The myth explains not only the origin of the sun but also its movement. Gnowee cannot rest until she finds her son, so she travels continuously across the sky. When the torch burns low she stops to kindle a fresh one, and that interval is night. At dawn she lifts the new torch and the search resumes. The narrative thus binds cosmology to maternal grief, fire technology to daily routine, and the sky to the moral landscape of country.

The story also encodes practical teachings. A child must not be left unwatched. Fire must be gathered, tended, and passed on. A person's actions can have consequences that last forever. In contemporary Wurundjeri-led education, the narrative is used to teach both cultural heritage and ecological responsibility. The sun is therefore not an indifferent orb but the tool of a mother's ongoing search, and every sunrise is the relighting of a bark torch.

## Symbols and Their Meanings

The symbols associated with Gnowee are drawn from the everyday life of Wurundjeri people and enlarged to cosmic scale. The bark torch is the most important: a domestic fire carried across the heavens. The stringybark from which it is made links the sun to the eucalyptus forests of Wurundjeri country. The digging stick, the tool that drew her away from her child, is another recurring image, a reminder of how ordinary tasks can lead to extraordinary consequences. The sky path itself is interpreted as the track of a continuing search, and the darkness below is the earth that once hid her son and that she now lights from above.

Together these symbols form a coherent visual language. They teach that the cosmos is continuous with the home, that fire is a responsibility, and that grief can be transformed into a source of light for the whole world. In public art and educational materials the torch remains the most common emblem of Gnowee, a sign of renewable light and of the persistence of care.

## Cultural Significance and Contemporary Life

The Gnowee story is one of the best-known narratives of the Wurundjeri people. It is told in Victorian schools, on Wurundjeri-led country walks, and in materials produced by the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation. The figure has also inspired Australian children's literature, public art, and environmental education, where the sun-as-torch remains a potent image of renewable light and searching care.

In contemporary Victoria, Gnowee appears not as a generic Aboriginal sun goddess but as a specifically Woiwurrung cultural teaching. This distinction matters. Aboriginal sacred narratives are owned by the communities to which they belong, and the authority to tell them rests with those communities. Any scholarly or public use of the Gnowee story should be checked against the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation, the contemporary cultural authority for Wurundjeri country.

The story also carries wider resonances. It offers an Indigenous Australian perspective on the sun, one that predates and outlasts colonial frameworks. It connects astronomy with ethics, ecology with emotion, and daily life with cosmic time. For educators, artists, and visitors to Wurundjeri country, Gnowee provides a way of talking about the sun that is both scientifically accurate and culturally grounded.

## The Unicode Restoration

PuniCodex restores the name as **Gnowee**. The plain ASCII form *gnowee* preserves the letters of the Woiwurrung name but drops the proper-name capitalization. Because the surviving sources do not record distinctive diacritics, length marks, or special letters for this name, the restoration is placed in Tier 2. The Unicode form remains the scholarly citation form, while the ASCII spelling is a practical convenience for the domain-name system.

Unicode restoration is not only a technical exercise. It is a way of asserting that a name belongs in the same textual ecosystem as any other proper name. When a browser or a search engine displays **Gnowee**, it performs a small act of recognition: the sun is a person, the myth is a text, the culture is part of the scholarly record. The capital letter is the minimal unit of that recognition.

The restoration also makes visible the limits of the domain-name system. DNS was designed for a restricted character set, and although internationalized domain names now allow many scripts, the compromise of lowercasing remains common. PuniCodex documents that compromise rather than hiding it. The ASCII form is listed as a practical alias, and the Unicode form is given as the citation form. That pairing is honest about both the technology and the name.

## Why a Domainless Flagship Still Matters

This flagship does not currently resolve to an owned domain. That is not an accident of neglect; it is a consequence of the project's commitment to represent names accurately even when the ideal domain is unavailable. A domainless flagship still matters because the lexicon is not only a sales catalogue. It is a scholarly record of names, a set of temples, and a public archive of restorations.

Gnowee's temple stands as a placeholder for the possibility that the name may one day be properly domained. Until then, the page performs other work. It preserves the correct spelling and citation. It explains the myth and its cultural context. It directs readers to the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation as the authoritative source. It keeps the name visible in search results, in the API, and in the PuniCodex corpus.

A domainless flagship also models ethical stewardship. Not every culturally significant name should be treated first and foremost as a commercial asset. By presenting Gnowee as a flagship without an attached lease slot, PuniCodex signals that some entries are held for citation, education, and cultural authority rather than for immediate monetization. The absence of a domain is itself a kind of metadata: it says that this name is not currently for sale, but it is still worth knowing.

## The Sun as Ethical Teacher

One of the reasons the Gnowee story endures is that it is not only an explanation but also an ethics lesson. In the myth, a single lapse of attention, a moment when a mother turns back too late, sets in motion a cosmic separation. The story therefore teaches the gravity of care. Children must be watched. Kin must not be abandoned. A small failure on earth can have consequences that reach the sky. This is not presented as punishment but as the structure of a world in which actions resonate beyond their immediate moment.

Fire, too, is treated as a moral responsibility. Gnowee does not steal fire or receive it as a gift from another being; she makes her torch from bark and tends it as she travels. That detail reframes fire not as a one-time acquisition but as a continuous practice. The torch must be fed, guarded, and renewed. In Wurundjeri country, where fire was used to manage grasslands, forests, and food resources, this teaching had practical force. Today it remains a powerful metaphor for sustainable energy and for the duty to keep cultural knowledge burning.

## Gnowee and Aboriginal Astronomy

Aboriginal astronomy is one of the oldest continuing scientific traditions in the world. Across Australia, Aboriginal observers have tracked the sun, moon, planets, and stars for millennia, encoding observations in story, ceremony, and land management. The Gnowee narrative belongs to this tradition. It accounts for the sun's daily motion, the alternation of day and night, and the perception that the sun moves across the sky rather than remaining fixed.

What distinguishes the narrative from a merely functional almanac is its personification of the sun. Gnowee is not a clock; she is a mother. The emotion in the story does not contradict its astronomical content; it gives that content human meaning. Dawn is not simply a phase; it is the relighting of a search. Dusk is not simply a sunset; it is the guttering of a torch that will be renewed. In this way the myth preserves both empirical observation and existential significance.

It is important not to conflate Gnowee with solar figures from other Aboriginal nations. The Yolngu, Arrernte, Noongar, and many other language groups have their own sun stories, each owned by its own custodians. Comparative study is valuable, but it must respect the local provenance of each narrative. Gnowee is Woiwurrung, and her story should be cited as such.

## Holding the Story Responsibly

In an era of open data and global search, it is easy to treat a myth as a free-floating text. For Aboriginal communities, however, a story like Gnowee's is not public domain in the usual sense. It is cultural property, held by the Wurundjeri people and transmitted according to protocols that may restrict who can tell it, when, and how. Responsible use therefore begins with asking permission and with deferring to the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation.

For researchers, teachers, and artists, this means more than adding a citation. It means reading the story in context, avoiding sensational or romantic framing, and being clear about the limits of colonial-era sources. It means acknowledging that the fullest version of the narrative exists in Wurundjeri oral tradition, not in any single book. And it means supporting the return of cultural materials to their communities where that is sought.

PuniCodex attempts to model this responsibility by treating Gnowee as a flagship entry with clear attribution, a link to cultural authority, and no fabricated detail. The entry does not claim to own the story; it claims only to point toward it.

## Sources and Cultural Authority

The Gnowee narrative is preserved primarily in oral tradition and in nineteenth- and twentieth-century ethnographic records from the Melbourne region. The fullest published collections are Massola's *Bunjil's Cave* and Reed's *Aboriginal Myths, Legends and Fables*. Field notes by William Thomas, Assistant Protector of Aborigines in the Port Phillip District, also record Woiwurrung stories. Parker and other early collectors provide additional comparative context.

Because Aboriginal sacred narratives are owned by the communities to which they belong, any scholarly or public use of the Gnowee story should be checked against the Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation, which holds cultural authority for the narrative. PuniCodex cites this material as cultural heritage, not as generic world mythology, and encourages readers to seek out Wurundjeri-led interpretations. AIATSIS and the broader scholarly literature on Aboriginal mythology, such as the Berndts' *The Speaking Land*, offer further methodological and comparative resources.

## Conclusion

Restoring **Gnowee** from *gnowee* is a small change with a larger meaning. It marks the name as a proper noun, a person, a figure with a continuing cultural home. It records the Woiwurrung Sun Woman not as an anonymous lowercase string but as a named entity with a myth, a country, and a community of custodians. In a domain-name system that once forced every proper name into lowercase anonymity, that capital **G** is a modest act of recognition: the sun, it says, is a woman still searching.`;

const newBlog = {
  entryId: oldBlog.entryId,
  title: oldBlog.title,
  description: oldBlog.description,
  keywords: oldBlog.keywords,
  tags: oldBlog.tags,
  author: oldBlog.author,
  publishedAt: oldBlog.publishedAt,
  body: blogBody,
  readingTime: oldBlog.readingTime
};

fs.writeFileSync(blogPath, JSON.stringify(newBlog, null, 2));

const verifyS = JSON.parse(fs.readFileSync(scholarsPath, 'utf8'));
const verifyB = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
console.log('scholar sections:', Object.keys(verifyS.sections).join(', '));
console.log('blog words:', verifyB.body.split(/\s+/).filter(Boolean).length);
