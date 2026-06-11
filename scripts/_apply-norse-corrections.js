const fs = require('fs');
const { execSync } = require('child_process');
const file = 'scripts/batch-update-galleries.js';
let src = fs.readFileSync(file, 'utf8');

// Odinn full replacement
const oldOdinn = `  odinn: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Odin_the_Wanderer.jpg/960px-Odin_the_Wanderer.jpg.webp', alt: 'Odin the Wanderer by Georg von Rosen, 1886. Swedish National Museum.', caption: '<strong>Odin the Wanderer</strong> — Georg von Rosen, 1886. The All-Father in his blue cloak, staff in hand, wandering the mortal world in disguise.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Odin_Ravens.jpg/960px-Odin_Ravens.jpg.webp', alt: 'Odin with Huginn and Muninn, by Lorenz Frølich, 1895.', caption: '<strong>Odin with Huginn and Muninn</strong> — Lorenz Frølich, 1895. Thought and Memory perch on his shoulders, flying each dawn to report on the world.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Odin_Sacrifice.jpg/960px-Odin_Sacrifice.jpg.webp', alt: 'Odin hanging from Yggdrasil, by Lorenz Frølich, 1895.', caption: '<strong>Odin\'s Sacrifice</strong> — Lorenz Frølich, 1895. The god hangs from the World Tree for nine days, spear in his side, to win the runes.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Valkyries_Lorenz_Frolich.jpg/960px-Valkyries_Lorenz_Frolich.jpg.webp', alt: 'The Valkyries by Lorenz Frølich, 1895.', caption: '<strong>The Valkyries</strong> — Lorenz Frølich, 1895. Odin\'s choosers of the slain, riding through battlefields on winged horses.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Wodan_Heilt_Balan.jpg/960px-Wodan_Heilt_Balan.jpg.webp', alt: 'Odin healing Baldr\'s horse, by Emil Doepler, 1905.', caption: '<strong>Odin Healing Baldr\'s Horse</strong> — Emil Doepler, 1905. The All-Father as shaman and healer, wielding ancient magic.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Odin_Thor_Loki.jpg/960px-Odin_Thor_Loki.jpg.webp', alt: 'Odin, Thor, and Loki, by Lorenz Frølich, 1895.', caption: '<strong>Odin, Thor, and Loki</strong> — Lorenz Frølich, 1895. The three most powerful beings in Asgard: wisdom, strength, and chaos.' },
  ]},`;

const newOdinn = `  odinn: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Odin_%281825-1827%29_by_H._E._Freund.jpg/960px-Odin_%281825-1827%29_by_H._E._Freund.jpg.webp', alt: 'Odin by H. E. Freund, 1825–1827. Thorvaldsens Museum, Copenhagen.', caption: '<strong>Odin</strong> — H. E. Freund, 1825–27. The All-Father stands in solemn power, spear Gungnir in hand, the source of Norse kingship.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Detalj_av_statyn_Odin_av_Bengt_Erland_Fogelberg%2C_Nationalmuseum.jpg/960px-Detalj_av_statyn_Odin_av_Bengt_Erland_Fogelberg%2C_Nationalmuseum.jpg.webp', alt: 'Detail of the statue Odin by Bengt Erland Fogelberg, Nationalmuseum, Stockholm.', caption: '<strong>Odin of Fogelberg</strong> — Bengt Erland Fogelberg, 1830. Carrara marble capturing the lord of the gods with Huginn and Muninn on his helmet.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Odin_yggdrasil.jpg/960px-Odin_yggdrasil.jpg.webp', alt: 'Odin sacrificing himself upon Yggdrasil, modern illustration.', caption: '<strong>Odin upon Yggdrasil</strong> — The god hangs from the World Tree for nine nights, spear-wounded, to seize the secret of the runes.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Lorenz_Fr%C3%B8lich%2C_Odin%2C_1844%2C_KKSgb5293%2C_Statens_Museum_for_Kunst.jpg/960px-Lorenz_Fr%C3%B8lich%2C_Odin%2C_1844%2C_KKSgb5293%2C_Statens_Museum_for_Kunst.jpg.webp', alt: 'Odin by Lorenz Frølich, 1844. Statens Museum for Kunst, Copenhagen.', caption: '<strong>Odin</strong> — Lorenz Frølich, 1844. The Danish master\'s vision of the one-eyed god in watercolor and ink.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Wodan_heilt_Balders_Pferd_by_Emil_Doepler.jpg/960px-Wodan_heilt_Balders_Pferd_by_Emil_Doepler.jpg.webp', alt: 'Wodan heals Baldr\'s horse by Emil Doepler, c. 1905.', caption: '<strong>Wodan Heals Baldr\'s Horse</strong> — Emil Doepler, c. 1905. The All-Father as shaman and healer, wielding ancient Germanic magic.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Valkyrie_by_Arbo.jpg/960px-Valkyrie_by_Arbo.jpg.webp', alt: 'Valkyrie by Peter Nicolai Arbo, 1864. Nationalmuseum, Stockholm.', caption: '<strong>Valkyrie</strong> — Peter Nicolai Arbo, 1864. One of Odin\'s choosers of the slain, riding through battlefields with spear and shield.' },
  ]},`;

