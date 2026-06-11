const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const batchPath = path.join(__dirname, 'batch-update-galleries.js');
let source = fs.readFileSync(batchPath, 'utf8');

function thumbUrl(filename, hash) {
  const safe = filename.replace(/ /g, '_');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash}/${safe}/960px-${safe}.webp`;
}

function sq(s) {
  return s.replace(/'/g, "\\'");
}

function formatBlock(siteId, images) {
  const lines = images.map((img) => {
    const url = thumbUrl(img.filename, img.hash);
    return `    { src: '${sq(url)}', alt: '${sq(img.alt)}', caption: '${sq(img.caption)}' }`;
  });
  return `  ${siteId}: { images: [\n${lines.join(',\n')}\n  ]},`;
}

const corrections = {
  medousa: [
    {
      filename: 'Rondanini Medusa Glyptothek Munich 252 n1.jpg',
      hash: '8/8f',
      alt: 'Medusa Rondanini, Roman copy. Glyptothek, Munich.',
      caption: '<strong>Medusa Rondanini</strong> — Glyptothek, Munich. The gorgon\'s face transformed from horror into pathos: she weeps even in stone.'
    },
    {
      filename: 'Medusa Rondanini, Roman copy after 5th-century BC Greek original by Phidias, Glyptotek Museum, Munich (10552972534).jpg',
      hash: 'b/bd',
      alt: 'Medusa Rondanini, Roman copy after Phidias. Glyptothek, Munich.',
      caption: '<strong>Medusa Rondanini</strong> — Roman copy after Phidias, Glyptothek. The most famous gorgoneion in Western art.'
    },
    {
      filename: 'Little master band-cup - ABV extra - Perseus pursuing Medusa - two gorgons running - Maddaloni MAC 302719 - 05.jpg',
      hash: 'b/b7',
      alt: 'Perseus pursuing Medusa, Attic black-figure band-cup.',
      caption: '<strong>Perseus Pursuing Medusa</strong> — Attic black-figure band-cup. The hero sets out on his impossible quest, armed by the gods.'
    },
    {
      filename: 'Perseus met het hoofd van Medusa, RP-P-1898-A-20131.jpg',
      hash: '7/74',
      alt: 'Perseus beheading Medusa, with Pegasus and Chrysaor springing from her blood.',
      caption: '<strong>Birth of Pegasus</strong> — From Medusa\'s severed neck spring Pegasus and Chrysaor: beauty and terror born from blood.'
    },
    {
      filename: 'Caravaggio - Medusa - Google Art Project.jpg',
      hash: '1/15',
      alt: 'Medusa by Caravaggio, c. 1597. Uffizi Gallery, Florence.',
      caption: '<strong>Medusa</strong> — Caravaggio, c. 1597. The moment of decapitation painted on a ceremonial shield: art imitating death.'
    }
  ],
  eros: [
    {
      filename: "Psyche Revived by Cupid's Kiss 10.jpg",
      hash: '9/92',
      alt: "Psyche Revived by Cupid's Kiss by Antonio Canova, 1787. Louvre Museum.",
      caption: "<strong>Psyche Revived by Cupid's Kiss</strong> — Antonio Canova, 1787. The moment love breathes life back into the soul."
    },
    {
      filename: 'Eros, dit le Génie Borghèse (Louvre, Ma 545).jpg',
      hash: '4/47',
      alt: 'Eros Borghese, Roman copy. Louvre Museum.',
      caption: '<strong>Eros Borghese</strong> — Roman copy, Louvre. The bow is bent, the arrow chosen: the god of desire as a beautiful youth.'
    },
    {
      filename: 'Bronze statue of Eros sleeping MET DP123903.jpg',
      hash: '6/68',
      alt: 'Sleeping Eros, Hellenistic bronze. Metropolitan Museum of Art.',
      caption: '<strong>Sleeping Eros</strong> — Hellenistic bronze, Metropolitan Museum. The god of love at rest, his weapons forgotten, wings folded.'
    }
  ],
  helios: [
    {
      filename: 'Colosse de Rhodes (Barclay).jpg',
      hash: '5/5f',
      alt: 'Colossus of Rhodes, artistic reconstruction by Barclay.',
      caption: '<strong>The Colossus of Rhodes</strong> — Voyage aux Sept Merveilles du Monde. The sun god straddling the harbor, one of the Seven Wonders.'
    },
    {
      filename: 'Marble Relief of Sun God Helios in a Quadriga from Temple of Athena at Ilion-Troy, 300-280 BC (28120631484).jpg',
      hash: '5/58',
      alt: 'Helios in his quadriga, marble relief from Troy, c. 300–280 BCE.',
      caption: '<strong>Helios in His Quadriga</strong> — Marble relief from Troy, c. 300–280 BCE. The sun god drives his four-horse chariot across the sky each dawn.'
    }
  ],
  selene: [
    {
      filename: 'Sarcophagus Selene Endymion Met 47.100.4ab n04.jpg',
      hash: 'a/a3',
      alt: 'Selene on her chariot, detail from a Roman sarcophagus. Metropolitan Museum of Art.',
      caption: '<strong>Selene</strong> — Roman sarcophagus, Metropolitan Museum. The moon goddess descends in her chariot across the night sky.'
    },
    {
      filename: 'Louvre Selene-and-Endymion sarcophagus.jpg',
      hash: 'b/b4',
      alt: 'Selene and Endymion, Roman sarcophagus. Louvre Museum.',
      caption: '<strong>Selene and Endymion</strong> — Roman sarcophagus, Louvre. The goddess descends to kiss her eternal sleeper.'
    }
  ],
  hephaistos: [
    {
      filename: 'Vulcan Coustou Louvre MR1814.jpg',
      hash: '5/53',
      alt: 'Vulcan (Hephaestus) by Guillaume II Coustou, 1742. Louvre Museum.',
      caption: '<strong>Vulcan</strong> — Guillaume II Coustou, 1742, Louvre. The smith god, crippled but powerful, forge glowing behind him.'
    },
    {
      filename: 'Diego Velasquez, The Forge of Vulcan.jpg',
      hash: '7/7f',
      alt: 'The Forge of Vulcan by Diego Velázquez, 1630. Prado Museum.',
      caption: '<strong>The Forge of Vulcan</strong> — Diego Velázquez, 1630. The god and his cyclopes hammering divine weapons.'
    }
  ],
  hera: [
    {
      filename: 'Hera Ludovisi Altemps Inv8631.jpg',
      hash: '6/6c',
      alt: 'Hera Ludovisi, Roman copy. Palazzo Altemps, Rome.',
      caption: '<strong>Hera Ludovisi</strong> — Roman copy, Palazzo Altemps. The queen of Olympus: regal, severe, and majestically beautiful.'
    },
    {
      filename: 'Hera Barberini Pio-Clementino Inv254.jpg',
      hash: '8/8d',
      alt: 'Hera Barberini, Roman copy. Vatican Museums.',
      caption: '<strong>Hera Barberini</strong> — Vatican Museums. The goddess crowned and enthroned, the peacock at her feet.'
    }
  ],
  hestia: [
    {
      filename: 'Hestia Giustiniani (Louvre).jpg',
      hash: 'f/f9',
      alt: 'Hestia Giustiniani, Roman copy. Louvre Museum.',
      caption: '<strong>Hestia Giustiniani</strong> — Louvre. The goddess of the hearth, veiled and serene.'
    },
    {
      filename: 'Temple of Vesta (Rome).jpg',
      hash: '2/2f',
      alt: 'Temple of Vesta, Rome.',
      caption: '<strong>Temple of Vesta</strong> — Rome. The eternal flame that must never be allowed to die.'
    }
  ],
  atlas: [
    {
      filename: 'Atlas (Farnese Globe).jpg',
      hash: '8/8e',
      alt: 'Farnese Atlas, Roman copy. National Archaeological Museum, Naples.',
      caption: '<strong>Atlas Farnese</strong> — National Archaeological Museum, Naples. The Titan holds the celestial sphere, muscles straining under the weight of heaven.'
    },
    {
      filename: 'Atlante farnese - Museo Archeologico Nazionale - Naples 01.jpg',
      hash: '7/79',
      alt: 'Farnese Atlas, another view. National Archaeological Museum, Naples.',
      caption: '<strong>Atlas Farnese</strong> — Another view of the Titan bearing the heavens, the oldest surviving celestial globe.'
    }
  ],
  ker: [
    {
      filename: 'Hypnos Thanatos BM Vase D56.jpg',
      hash: 'c/c2',
      alt: 'Hypnos and Thanatos carrying a dead warrior, Attic black-figure vase, c. 530 BCE. British Museum.',
      caption: '<strong>Ker</strong> — Attic black-figure, c. 530 BCE. The winged death spirit carries the slain from the battlefield.'
    }
  ],
  chaos: [
    {
      filename: 'Michelangelo Buonarroti 018.jpg',
      hash: '7/78',
      alt: 'The Creation of the Sun, Moon and Plants by Michelangelo, 1508–1512. Sistine Chapel.',
      caption: '<strong>The Primordial Void</strong> — Michelangelo, Sistine Chapel. Before light, before form: the chaos from which all emerged.'
    },
    {
      filename: 'Francisco de Goya, Saturno devorando a su hijo (1819-1823).jpg',
      hash: '8/82',
      alt: 'Saturn Devouring His Son by Francisco Goya, c. 1823. Prado Museum.',
      caption: '<strong>Saturn Devouring His Son</strong> — Goya, c. 1823. Chaos as primal terror: the father who consumes his children.'
    }
  ],
  gaia: [
    {
      filename: 'The Earth seen from Apollo 17.jpg',
      hash: '9/97',
      alt: 'Earth from space, Apollo 17 Blue Marble.',
      caption: '<strong>Gaia</strong> — Earth from space. The blue marble: the only world we know that breathes, thinks, and dreams.'
    },
    {
      filename: 'Tellus - Ara Pacis.jpg',
      hash: '8/8b',
      alt: 'Tellus Mater relief from the Ara Pacis, Rome.',
      caption: '<strong>Tellus Mater</strong> — Ara Pacis, Rome. The Roman earth-mother, fruit and grain in her lap, surrounded by wind and water.'
    }
  ],
  sparte: [
    {
      filename: 'Ancient Sparta theatre ruins.jpg',
      hash: 'd/d2',
      alt: 'Ruins of the ancient Spartan theatre, Greece.',
      caption: '<strong>Ruins of Sparta</strong> — The city that feared neither death nor defeat, where boys were trained from age seven.'
    },
    {
      filename: 'Jacques-Louis David - Leonidas at Thermopylae - WGA6095.jpg',
      hash: '2/27',
      alt: 'Leonidas at Thermopylae by Jacques-Louis David, 1814.',
      caption: '<strong>Leonidas at Thermopylae</strong> — Jacques-Louis David, 1814. The king who stood with 300 against an empire.'
    }
  ],
  pontos: [
    {
      filename: 'Sunrise over the Black Sea (AP4P0489) (11194862636).jpg',
      hash: '0/0c',
      alt: 'Sunrise over the Black Sea (Pontos Euxeinos).',
      caption: '<strong>The Black Sea</strong> — Pontos Euxeinos. The sea that gave its name to the primordial god of the deep.'
    }
  ],
  tartaros: [
    {
      filename: 'Pieter Bruegel the Elder - The Fall of the Rebel Angels - WGA03405.jpg',
      hash: 'a/a7',
      alt: 'The Fall of the Rebel Angels by Pieter Bruegel the Elder, 1562. Royal Museums of Fine Arts of Belgium.',
      caption: '<strong>The Fall of the Rebel Angels</strong> — Bruegel, 1562. The Titans cast into Tartarus, falling through darkness eternal.'
    }
  ],
  olympos: [
    {
      filename: 'Olympus National Park 30.jpg',
      hash: 'e/e8',
      alt: 'Mount Olympus, Greece.',
      caption: '<strong>Mount Olympus</strong> — The highest peak in Greece, home of the gods, throne of Zeus.'
    }
  ],
  athenai: [
    {
      filename: 'Acropolis Athens.JPG',
      hash: 'b/b1',
      alt: 'The Acropolis of Athens.',
      caption: '<strong>The Acropolis</strong> — Athens. The sacred rock: Parthenon, Erechtheion, Propylaea.'
    },
    {
      filename: 'Parthenon from west.jpg',
      hash: 'a/ad',
      alt: 'The Parthenon, Athens.',
      caption: '<strong>The Parthenon</strong> — The temple of Athena Parthenos, the most perfect building ever constructed.'
    }
  ],
  libye: [
    {
      filename: 'Libyan Desert - 2006.jpg',
      hash: '9/99',
      alt: 'The Libyan Desert.',
      caption: '<strong>The Libyan Desert</strong> — The vast Sahara that covers ancient Libya, land of Ammon and the oracle of Siwa.'
    }
  ],
  europe: [
    {
      filename: 'Titian - Rape of Europa - Google Art Project.jpg',
      hash: '3/38',
      alt: 'The Rape of Europa by Titian, 1560–1562. Isabella Stewart Gardner Museum, Boston.',
      caption: '<strong>The Rape of Europa</strong> — Titian, 1560–62. Zeus as a white bull carries the Phoenician princess across the sea.'
    },
    {
      filename: 'Europe satellite orthographic.jpg',
      hash: '1/1b',
      alt: 'Satellite map of Europe.',
      caption: '<strong>Europe</strong> — The continent that bears her name, from the Atlantic to the Urals.'
    }
  ],
  aigyptos: [
    {
      filename: 'All Gizah Pyramids.jpg',
      hash: 'a/af',
      alt: 'The Pyramids of Giza, Egypt.',
      caption: '<strong>The Pyramids of Giza</strong> — The last surviving Wonder of the Ancient World, built for the pharaohs of the Fourth Dynasty.'
    },
    {
      filename: 'Great Sphinx of Giza (2).jpg',
      hash: '4/4e',
      alt: 'The Great Sphinx of Giza, Egypt.',
      caption: '<strong>The Great Sphinx</strong> — Guardian of the necropolis, face of a pharaoh, body of a lion, watching eternity pass.'
    }
  ],
  asia: [
    {
      filename: "1794 J. B. B. D'Anville Map of Asia Minor in Antiquity (Turkey, Cyprus, Syria).jpg",
      hash: '8/84',
      alt: 'Map of Asia Minor (Anatolia).',
      caption: '<strong>Asia Minor</strong> — The land bridge between Europe and the ancient Near East.'
    }
  ],
  kobe: [
    {
      filename: 'Kobe Port Tower and Harborland at night 20190202-2.jpg',
      hash: '1/13',
      alt: 'Kobe, Japan, at night.',
      caption: '<strong>Kobe</strong> — The port city between mountains and sea, famous for its beef and its resilience.'
    }
  ],
  kyoto: [
    {
      filename: 'Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg',
      hash: '0/0e',
      alt: 'Fushimi Inari Shrine, Kyoto, Japan.',
      caption: '<strong>Fushimi Inari Shrine</strong> — Kyoto. Thousands of vermillion torii gates winding up the mountain.'
    },
    {
      filename: 'Kinkaku-ji in November 2016 -02.jpg',
      hash: 'd/d8',
      alt: 'Kinkaku-ji (Golden Pavilion), Kyoto, Japan.',
      caption: '<strong>Kinkaku-ji</strong> — The Golden Pavilion, reflected in its mirror pond, the most photographed temple in Japan.'
    }
  ],
  osaka: [
    {
      filename: 'Osaka Castle, Keep tower, South view 20190415 1.jpg',
      hash: 'a/ab',
      alt: 'Osaka Castle, Japan.',
      caption: '<strong>Osaka Castle</strong> — The fortress of Toyotomi Hideyoshi, rebuilt in concrete and gold, symbol of Japanese unification.'
    }
  ]
};

for (const [siteId, images] of Object.entries(corrections)) {
  const regex = new RegExp(`^  ${siteId}: \\{ images: \\[([\\s\\S]*?)\\n  \\]\\},`, 'm');
  const replacement = formatBlock(siteId, images);
  if (!regex.test(source)) {
    console.warn('Pattern not found for site:', siteId);
    continue;
  }
  source = source.replace(regex, replacement);
  console.log('Replaced gallery block for:', siteId);
}

fs.writeFileSync(batchPath, source, 'utf8');
console.log('Updated', batchPath);

console.log('Running batch-update-galleries.js...');
execSync('node scripts/batch-update-galleries.js', { stdio: 'inherit' });
