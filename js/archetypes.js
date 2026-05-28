/**
 * PÚNYCODEX — Central Archetype Database
 * Single source of truth for all world archetype data across the main website.
 * 24 unique archetypes (20 built temples + 4 unbuilt branded).
 */

const ARCHETYPES = [
    // ═══════════════════════════════════════════════════════════
    // DUAL-TIER (4)
    // ═══════════════════════════════════════════════════════════
    {
        id: "apollon",
        name: "Ápollōn",
        greek: "Ἀπόλλων",
        domain: "God of Light, Music & Prophecy",
        tagline: "The Far-Shooter · Lord of the Silver Bow",
        tier: "dual-tier",
        tierDetail: "dual-tier",
        pantheon: "olympian",
        folder: "apollon",
        domainUnicode: "ápollōn.com",
        domainPunycode: "xn--polln-wqa47e.com",
        domainAlt: ["apollon.com"],
        colors: { primary: "#D4AF37", secondary: "#4169E1", glow: "rgba(212,175,55,0.3)" },
        mascotPath: "/assets/images/mascots/webp/apollon_mascot.webp",
        mascotFallback: "/assets/images/mascots/apollon_mascot.png",
        logomarkPath: "/assets/images/logomarks/apollon_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "hades",
        name: "Hádēs",
        greek: "Ἅιδης",
        domain: "Lord of the Underworld",
        tagline: "The Unseen King · Warden of the Dead",
        tier: "dual-tier",
        tierDetail: "dual-tier",
        pantheon: "chthonic",
        folder: "hades",
        domainUnicode: "hádēs.com",
        domainPunycode: "xn--hds-ela5w.com",
        domainAlt: ["hades.com", "hādēs.com"],
        colors: { primary: "#8B0000", secondary: "#D4AF37", glow: "rgba(139,0,0,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hades_mascot.webp",
        mascotFallback: "/assets/images/mascots/hades_mascot.png",
        logomarkPath: "/assets/images/logomarks/hades_logomark.svg",
        built: true,
        darkPunchline: true
    },
    {
        id: "hekate",
        name: "Hekátē",
        greek: "Ἑκάτη",
        domain: "Goddess of Magic & Crossroads",
        tagline: "The Torch-Bearer · Queen of Ghosts",
        tier: "dual-tier",
        tierDetail: "dual-tier",
        pantheon: "chthonic",
        folder: "hekate",
        domainUnicode: "hekátē.com",
        domainPunycode: "xn--hekt-7na51a.com",
        domainAlt: ["hekate.com"],
        colors: { primary: "#FF6B35", secondary: "#8B00FF", glow: "rgba(255,107,53,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hekate_mascot.webp",
        mascotFallback: "/assets/images/mascots/hekate_mascot.png",
        logomarkPath: "/assets/images/logomarks/hekate_logomark.svg",
        built: true,
        darkPunchline: true
    },
    {
        id: "nike",
        name: "Níkē",
        greek: "Νίκη",
        domain: "Goddess of Victory",
        tagline: "The Winged Herald · Bringer of Triumph",
        tier: "dual-tier",
        tierDetail: "dual-tier",
        pantheon: "olympian",
        folder: "nike",
        domainUnicode: "níkē.com",
        domainPunycode: "xn--nk-nja7m.com",
        domainAlt: ["nike.com"],
        colors: { primary: "#D4AF37", secondary: "#FFFFFF", glow: "rgba(212,175,55,0.3)" },
        mascotPath: "/assets/images/mascots/webp/nike_mascot.webp",
        mascotFallback: "/assets/images/mascots/nike_mascot.png",
        logomarkPath: "/assets/images/logomarks/nike_logomark.svg",
        built: true,
        darkPunchline: false
    },

    // ═══════════════════════════════════════════════════════════
    // SINGLE-TIER TIER-1 (11)
    // ═══════════════════════════════════════════════════════════
    {
        id: "zeus",
        name: "Zeús",
        greek: "Ζεύς",
        domain: "King of the Gods",
        tagline: "Lord of the Sky · Wielder of the Thunderbolt",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "zeus",
        domainUnicode: "zeús.com",
        domainPunycode: "xn--zes-9na.com",
        domainAlt: [],
        colors: { primary: "#D4AF37", secondary: "#4169E1", glow: "rgba(212,175,55,0.3)" },
        mascotPath: "/assets/images/mascots/webp/zeus_mascot.webp",
        mascotFallback: "/assets/images/mascots/zeus_mascot.png",
        logomarkPath: "/assets/images/logomarks/zeus_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "ares",
        name: "Árēs",
        greek: "Ἄρης",
        domain: "God of War",
        tagline: "The Battle Fury · The Bloody Spear",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "ares",
        domainUnicode: "árēs.com",
        domainPunycode: "xn--rs-lia5r.com",
        domainAlt: [],
        colors: { primary: "#CD5C5C", secondary: "#8B0000", glow: "rgba(205,92,92,0.3)" },
        mascotPath: "/assets/images/mascots/webp/ares_mascot.webp",
        mascotFallback: "/assets/images/mascots/ares_mascot.png",
        logomarkPath: "/assets/images/logomarks/ares_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "aphrodite",
        name: "Aphrodītē",
        greek: "Ἀφροδίτη",
        domain: "Goddess of Love & Beauty",
        tagline: "Born of Sea-Foam · The Irresistible",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "aphrodite",
        domainUnicode: "aphrodītē.com",
        domainPunycode: "xn--aphrodt-27a8s.com",
        domainAlt: [],
        colors: { primary: "#FF69B4", secondary: "#FFB6C1", glow: "rgba(255,105,180,0.3)" },
        mascotPath: "/assets/images/mascots/webp/aphrodite_mascot.webp",
        mascotFallback: "/assets/images/mascots/aphrodite_mascot.png",
        logomarkPath: "/assets/images/logomarks/aphrodite_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "athena",
        name: "Athēnā",
        greek: "Ἀθηνᾶ",
        domain: "Goddess of Wisdom & War",
        tagline: "The Grey-Eyed Strategist · Patron of Athens",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "athena",
        domainUnicode: "athēnā.com",
        domainPunycode: "xn--athn-tsa0i.com",
        domainAlt: [],
        colors: { primary: "#4169E1", secondary: "#87CEEB", glow: "rgba(65,105,225,0.3)" },
        mascotPath: "/assets/images/mascots/webp/athena_mascot.webp",
        mascotFallback: "/assets/images/mascots/athena_mascot.png",
        logomarkPath: "/assets/images/logomarks/athena_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "demeter",
        name: "Dēmētēr",
        greek: "Δημήτηρ",
        domain: "Goddess of the Harvest",
        tagline: "The Corn Mother · Bringer of Seasons",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "demeter",
        domainUnicode: "dēmētēr.com",
        domainPunycode: "xn--dmtr-bvabb.com",
        domainAlt: [],
        colors: { primary: "#228B22", secondary: "#DAA520", glow: "rgba(34,139,34,0.3)" },
        mascotPath: "/assets/images/mascots/webp/demeter_mascot.webp",
        mascotFallback: "/assets/images/mascots/demeter_mascot.png",
        logomarkPath: "/assets/images/logomarks/demeter_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "hera",
        name: "Hēra",
        greek: "Ἥρα",
        domain: "Queen of the Gods",
        tagline: "The Golden-Throned · Guardian of Marriage",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "hera",
        domainUnicode: "hēra.com",
        domainPunycode: "xn--hra-3qa.com",
        domainAlt: [],
        colors: { primary: "#9B59B6", secondary: "#D4AF37", glow: "rgba(155,89,182,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hera_mascot.webp",
        mascotFallback: "/assets/images/mascots/hera_mascot.png",
        logomarkPath: "/assets/images/logomarks/hera_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "hermes",
        name: "Hermēs",
        greek: "Ἑρμῆς",
        domain: "Messenger of the Gods",
        tagline: "The Soul-Guide · Lord of Boundaries",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "hermes",
        domainUnicode: "hermēs.com",
        domainPunycode: "xn--herms-lza.com",
        domainAlt: [],
        colors: { primary: "#32CD32", secondary: "#D4AF37", glow: "rgba(50,205,50,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hermes_mascot.webp",
        mascotFallback: "/assets/images/mascots/hermes_mascot.png",
        logomarkPath: "/assets/images/logomarks/hermes_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "hephaistos",
        name: "Hēphaistos",
        greek: "Ἥφαιστος",
        domain: "God of the Forge",
        tagline: "The Lame-Smith · Worker of Wonder",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "hephaistos",
        domainUnicode: "hēphaistos.com",
        domainPunycode: "xn--hphaistos-bhb.com",
        domainAlt: [],
        colors: { primary: "#FF4500", secondary: "#8B4513", glow: "rgba(255,69,0,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hephaistos_mascot.webp",
        mascotFallback: "/assets/images/mascots/hephaistos_mascot.png",
        logomarkPath: "/assets/images/logomarks/hephaistos_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "hestia",
        name: "Hestiā",
        greek: "Ἑστία",
        domain: "Goddess of the Hearth",
        tagline: "The Eternal Flame · Center of the Home",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "hestia",
        domainUnicode: "hestiā.com",
        domainPunycode: "xn--hesti-jwa.com",
        domainAlt: [],
        colors: { primary: "#FF6B35", secondary: "#FFD700", glow: "rgba(255,107,53,0.3)" },
        mascotPath: "/assets/images/mascots/webp/hestia_mascot.webp",
        mascotFallback: "/assets/images/mascots/hestia_mascot.png",
        logomarkPath: "/assets/images/logomarks/hestia_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "poseidon",
        name: "Poseidōn",
        greek: "Ποσειδῶν",
        domain: "Lord of the Sea",
        tagline: "The Earth-Shaker · Master of Waves",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "poseidon",
        domainUnicode: "poseidōn.com",
        domainPunycode: "xn--poseidn-bmb.com",
        domainAlt: [],
        colors: { primary: "#1E90FF", secondary: "#00CED1", glow: "rgba(30,144,255,0.3)" },
        mascotPath: "/assets/images/mascots/webp/poseidon_mascot.webp",
        mascotFallback: "/assets/images/mascots/poseidon_mascot.png",
        logomarkPath: "/assets/images/logomarks/poseidon_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "persephone",
        name: "Persephonē",
        greek: "Περσεφόνη",
        domain: "Queen of the Underworld",
        tagline: "The Maiden · The Iron Queen",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "chthonic",
        folder: "persephone",
        domainUnicode: "persephonē.com",
        domainPunycode: "xn--persephon-jhb.com",
        domainAlt: [],
        colors: { primary: "#DC143C", secondary: "#8B008B", glow: "rgba(220,20,60,0.3)" },
        mascotPath: "/assets/images/mascots/webp/persephone_mascot.webp",
        mascotFallback: "/assets/images/mascots/persephone_mascot.png",
        logomarkPath: "/assets/images/logomarks/persephone_logomark.svg",
        built: true,
        darkPunchline: true
    },
    {
        id: "prometheus",
        name: "Promētheus",
        greek: "Προμηθεύς",
        domain: "The Fire-Bringer",
        tagline: "The Forethinker · Champion of Mortals",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "titan",
        folder: "prometheus",
        domainUnicode: "promētheus.com",
        domainPunycode: "xn--promtheus-ehb.com",
        domainAlt: [],
        colors: { primary: "#FF4500", secondary: "#4169E1", glow: "rgba(255,69,0,0.3)" },
        mascotPath: "/assets/images/mascots/webp/prometheus_mascot.webp",
        mascotFallback: "/assets/images/mascots/prometheus_mascot.png",
        logomarkPath: "/assets/images/logomarks/prometheus_logomark.svg",
        built: true,
        darkPunchline: false
    },

    // ═══════════════════════════════════════════════════════════
    // SINGLE-TIER TIER-2 (7)
    // ═══════════════════════════════════════════════════════════
    {
        id: "artemis",
        name: "Ártemis",
        greek: "Ἄρτεμις",
        domain: "Goddess of the Hunt",
        tagline: "The Virgin Huntress · Lady of Wild Beasts",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "artemis",
        domainUnicode: "ártemis.com",
        domainPunycode: "xn--rtemis-ota.com",
        domainAlt: [],
        colors: { primary: "#C0C0C0", secondary: "#228B22", glow: "rgba(192,192,192,0.3)" },
        mascotPath: "/assets/images/mascots/webp/artemis_mascot.webp",
        mascotFallback: "/assets/images/mascots/artemis_mascot.png",
        logomarkPath: "/assets/images/logomarks/artemis_logomark.svg",
        built: true,
        darkPunchline: true
    },
    {
        id: "atlas",
        name: "Átlas",
        greek: "Ἄτλας",
        domain: "The Titan of Endurance",
        tagline: "The World-Bearer · Guardian of the Western Edge",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "titan",
        folder: "atlas",
        domainUnicode: "átlas.com",
        domainPunycode: "xn--tlas-4na.com",
        domainAlt: [],
        colors: { primary: "#CD7F32", secondary: "#8B4513", glow: "rgba(205,127,50,0.3)" },
        mascotPath: "/assets/images/mascots/webp/atlas_mascot.webp",
        mascotFallback: "/assets/images/mascots/atlas_mascot.png",
        logomarkPath: "/assets/images/logomarks/atlas_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "dionysos",
        name: "Diónysos",
        greek: "Διόνυσος",
        domain: "God of Wine & Ecstasy",
        tagline: "The Liberator · Twice-Born",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: "dionysos",
        domainUnicode: "diónysos.com",
        domainPunycode: "xn--dinysos-m0a.com",
        domainAlt: [],
        colors: { primary: "#800080", secondary: "#DAA520", glow: "rgba(128,0,128,0.3)" },
        mascotPath: "/assets/images/mascots/webp/dionysos_mascot.webp",
        mascotFallback: "/assets/images/mascots/dionysos_mascot.png",
        logomarkPath: "/assets/images/logomarks/dionysos_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "medousa",
        name: "Médousa",
        greek: "Μέδουσα",
        domain: "The Gorgon",
        tagline: "The Petrifying · Guardian of the Threshold",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "other",
        folder: "medousa",
        domainUnicode: "médousa.com",
        domainPunycode: "xn--mdousa-bva.com",
        domainAlt: [],
        colors: { primary: "#2E8B57", secondary: "#556B2F", glow: "rgba(46,139,87,0.3)" },
        mascotPath: "/assets/images/mascots/webp/medusa_mascot.webp",
        mascotFallback: "/assets/images/mascots/medusa_mascot.png",
        logomarkPath: "/assets/images/logomarks/medusa_logomark.svg",
        built: true,
        darkPunchline: false
    },
    {
        id: "ker",
        name: "Kēr",
        greek: "Κήρ",
        domain: "Spirit of Violent Death",
        tagline: "The Dark Angel · Minister of Doom",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "chthonic",
        folder: null,
        domainUnicode: "kēr.com",
        domainPunycode: "xn--kr-wma.com",
        domainAlt: [],
        colors: { primary: "#4A4A4A", secondary: "#8B0000", glow: "rgba(74,74,74,0.3)" },
        mascotPath: "/assets/images/mascots/webp/ker_mascot.webp",
        mascotFallback: "/assets/images/mascots/ker_mascot.png",
        logomarkPath: "/assets/images/logomarks/ker_logomark.svg",
        built: false,
        darkPunchline: true
    },
    {
        id: "odinn",
        name: "Óðinn",
        greek: "Óðinn",
        domain: "Allfather",
        tagline: "The Frenzied One · Lord of the Hanged",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "norse",
        folder: null,
        domainUnicode: "ódinn.com",
        domainPunycode: "xn--dinn-pqa.com",
        domainAlt: [],
        colors: { primary: "#5C5C5C", secondary: "#4169E1", glow: "rgba(92,92,92,0.3)" },
        mascotPath: "/assets/images/mascots/webp/odinn_mascot.webp",
        mascotFallback: "/assets/images/mascots/odinn_mascot.png",
        logomarkPath: "/assets/images/logomarks/odinn_logomark.svg",
        built: false,
        darkPunchline: true
    },
    {
        id: "selene",
        name: "Selene",
        greek: "Σελήνη",
        domain: "Goddess of the Moon",
        tagline: "The Radiant · Driver of the Silver Chariot",
        tier: "tier-1",
        tierDetail: "single-tier",
        pantheon: "olympian",
        folder: null,
        domainUnicode: "selene.com",
        domainPunycode: "selene.com",
        domainAlt: [],
        colors: { primary: "#E6E6FA", secondary: "#C0C0C0", glow: "rgba(230,230,250,0.3)" },
        mascotPath: "/assets/images/mascots/webp/selene_mascot.webp",
        mascotFallback: "/assets/images/mascots/selene_mascot.png",
        logomarkPath: "/assets/images/logomarks/selene_logomark.svg",
        built: false,
        darkPunchline: false
    },
    {
        id: "thorr",
        name: "Þórr",
        greek: "Þórr",
        domain: "God of Thunder",
        tagline: "The Thunderer · Protector of Midgard",
        tier: "tier-2",
        tierDetail: "single-tier",
        pantheon: "norse",
        folder: null,
        domainUnicode: "þórr.com",
        domainPunycode: "xn--rr-4ja7b.com",
        domainAlt: [],
        colors: { primary: "#4169E1", secondary: "#C0C0C0", glow: "rgba(65,105,225,0.3)" },
        mascotPath: "/assets/images/mascots/webp/thorr_mascot.webp",
        mascotFallback: "/assets/images/mascots/thorr_mascot.png",
        logomarkPath: "/assets/images/logomarks/thorr_logomark.svg",
        built: false,
        darkPunchline: false
    }
];

// ═══════════════════════════════════════════════════════════
// DERIVED DATA & HELPERS
// ═══════════════════════════════════════════════════════════

const ARCHETYPES_BY_TIER = {
    "tier-1": ARCHETYPES.filter(a => a.tier === "tier-1"),
    "tier-2": ARCHETYPES.filter(a => a.tier === "tier-2"),
    "dual-tier": ARCHETYPES.filter(a => a.tier === "dual-tier")
};

const ARCHETYPES_BY_PANTHEON = {
    "olympian": ARCHETYPES.filter(a => a.pantheon === "olympian"),
    "chthonic": ARCHETYPES.filter(a => a.pantheon === "chthonic"),
    "titan": ARCHETYPES.filter(a => a.pantheon === "titan"),
    "norse": ARCHETYPES.filter(a => a.pantheon === "norse"),
    "other": ARCHETYPES.filter(a => a.pantheon === "other")
};

const BUILT_ARCHETYPES = ARCHETYPES.filter(a => a.built);
const UNBUILT_ARCHETYPES = ARCHETYPES.filter(a => !a.built);

function getArchetypeById(id) {
    return ARCHETYPES.find(a => a.id === id) || null;
}

function getRelatedArchetypes(archetypeId, count = 3) {
    const archetype = getArchetypeById(archetypeId);
    if (!archetype) return [];
    return ARCHETYPES
        .filter(a => a.id !== archetypeId && a.pantheon === archetype.pantheon)
        .slice(0, count);
}

function getArchetypeUrl(archetype) {
    if (!archetype.built || !archetype.folder) return null;
    return `/sites/${archetype.folder}/`;
}

// Expose globally
if (typeof window !== 'undefined') {
    window.ARCHETYPES = ARCHETYPES;
    window.ARCHETYPES_BY_TIER = ARCHETYPES_BY_TIER;
    window.ARCHETYPES_BY_PANTHEON = ARCHETYPES_BY_PANTHEON;
    window.BUILT_ARCHETYPES = BUILT_ARCHETYPES;
    window.UNBUILT_ARCHETYPES = UNBUILT_ARCHETYPES;
    window.getArchetypeById = getArchetypeById;
    window.getRelatedArchetypes = getRelatedArchetypes;
    window.getArchetypeUrl = getArchetypeUrl;
}