// Thor full replacement
const oldThor = `  thor: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Thor_Fighting_the_Giants.jpg/960px-Thor_Fighting_the_Giants.jpg.webp', alt: 'Thor fighting the Giants by Mårten Eskil Winge, 1872. Swedish National Museum.', caption: '<strong>Thor Fighting the Giants</strong> — Mårten Eskil Winge, 1872. The thunder god in his chariot, goats roaring, hammer raised.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Thor_Mjolnir.jpg/960px-Thor_Mjolnir.jpg.webp', alt: 'Thor with Mjölnir, by Lorenz Frølich, 1895.', caption: '<strong>Thor with Mjölnir</strong> — Lorenz Frølich, 1895. The hammer that never misses, always returns, and shatters mountains.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Thor_Fishing.jpg/960px-Thor_Fishing.jpg.webp', alt: 'Thor fishing for Jörmungandr, by Emil Doepler, 1905.', caption: '<strong>Thor Fishing for Jörmungandr</strong> — Emil Doepler, 1905. The thunder god hooks the World Serpent, and the earth trembles.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Thor_Battle.jpg/960px-Thor_Battle.jpg.webp', alt: 'Thor in battle, by Lorenz Frølich, 1895.', caption: '<strong>Thor in Battle</strong> — Lorenz Frølich, 1895. The protector of Midgard, slaughtering giants by the dozen.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Thor_Goats.jpg/960px-Thor_Goats.jpg.webp', alt: 'Thor\'s chariot pulled by goats, by Lorenz Frølich, 1895.', caption: '<strong>Thor\'s Goats</strong> — Lorenz Frølich, 1895. Tanngrisnir and Tanngnjóstr pull the thunder chariot across the sky.' },
  ]},`;

const newThor = `  thor: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg/960px-M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg.webp', alt: 'Tor\'s Fight with the Giants by Mårten Eskil Winge, 1872. Nationalmuseum, Stockholm.', caption: '<strong>Tor\'s Fight with the Giants</strong> — Mårten Eskil Winge, 1872. The thunder god in his chariot drawn by goats, hammer Mjölnir raised against the jötnar.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Johannes_Gehrts_-_Thor%2C_der_Donnergott.jpg/960px-Johannes_Gehrts_-_Thor%2C_der_Donnergott.jpg.webp', alt: 'Thor, der Donnergott by Johannes Gehrts, c. 1900.', caption: '<strong>Thor, the Thunder God</strong> — Johannes Gehrts, c. 1900. The frontispiece to the Edda retold: red hair, lightning-wrapped hammer, belt of strength.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Thor%2C_Hymir_and_the_Midgard_Serpent.jpg/960px-Thor%2C_Hymir_and_the_Midgard_Serpent.jpg.webp', alt: 'Thor, Hymir and the Midgard Serpent, illustration from Teutonic Mythology, 1906.', caption: '<strong>Thor Fishing for Jörmungandr</strong> — Illustration from Rydberg\'s Teutonic Mythology, 1906. The thunder god hooks the World Serpent, and the earth trembles.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Louis_Huard_-_Giant_Skrymir_and_Thor.jpg/960px-Louis_Huard_-_Giant_Skrymir_and_Thor.jpg.webp', alt: 'The Giant Skrymir and Thor by Louis Huard, 1900.', caption: '<strong>Skrymir and Thor</strong> — Louis Huard, 1900. The giant Utgarða-Loki\'s servant towers over the thunder god in the land of illusions.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Thor_Destroys_the_Giant_Thrym.jpg/960px-Thor_Destroys_the_Giant_Thrym.jpg.webp', alt: 'Thor Destroys the Giant Thrym, illustration from Teutonic Mythology, 1906.', caption: '<strong>Thor Destroys Thrym</strong> — Illustration from Rydberg\'s Teutonic Mythology, 1906. Mjölnir returns, and the giants fall.' },
  ]},`;

// Ragnarok full replacement
const oldRagnarok = `  ragnarok: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Ragnarok_Foster.jpg/960px-Ragnarok_Foster.jpg.webp', alt: 'Ragnarök by John Charles Dollman, 1909.', caption: '<strong>Ragnarök</strong> — John Charles Dollman, 1909. The twilight of the gods: fire, flood, and the final battle.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Ragnarok_Lorenz_Frolich.jpg/960px-Ragnarok_Lorenz_Frolich.jpg.webp', alt: 'Ragnarök by Lorenz Frølich, 1895.', caption: '<strong>Ragnarök</strong> — Lorenz Frølich, 1895. Odin falls to Fenrir. Thor dies slaying the serpent. The world burns.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Surt_Foster.jpg/960px-Surt_Foster.jpg.webp', alt: 'Surtr by John Charles Dollman, 1909.', caption: '<strong>Surtr</strong> — John Charles Dollman, 1909. The fire giant from Muspellheim, sword blazing, ready to burn the world.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Fenrir_Binding.jpg/960px-Fenrir_Binding.jpg.webp', alt: 'The Binding of Fenrir, by Lorenz Frølich, 1895.', caption: '<strong>The Binding of Fenrir</strong> — Lorenz Frølich, 1895. The wolf who will break free at Ragnarök and devour Odin.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Jormungandr.jpg/960px-Jormungandr.jpg.webp', alt: 'Jörmungandr, the World Serpent, by Lorenz Frølich, 1895.', caption: '<strong>Jörmungandr</strong> — Lorenz Frølich, 1895. The Midgard Serpent encircles the world, tail in mouth, waiting for the end.' },
  ]},`;

const newRagnarok = `  ragnarok: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Johannes_gehrts_ragnarok_mindre.JPG/960px-Johannes_gehrts_ragnarok_mindre.JPG.webp', alt: 'Ragnarök by Johannes Gehrts.', caption: '<strong>Ragnarök</strong> — Johannes Gehrts. The final battle between the gods of Asgard and Loki\'s offspring: fire, flood, and the end of worlds.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/After_Ragnar%C3%B6k_by_Doepler.jpg/960px-After_Ragnar%C3%B6k_by_Doepler.jpg.webp', alt: 'After Ragnarök by Emil Doepler, c. 1905.', caption: '<strong>After Ragnarök</strong> — Emil Doepler, c. 1905. The world reborn from the ashes, green shoots rising over the sea.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/The_giant_with_the_flaming_sword_by_Dollman.jpg/960px-The_giant_with_the_flaming_sword_by_Dollman.jpg.webp', alt: 'Surtr with the flaming sword by John Charles Dollman, 1909.', caption: '<strong>Surtr</strong> — John Charles Dollman, 1909. The fire giant of Muspellheim raises his blazing sword to set the world aflame.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Odin_und_Fenriswolf_Freyr_und_Surt.jpg/960px-Odin_und_Fenriswolf_Freyr_und_Surt.jpg.webp', alt: 'Odin and Fenrir, Freyr and Surtr, illustration by Emil Doepler.', caption: '<strong>The Death of Odin and Freyr</strong> — Emil Doepler. Odin falls to Fenrir\'s jaws; Freyr meets Surtr\'s flame. Two gods, two deaths, one doom.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/The_binding_of_Fenrir_by_George_Wright.jpg/960px-The_binding_of_Fenrir_by_George_Wright.jpg.webp', alt: 'The binding of Fenrir by George Wright.', caption: '<strong>The Binding of Fenrir</strong> — George Wright. The wolf who will one day break free and swallow the All-Father is chained by craft and courage.' },
  ]},`;

// Helheimr full replacement
const oldHelheimr = `  helheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Helheim_Lorenz_Frolich.jpg/960px-Helheim_Lorenz_Frolich.jpg.webp', alt: 'Helheim by Lorenz Frølich, 1895.', caption: '<strong>Helheim</strong> — Lorenz Frølich, 1895. The realm of the dead, ruled by Hel, daughter of Loki.' },
  ]},`;

const newHelheimr = `  helheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Hermod_before_Hela.jpg/960px-Hermod_before_Hela.jpg.webp', alt: 'Hermod before Hela by John Charles Dollman, 1909.', caption: '<strong>Hermod before Hela</strong> — John Charles Dollman, 1909. Odin\'s messenger kneels in the hall of the dead, begging for Baldr\'s return.' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Hel-by-Zarubina.jpg/960px-Hel-by-Zarubina.jpg.webp', alt: 'Hel by Zarubina.', caption: '<strong>Hel</strong> — Zarubina. The daughter of Loki, half living and half dead, enthroned in her underworld realm.' },
  ]},`;

// Muspellheimr full replacement
const oldMuspellheimr = `  muspellheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Muspellheim_Fire.jpg/960px-Muspellheim_Fire.jpg.webp', alt: 'Surtr with flaming sword, by Lorenz Frølich, 1895.', caption: '<strong>Surtr in Muspellheim</strong> — Lorenz Frølich, 1895. The fire giant waits with his flaming sword for Ragnarök.' },
  ]},`;

const newMuspellheimr = `  muspellheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/The_giant_with_the_flaming_sword_by_Dollman.jpg/960px-The_giant_with_the_flaming_sword_by_Dollman.jpg.webp', alt: 'Surtr with the flaming sword by John Charles Dollman, 1909.', caption: '<strong>Surtr in Muspellheim</strong> — John Charles Dollman, 1909. The fire giant waits with his blazing sword to burn the world at Ragnarök.' },
  ]},`;

// Midgardr full replacement
const oldMidgardr = `  midgardr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Midgard_Yggdrasil.jpg/960px-Midgard_Yggdrasil.jpg.webp', alt: 'Yggdrasil and the Nine Worlds, by Lorenz Frølich, 1895.', caption: '<strong>Yggdrasil and the Nine Worlds</strong> — Lorenz Frølich, 1895. Midgard at the center, encircled by the World Serpent.' },
  ]},`;

const newMidgardr = `  midgardr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Nine_Worlds_of_Norse_Religion.jpg/960px-Nine_Worlds_of_Norse_Religion.jpg.webp', alt: 'The Nine Worlds of Norse Religion.', caption: '<strong>The Nine Worlds</strong> — Midgard at the center of the cosmos, home of humankind, encircled by Jörmungandr and joined to the other realms by Yggdrasil.' },
  ]},`;

// Alfheimr full replacement
const oldAlfheimr = `  alfheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Alfheim_Lorenz_Frolich.jpg/960px-Alfheim_Lorenz_Frolich.jpg.webp', alt: 'Light elves in Alfheim, by Lorenz Frølich, 1895.', caption: '<strong>Alfheim</strong> — Lorenz Frølich, 1895. The realm of the light elves, luminous and fair, home of Freyr.' },
  ]},`;

const newAlfheimr = `  alfheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/August_Malmstr%C3%B6m_-_Dancing_Fairies_-_Google_Art_Project.jpg/960px-August_Malmstr%C3%B6m_-_Dancing_Fairies_-_Google_Art_Project.jpg.webp', alt: 'Dancing Fairies by August Malmström. Nationalmuseum, Stockholm.', caption: '<strong>Alfheim</strong> — August Malmström, Dancing Fairies. The realm of the light elves: luminous, graceful, and forever dancing at the edge of mortal sight.' },
  ]},`;

// Jotunheimr full replacement
const oldJotunheimr = `  jotunheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Jotunheim_Lorenz_Frolich.jpg/960px-Jotunheim_Lorenz_Frolich.jpg.webp', alt: 'Giants in Jötunheimr, by Lorenz Frølich, 1895.', caption: '<strong>Jötunheimr</strong> — Lorenz Frølich, 1895. The land of giants: frost, stone, and ancient enmity against the gods.' },
  ]},`;

const newJotunheimr = `  jotunheimr: { images: [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Louis_Huard_-_Giant_Skrymir_and_Thor.jpg/960px-Louis_Huard_-_Giant_Skrymir_and_Thor.jpg.webp', alt: 'The Giant Skrymir and Thor by Louis Huard, 1900.', caption: '<strong>Jötunheimr</strong> — Louis Huard, 1900. The land of giants: Skrymir, servant of Utgarða-Loki, towers over Thor in the realm of ancient enmity.' },
  ]},`;

const replacements = [
  [oldOdinn, newOdinn, 'odinn'],
  [oldThor, newThor, 'thor'],
  [oldRagnarok, newRagnarok, 'ragnarok'],
  [oldHelheimr, newHelheimr, 'helheimr'],
  [oldMuspellheimr, newMuspellheimr, 'muspellheimr'],
  [oldMidgardr, newMidgardr, 'midgardr'],
  [oldAlfheimr, newAlfheimr, 'alfheimr'],
  [oldJotunheimr, newJotunheimr, 'jotunheimr'],
];

for (const [oldBlock, newBlock, name] of replacements) {
  if (src.includes(oldBlock)) {
    src = src.replace(oldBlock, newBlock);
    console.log(`FIXED: ${name} gallery`);
  } else {
    console.log(`WARN: ${name} block not found`);
  }
}

fs.writeFileSync(file, src);
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit' });
