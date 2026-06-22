/**
 * Generator for platform/db/confusables.json
 *
 * Builds a comprehensive Unicode confusable database from explicit ranges
 * and curated mappings. Run with:
 *   node scripts/generate-confusables-db.js
 */

const fs = require('node:fs');
const path = require('node:path');

function entry(char, target, script, category, visualScore, note) {
  return { char, target, script, category, visualScore, note };
}

function pushRange(entries, start, end, targets, script, category, visualScore, notePrefix) {
  let cp = start;
  let idx = 0;
  while (cp <= end) {
    const target = targets[idx % targets.length];
    entries.push(
      entry(
        String.fromCodePoint(cp),
        target,
        script,
        category,
        visualScore,
        `${notePrefix} ${target.toUpperCase()}`
      )
    );
    cp++;
    idx++;
  }
}

const entries = [];

// Latin look-alikes
entries.push(
  entry('0', 'o', 'Latin', 'digit', 0.95, 'Digit zero resembles lowercase o'),
  entry('1', 'l', 'Latin', 'digit', 0.95, 'Digit one resembles lowercase l'),
  entry('!', 'i', 'Latin', 'symbol', 0.9, 'Exclamation mark resembles lowercase i'),
  entry('|', 'l', 'Latin', 'symbol', 0.95, 'Vertical bar resembles lowercase l'),
  entry('¡', 'i', 'Latin', 'symbol', 0.9, 'Inverted exclamation resembles lowercase i'),
  entry('Ɩ', 'l', 'Latin', 'homoglyph', 0.95, 'Latin letter small capital I resembles l'),
  entry('׀', 'l', 'Hebrew', 'symbol', 0.9, 'Hebrew word separator resembles l'),
  entry('∣', 'l', 'Common', 'symbol', 0.9, 'Divides symbol resembles l'),
  entry('⼁', 'l', 'CJK', 'symbol', 0.8, 'CJK radical line resembles l'),
  entry('Ⅰ', 'l', 'Latin', 'symbol', 0.9, 'Roman numeral one resembles l'),
  entry('ⅼ', 'l', 'Latin', 'symbol', 0.9, 'Roman numeral fifty lowercase resembles l'),
  entry('ℓ', 'l', 'Latin', 'stylistic', 0.9, 'Script small l resembles l'),
  entry('∕', '/', 'Common', 'symbol', 0.95, 'Division slash resembles forward slash'),
  entry('∖', '\\', 'Common', 'symbol', 0.95, 'Set minus resembles backslash'),
  entry('ꓲ', 'I', 'Lisu', 'homoglyph', 0.95, 'Lisu letter Ia resembles capital I'),
  entry('ꓵ', 'V', 'Lisu', 'homoglyph', 0.9, 'Lisu letter reversed Ee resembles V'),
  entry('ꓶ', 'V', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ur resembles V'),
  entry('ꓒ', 'P', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Pa resembles P'),
  entry('ꓓ', 'D', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Da resembles D'),
  entry('ꓘ', 'K', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Kha resembles K'),
  entry('ꓙ', 'J', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ja resembles J'),
  entry('ꓤ', 'G', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ga resembles G'),
  entry('ꓣ', 'C', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ca resembles C'),
  entry('ꓥ', 'H', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ha resembles H'),
  entry('ꓦ', 'X', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Sha resembles X'),
  entry('ꓧ', 'T', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ta resembles T'),
  entry('ꓩ', 'F', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Fa resembles F'),
  entry('ꓪ', 'Z', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Za resembles Z'),
  entry('ꓫ', 'U', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Nga resembles U'),
  entry('ꓬ', 'E', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ha resembles E'),
  entry('ꓭ', 'B', 'Lisu', 'homoglyph', 0.9, 'Lisu letter Ba resembles B'),
  entry('ꓮ', 'A', 'Lisu', 'homoglyph', 0.95, 'Lisu letter A resembles A'),
  entry('ꓯ', 'O', 'Lisu', 'homoglyph', 0.9, 'Lisu letter O resembles O'),
  entry('ꓰ', 'E', 'Lisu', 'homoglyph', 0.95, 'Lisu letter E resembles E'),
  entry('ꓱ', 'U', 'Lisu', 'homoglyph', 0.9, 'Lisu letter U resembles U'),
  entry('ꓲ', 'I', 'Lisu', 'homoglyph', 0.95, 'Lisu letter I resembles I'),
  entry('ꓳ', 'O', 'Lisu', 'homoglyph', 0.95, 'Lisu letter O resembles O'),
  entry('ꓴ', 'U', 'Lisu', 'homoglyph', 0.9, 'Lisu letter U resembles U')
);

// Greek letters
entries.push(
  entry('α', 'a', 'Greek', 'homoglyph', 1.0, 'Greek alpha resembles a'),
  entry('β', 'b', 'Greek', 'homoglyph', 0.95, 'Greek beta resembles b'),
  entry('γ', 'y', 'Greek', 'homoglyph', 0.9, 'Greek gamma resembles y'),
  entry('δ', 'd', 'Greek', 'homoglyph', 0.95, 'Greek delta resembles d'),
  entry('ε', 'e', 'Greek', 'homoglyph', 1.0, 'Greek epsilon resembles e'),
  entry('ζ', 'z', 'Greek', 'homoglyph', 0.9, 'Greek zeta resembles z'),
  entry('η', 'n', 'Greek', 'homoglyph', 0.95, 'Greek eta resembles n'),
  entry('θ', 'o', 'Greek', 'homoglyph', 0.95, 'Greek theta resembles o'),
  entry('ι', 'i', 'Greek', 'homoglyph', 1.0, 'Greek iota resembles i'),
  entry('κ', 'k', 'Greek', 'homoglyph', 0.95, 'Greek kappa resembles k'),
  entry('λ', 'l', 'Greek', 'homoglyph', 0.9, 'Greek lambda resembles l'),
  entry('μ', 'u', 'Greek', 'homoglyph', 0.95, 'Greek mu resembles u'),
  entry('ν', 'v', 'Greek', 'homoglyph', 1.0, 'Greek nu resembles v'),
  entry('ξ', 'x', 'Greek', 'homoglyph', 0.9, 'Greek xi resembles x'),
  entry('ο', 'o', 'Greek', 'homoglyph', 1.0, 'Greek omicron resembles o'),
  entry('π', 'p', 'Greek', 'homoglyph', 0.95, 'Greek pi resembles p'),
  entry('ρ', 'p', 'Greek', 'homoglyph', 0.95, 'Greek rho resembles p'),
  entry('σ', 'o', 'Greek', 'homoglyph', 0.95, 'Greek sigma resembles o'),
  entry('ς', 's', 'Greek', 'homoglyph', 0.9, 'Greek final sigma resembles s'),
  entry('τ', 't', 'Greek', 'homoglyph', 0.95, 'Greek tau resembles t'),
  entry('υ', 'u', 'Greek', 'homoglyph', 0.95, 'Greek upsilon resembles u'),
  entry('φ', 'o', 'Greek', 'homoglyph', 0.9, 'Greek phi resembles o'),
  entry('χ', 'x', 'Greek', 'homoglyph', 0.95, 'Greek chi resembles x'),
  entry('ψ', 'u', 'Greek', 'homoglyph', 0.9, 'Greek psi resembles u'),
  entry('ω', 'w', 'Greek', 'homoglyph', 0.9, 'Greek omega resembles w'),
  entry('Α', 'A', 'Greek', 'homoglyph', 1.0, 'Greek capital alpha resembles A'),
  entry('Β', 'B', 'Greek', 'homoglyph', 1.0, 'Greek capital beta resembles B'),
  entry('Ε', 'E', 'Greek', 'homoglyph', 1.0, 'Greek capital epsilon resembles E'),
  entry('Ζ', 'Z', 'Greek', 'homoglyph', 0.95, 'Greek capital zeta resembles Z'),
  entry('Η', 'H', 'Greek', 'homoglyph', 1.0, 'Greek capital eta resembles H'),
  entry('Ι', 'I', 'Greek', 'homoglyph', 1.0, 'Greek capital iota resembles I'),
  entry('Κ', 'K', 'Greek', 'homoglyph', 0.95, 'Greek capital kappa resembles K'),
  entry('Μ', 'M', 'Greek', 'homoglyph', 1.0, 'Greek capital mu resembles M'),
  entry('Ν', 'N', 'Greek', 'homoglyph', 1.0, 'Greek capital nu resembles N'),
  entry('Ο', 'O', 'Greek', 'homoglyph', 1.0, 'Greek capital omicron resembles O'),
  entry('Ρ', 'P', 'Greek', 'homoglyph', 0.95, 'Greek capital rho resembles P'),
  entry('Τ', 'T', 'Greek', 'homoglyph', 1.0, 'Greek capital tau resembles T'),
  entry('Χ', 'X', 'Greek', 'homoglyph', 1.0, 'Greek capital chi resembles X'),
  entry('∆', 'A', 'Greek', 'homoglyph', 0.9, 'Greek Delta resembles A'),
  entry('∇', 'V', 'Greek', 'symbol', 0.85, 'Nabla resembles V')
);

// Cyrillic
entries.push(
  entry('а', 'a', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic a resembles Latin a'),
  entry('б', 'b', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic be resembles b'),
  entry('в', 'b', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic ve resembles b'),
  entry('г', 'r', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic ghe resembles r'),
  entry('д', 'a', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic de resembles a'),
  entry('е', 'e', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic ie resembles e'),
  entry('ё', 'e', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic io resembles e'),
  entry('ж', 'x', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic zhe resembles x'),
  entry('з', '3', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic ze resembles 3'),
  entry('и', 'u', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic i resembles u'),
  entry('й', 'u', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic short i resembles u'),
  entry('к', 'k', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic ka resembles k'),
  entry('л', 'n', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic el resembles n'),
  entry('м', 'm', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic em resembles m'),
  entry('н', 'n', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic en resembles n'),
  entry('о', 'o', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic o resembles o'),
  entry('п', 'n', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic pe resembles n'),
  entry('р', 'p', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic er resembles p'),
  entry('с', 'c', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic es resembles c'),
  entry('т', 't', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic te resembles t'),
  entry('у', 'y', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic u resembles y'),
  entry('ф', 'f', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic ef resembles f'),
  entry('х', 'x', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic ha resembles x'),
  entry('ц', 'u', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic tse resembles u'),
  entry('ч', '4', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic che resembles 4'),
  entry('ш', 'w', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic sha resembles w'),
  entry('щ', 'w', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic shcha resembles w'),
  entry('ъ', 'b', 'Cyrillic', 'homoglyph', 0.85, 'Cyrillic hard sign resembles b'),
  entry('ы', 'bl', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic yeru resembles bl'),
  entry('ь', 'b', 'Cyrillic', 'homoglyph', 0.85, 'Cyrillic soft sign resembles b'),
  entry('э', '3', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic e resembles 3'),
  entry('ю', 'io', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic yu resembles io'),
  entry('я', 'r', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic ya resembles r'),
  entry('А', 'A', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital A resembles Latin A'),
  entry('В', 'B', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Ve resembles B'),
  entry('С', 'C', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Es resembles C'),
  entry('Е', 'E', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Ie resembles E'),
  entry('Н', 'H', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital En resembles H'),
  entry('І', 'I', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Byelorussian-Ukrainian I resembles I'),
  entry('Ј', 'J', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic capital Je resembles J'),
  entry('К', 'K', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic capital Ka resembles K'),
  entry('М', 'M', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Em resembles M'),
  entry('О', 'O', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital O resembles O'),
  entry('Р', 'P', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Er resembles P'),
  entry('Т', 'T', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Te resembles T'),
  entry('Х', 'X', 'Cyrillic', 'homoglyph', 1.0, 'Cyrillic capital Ha resembles X'),
  entry('Ѕ', 'S', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic capital Dze resembles S'),
  entry('Ԍ', 'G', 'Cyrillic', 'homoglyph', 0.95, 'Cyrillic capital Ghe with stroke resembles G'),
  entry('Ԛ', 'Q', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic capital QA resembles Q'),
  entry('Ԝ', 'W', 'Cyrillic', 'homoglyph', 0.9, 'Cyrillic capital WE resembles W'),
  entry('№', 'No', 'Cyrillic', 'symbol', 0.9, 'Numero sign resembles No')
);

// Armenian
entries.push(
  entry('ա', 'a', 'Armenian', 'homoglyph', 0.95, 'Armenian ayb resembles a'),
  entry('բ', 'b', 'Armenian', 'homoglyph', 0.9, 'Armenian ben resembles b'),
  entry('գ', 'g', 'Armenian', 'homoglyph', 0.9, 'Armenian gim resembles g'),
  entry('դ', 'd', 'Armenian', 'homoglyph', 0.9, 'Armenian da resembles d'),
  entry('ե', 'e', 'Armenian', 'homoglyph', 0.95, 'Armenian ech resembles e'),
  entry('զ', 'z', 'Armenian', 'homoglyph', 0.9, 'Armenian za resembles z'),
  entry('է', 'e', 'Armenian', 'homoglyph', 0.9, 'Armenian eh resembles e'),
  entry('ը', 'e', 'Armenian', 'homoglyph', 0.85, 'Armenian et resembles e'),
  entry('թ', 't', 'Armenian', 'homoglyph', 0.9, 'Armenian to resembles t'),
  entry('ժ', 'zh', 'Armenian', 'homoglyph', 0.8, 'Armenian zhe resembles zh'),
  entry('ի', 'i', 'Armenian', 'homoglyph', 0.95, 'Armenian ini resembles i'),
  entry('լ', 'l', 'Armenian', 'homoglyph', 0.95, 'Armenian liwn resembles l'),
  entry('խ', 'kh', 'Armenian', 'homoglyph', 0.8, 'Armenian xeh resembles kh'),
  entry('ծ', 'ts', 'Armenian', 'homoglyph', 0.8, 'Armenian ca resembles ts'),
  entry('կ', 'k', 'Armenian', 'homoglyph', 0.9, 'Armenian ken resembles k'),
  entry('հ', 'h', 'Armenian', 'homoglyph', 0.9, 'Armenian ho resembles h'),
  entry('ձ', 'dz', 'Armenian', 'homoglyph', 0.8, 'Armenian ja resembles dz'),
  entry('ղ', 'gh', 'Armenian', 'homoglyph', 0.8, 'Armenian ghad resembles gh'),
  entry('ճ', 'ch', 'Armenian', 'homoglyph', 0.8, 'Armenian cheh resembles ch'),
  entry('մ', 'm', 'Armenian', 'homoglyph', 0.9, 'Armenian men resembles m'),
  entry('յ', 'y', 'Armenian', 'homoglyph', 0.9, 'Armenian yi resembles y'),
  entry('ն', 'n', 'Armenian', 'homoglyph', 0.9, 'Armenian nu resembles n'),
  entry('շ', 'sh', 'Armenian', 'homoglyph', 0.8, 'Armenian sha resembles sh'),
  entry('ո', 'vo', 'Armenian', 'homoglyph', 0.85, 'Armenian vo resembles vo'),
  entry('չ', 'ch', 'Armenian', 'homoglyph', 0.8, 'Armenian cha resembles ch'),
  entry('պ', 'p', 'Armenian', 'homoglyph', 0.9, 'Armenian peh resembles p'),
  entry('ջ', 'j', 'Armenian', 'homoglyph', 0.85, 'Armenian jeh resembles j'),
  entry('ռ', 'r', 'Armenian', 'homoglyph', 0.85, 'Armenian ra resembles r'),
  entry('ս', 's', 'Armenian', 'homoglyph', 0.9, 'Armenian seh resembles s'),
  entry('վ', 'v', 'Armenian', 'homoglyph', 0.9, 'Armenian vew resembles v'),
  entry('տ', 't', 'Armenian', 'homoglyph', 0.9, 'Armenian tiwn resembles t'),
  entry('ր', 'r', 'Armenian', 'homoglyph', 0.85, 'Armenian reh resembles r'),
  entry('ց', 'ts', 'Armenian', 'homoglyph', 0.8, 'Armenian co resembles ts'),
  entry('ւ', 'w', 'Armenian', 'homoglyph', 0.85, 'Armenian yiwn resembles w'),
  entry('փ', 'p', 'Armenian', 'homoglyph', 0.9, 'Armenian pweh resembles p'),
  entry('ք', 'k', 'Armenian', 'homoglyph', 0.9, 'Armenian keh resembles k'),
  entry('օ', 'o', 'Armenian', 'homoglyph', 0.95, 'Armenian oh resembles o'),
  entry('ֆ', 'f', 'Armenian', 'homoglyph', 0.9, 'Armenian feh resembles f')
);

// Georgian (Mkhedruli)
entries.push(
  entry('ა', 'a', 'Georgian', 'homoglyph', 0.95, 'Georgian an resembles a'),
  entry('ბ', 'b', 'Georgian', 'homoglyph', 0.95, 'Georgian ban resembles b'),
  entry('გ', 'g', 'Georgian', 'homoglyph', 0.9, 'Georgian gan resembles g'),
  entry('დ', 'd', 'Georgian', 'homoglyph', 0.9, 'Georgian don resembles d'),
  entry('ე', 'e', 'Georgian', 'homoglyph', 0.95, 'Georgian en resembles e'),
  entry('ვ', 'v', 'Georgian', 'homoglyph', 0.95, 'Georgian vin resembles v'),
  entry('ზ', 'z', 'Georgian', 'homoglyph', 0.9, 'Georgian zen resembles z'),
  entry('თ', 't', 'Georgian', 'homoglyph', 0.9, 'Georgian tan resembles t'),
  entry('ი', 'i', 'Georgian', 'homoglyph', 0.95, 'Georgian in resembles i'),
  entry('კ', 'k', 'Georgian', 'homoglyph', 0.9, 'Georgian kani resembles k'),
  entry('ლ', 'l', 'Georgian', 'homoglyph', 0.95, 'Georgian las resembles l'),
  entry('მ', 'm', 'Georgian', 'homoglyph', 0.95, 'Georgian man resembles m'),
  entry('ნ', 'n', 'Georgian', 'homoglyph', 0.95, 'Georgian nar resembles n'),
  entry('ო', 'o', 'Georgian', 'homoglyph', 0.95, 'Georgian on resembles o'),
  entry('პ', 'p', 'Georgian', 'homoglyph', 0.9, 'Georgian par resembles p'),
  entry('ჟ', 'j', 'Georgian', 'homoglyph', 0.85, 'Georgian zhar resembles j'),
  entry('რ', 'r', 'Georgian', 'homoglyph', 0.9, 'Georgian rae resembles r'),
  entry('ს', 's', 'Georgian', 'homoglyph', 0.95, 'Georgian san resembles s'),
  entry('ტ', 't', 'Georgian', 'homoglyph', 0.9, 'Georgian tar resembles t'),
  entry('უ', 'u', 'Georgian', 'homoglyph', 0.95, 'Georgian un resembles u'),
  entry('ფ', 'p', 'Georgian', 'homoglyph', 0.9, 'Georgian phar resembles p'),
  entry('ქ', 'k', 'Georgian', 'homoglyph', 0.9, 'Georgian khar resembles k'),
  entry('ღ', 'g', 'Georgian', 'homoglyph', 0.85, 'Georgian ghan resembles g'),
  entry('ყ', 'q', 'Georgian', 'homoglyph', 0.85, 'Georgian qar resembles q'),
  entry('შ', 'w', 'Georgian', 'homoglyph', 0.9, 'Georgian shin resembles w'),
  entry('ჩ', 'ch', 'Georgian', 'homoglyph', 0.85, 'Georgian chin resembles ch'),
  entry('ც', 'c', 'Georgian', 'homoglyph', 0.9, 'Georgian tsin resembles c'),
  entry('ძ', 'z', 'Georgian', 'homoglyph', 0.85, 'Georgian dzil resembles z'),
  entry('წ', 'ts', 'Georgian', 'homoglyph', 0.8, 'Georgian tsil resembles ts'),
  entry('ჭ', 'ch', 'Georgian', 'homoglyph', 0.8, 'Georgian char resembles ch'),
  entry('ხ', 'x', 'Georgian', 'homoglyph', 0.9, 'Georgian khan resembles x'),
  entry('ჯ', 'j', 'Georgian', 'homoglyph', 0.85, 'Georgian jhan resembles j'),
  entry('ჰ', 'h', 'Georgian', 'homoglyph', 0.9, 'Georgian hae resembles h')
);

// Arabic / Persian look-alikes
entries.push(
  // Arabic-Indic digits
  entry('٠', '0', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit zero'),
  entry('١', '1', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit one'),
  entry('٢', '2', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit two'),
  entry('٣', '3', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit three'),
  entry('٤', '4', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit four'),
  entry('٥', '5', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit five'),
  entry('٦', '6', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit six'),
  entry('٧', '7', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit seven'),
  entry('٨', '8', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit eight'),
  entry('٩', '9', 'Arabic', 'digit', 1.0, 'Arabic-Indic digit nine'),
  // Extended Arabic-Indic digits (Persian)
  entry('۰', '0', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit zero'),
  entry('۱', '1', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit one'),
  entry('۲', '2', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit two'),
  entry('۳', '3', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit three'),
  entry('۴', '4', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit four'),
  entry('۵', '5', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit five'),
  entry('۶', '6', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit six'),
  entry('۷', '7', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit seven'),
  entry('۸', '8', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit eight'),
  entry('۹', '9', 'Arabic', 'digit', 1.0, 'Extended Arabic-Indic digit nine'),
  // Persian / Arabic letters
  entry('ا', 'l', 'Arabic', 'homoglyph', 0.9, 'Arabic alif resembles l'),
  entry('ٱ', 'l', 'Arabic', 'homoglyph', 0.9, 'Arabic alif with wasla resembles l'),
  entry('ب', 'b', 'Arabic', 'near-homoglyph', 0.8, 'Arabic ba resembles b'),
  entry('ت', 't', 'Arabic', 'near-homoglyph', 0.8, 'Arabic ta resembles t'),
  entry('ث', 'th', 'Arabic', 'near-homoglyph', 0.75, 'Arabic tha resembles th'),
  entry('ج', 'j', 'Arabic', 'near-homoglyph', 0.75, 'Arabic jeem resembles j'),
  entry('ح', 'h', 'Arabic', 'near-homoglyph', 0.75, 'Arabic hah resembles h'),
  entry('خ', 'kh', 'Arabic', 'near-homoglyph', 0.75, 'Arabic kha resembles kh'),
  entry('د', 'd', 'Arabic', 'near-homoglyph', 0.85, 'Arabic dal resembles d'),
  entry('ذ', 'dh', 'Arabic', 'near-homoglyph', 0.75, 'Arabal thal resembles dh'),
  entry('ر', 'r', 'Arabic', 'near-homoglyph', 0.85, 'Arabic ra resembles r'),
  entry('ز', 'z', 'Arabic', 'near-homoglyph', 0.8, 'Arabic zay resembles z'),
  entry('س', 's', 'Arabic', 'near-homoglyph', 0.8, 'Arabic seen resembles s'),
  entry('ش', 'w', 'Arabic', 'near-homoglyph', 0.85, 'Arabic sheen resembles w'),
  entry('ص', 's', 'Arabic', 'near-homoglyph', 0.75, 'Arabic sad resembles s'),
  entry('ض', 'd', 'Arabic', 'near-homoglyph', 0.75, 'Arabic dad resembles d'),
  entry('ط', 't', 'Arabic', 'near-homoglyph', 0.75, 'Arabic tah resembles t'),
  entry('ظ', 'z', 'Arabic', 'near-homoglyph', 0.75, 'Arabic zah resembles z'),
  entry('ع', 'a', 'Arabic', 'near-homoglyph', 0.7, 'Arabic ain resembles a'),
  entry('غ', 'gh', 'Arabic', 'near-homoglyph', 0.7, 'Arabic ghain resembles gh'),
  entry('ف', 'f', 'Arabic', 'near-homoglyph', 0.8, 'Arabic feh resembles f'),
  entry('ق', 'q', 'Arabic', 'near-homoglyph', 0.75, 'Arabic qaf resembles q'),
  entry('ك', 'k', 'Arabic', 'near-homoglyph', 0.8, 'Arabic kaf resembles k'),
  entry('ک', 'k', 'Arabic', 'homoglyph', 0.9, 'Persian keheh resembles k'),
  entry('گ', 'g', 'Arabic', 'homoglyph', 0.85, 'Persian gaf resembles g'),
  entry('ل', 'l', 'Arabic', 'homoglyph', 0.9, 'Arabic lam resembles l'),
  entry('م', 'm', 'Arabic', 'homoglyph', 0.9, 'Arabic meem resembles m'),
  entry('ن', 'n', 'Arabic', 'homoglyph', 0.9, 'Arabic noon resembles n'),
  entry('ه', 'o', 'Arabic', 'homoglyph', 0.85, 'Arabic heh resembles o'),
  entry('و', 'w', 'Arabic', 'homoglyph', 0.9, 'Arabic waw resembles w'),
  entry('ي', 'y', 'Arabic', 'homoglyph', 0.85, 'Arabic yeh resembles y'),
  entry('ی', 'y', 'Arabic', 'homoglyph', 0.9, 'Persian yeh resembles y'),
  entry('ى', 'y', 'Arabic', 'homoglyph', 0.85, 'Arabic alef maksura resembles y'),
  entry('پ', 'p', 'Arabic', 'homoglyph', 0.85, 'Persian peh resembles p'),
  entry('چ', 'ch', 'Arabic', 'near-homoglyph', 0.8, 'Persian cheh resembles ch'),
  entry('ژ', 'z', 'Arabic', 'near-homoglyph', 0.8, 'Persian zheh resembles z'),
  entry('ڤ', 'v', 'Arabic', 'homoglyph', 0.85, 'Arabic veh resembles v'),
  entry('ں', 'n', 'Arabic', 'near-homoglyph', 0.8, 'Arabic noon ghunna resembles n')
);

// CJK fullwidth forms
pushRange(entries, 0xff10, 0xff19, '0123456789'.split(''), 'CJK', 'digit', 1.0, 'CJK fullwidth digit');
pushRange(entries, 0xff21, 0xff3a, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'CJK', 'homoglyph', 1.0, 'CJK fullwidth capital');
pushRange(entries, 0xff41, 0xff5a, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'CJK', 'homoglyph', 1.0, 'CJK fullwidth small');

// Mathematical alphanumeric symbols → ASCII
// Bold A-Z, a-z (U+1D400-U+1D433)
pushRange(entries, 0x1d400, 0x1d419, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical bold capital');
pushRange(entries, 0x1d41a, 0x1d433, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical bold small');
// Italic A-Z, a-z (U+1D434-U+1D44F, U+1D44E? Actually 1D434-1D44F caps, 1D44E? No, 1D44E is italic small e. Range is 1D434-1D44F caps (22), 1D44E-1D467 smalls. Let me be precise: caps 1D434-1D44F = A-Z? Actually 1D434=A, 1D44F=Z? 1D434 + 25 = 1D44D. Hmm. Unicode math italic caps: 𝐴 U+1D434, 𝐵 1D435, ... Z is 1D44D. Then a is 1D44E, z is 1D467. So caps 1D434-1D44D, smalls 1D44E-1D467.
pushRange(entries, 0x1d434, 0x1d44d, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical italic capital');
pushRange(entries, 0x1d44e, 0x1d467, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical italic small');
// Bold italic A-Z, a-z (U+1D468-U+1D49B)
pushRange(entries, 0x1d468, 0x1d481, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical bold italic capital');
pushRange(entries, 0x1d482, 0x1d49b, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical bold italic small');
// Sans-serif A-Z, a-z (U+1D5A0-U+1D5D3)
pushRange(entries, 0x1d5a0, 0x1d5b9, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical sans-serif capital');
pushRange(entries, 0x1d5ba, 0x1d5d3, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical sans-serif small');
// Sans-serif bold A-Z, a-z (U+1D5D4-U+1D607)
pushRange(entries, 0x1d5d4, 0x1d5ed, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical sans-serif bold capital');
pushRange(entries, 0x1d5ee, 0x1d607, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical sans-serif bold small');
// Sans-serif italic A-Z, a-z (U+1D608-U+1D63B)
pushRange(entries, 0x1d608, 0x1d621, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical sans-serif italic capital');
pushRange(entries, 0x1d622, 0x1d63b, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical sans-serif italic small');
// Sans-serif bold italic A-Z, a-z (U+1D63C-U+1D66F)
pushRange(entries, 0x1d63c, 0x1d655, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical sans-serif bold italic capital');
pushRange(entries, 0x1d656, 0x1d66f, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.9, 'Mathematical sans-serif bold italic small');
// Monospace A-Z, a-z (U+1D670-U+1D6A3)
pushRange(entries, 0x1d670, 0x1d689, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical monospace capital');
pushRange(entries, 0x1d68a, 0x1d6a3, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.95, 'Mathematical monospace small');
// Script / calligraphic (U+1D49C-U+1D4B5 caps, U+1D4B6-U+1D4CF smalls) — many look unlike ASCII; include with lower score
pushRange(entries, 0x1d49c, 0x1d4b5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.6, 'Mathematical script capital');
pushRange(entries, 0x1d4b6, 0x1d4cf, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.6, 'Mathematical script small');
// Fraktur (U+1D504-U+1D51D caps, U+1D51E-U+1D537 smalls)
pushRange(entries, 0x1d504, 0x1d51d, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.65, 'Mathematical fraktur capital');
pushRange(entries, 0x1d51e, 0x1d537, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.65, 'Mathematical fraktur small');
// Double-struck (U+1D538-U+1D551 caps, U+1D552-U+1D56B smalls)
pushRange(entries, 0x1d538, 0x1d551, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.75, 'Mathematical double-struck capital');
pushRange(entries, 0x1d552, 0x1d56b, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.75, 'Mathematical double-struck small');
// Bold fraktur (U+1D56C-U+1D585 caps, U+1D586-U+1D59F smalls)
pushRange(entries, 0x1d56c, 0x1d585, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'stylistic', 0.65, 'Mathematical bold fraktur capital');
pushRange(entries, 0x1d586, 0x1d59f, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'stylistic', 0.65, 'Mathematical bold fraktur small');
// Mathematical digits
pushRange(entries, 0x1d7ce, 0x1d7d7, '0123456789'.split(''), 'Common', 'digit', 0.95, 'Mathematical bold digit');
pushRange(entries, 0x1d7d8, 0x1d7e1, '0123456789'.split(''), 'Common', 'digit', 0.9, 'Mathematical double-struck digit');
pushRange(entries, 0x1d7e2, 0x1d7eb, '0123456789'.split(''), 'Common', 'digit', 0.95, 'Mathematical sans-serif digit');
pushRange(entries, 0x1d7ec, 0x1d7f5, '0123456789'.split(''), 'Common', 'digit', 0.95, 'Mathematical sans-serif bold digit');
pushRange(entries, 0x1d7f6, 0x1d7ff, '0123456789'.split(''), 'Common', 'digit', 0.95, 'Mathematical monospace digit');

// Enclosed alphanumerics
pushRange(entries, 0x2460, 0x2473, '1234567891011121314151617181920'.match(/\d{1,2}/g), 'Common', 'digit', 0.9, 'Circled digit');
// The above 2460-2473 maps 1-20. Need to be careful: targets array must have 20 items. '1234567891011121314151617181920'.match(/\d{1,2}/g) gives ['1','2',...'20']. Yes.
entries.push(entry('⓪', '0', 'Common', 'digit', 0.9, 'Circled digit zero'));
pushRange(entries, 0x24b6, 0x24cf, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Common', 'homoglyph', 0.9, 'Circled capital');
pushRange(entries, 0x24d0, 0x24e9, 'abcdefghijklmnopqrstuvwxyz'.split(''), 'Common', 'homoglyph', 0.9, 'Circled small');
// Parenthesized digits ⑴-⒇ (U+2474-2487) → 1-20
pushRange(entries, 0x2474, 0x2487, '1234567891011121314151617181920'.match(/\d{1,2}/g), 'Common', 'digit', 0.85, 'Parenthesized digit');
// Full stop digits ⒈-⒛ (U+2488-249B) → 1-20
pushRange(entries, 0x2488, 0x249b, '1234567891011121314151617181920'.match(/\d{1,2}/g), 'Common', 'digit', 0.85, 'Digit with full stop');

// Small capitals (U+1D00-U+1D21 minus gaps)
const smallCapTargets = 'abcdefghijklmnopqrstuvwxyz'.split('');
// U+1D00-U+1D21 covers most. Map sequentially.
pushRange(entries, 0x1d00, 0x1d21, smallCapTargets, 'Latin', 'homoglyph', 0.9, 'Latin small capital');
// Small capital extra letters
entries.push(entry('ʙ', 'b', 'Latin', 'homoglyph', 0.9, 'Small capital B'));
entries.push(entry('ɢ', 'g', 'Latin', 'homoglyph', 0.9, 'Small capital G'));
entries.push(entry('ʜ', 'h', 'Latin', 'homoglyph', 0.9, 'Small capital H'));
entries.push(entry('ᴊ', 'j', 'Latin', 'homoglyph', 0.9, 'Small capital J'));
entries.push(entry('ᴋ', 'k', 'Latin', 'homoglyph', 0.9, 'Small capital K'));
entries.push(entry('ʟ', 'l', 'Latin', 'homoglyph', 0.9, 'Small capital L'));
entries.push(entry('ᴍ', 'm', 'Latin', 'homoglyph', 0.9, 'Small capital M'));
entries.push(entry('ɴ', 'n', 'Latin', 'homoglyph', 0.9, 'Small capital N'));
entries.push(entry('ᴘ', 'p', 'Latin', 'homoglyph', 0.9, 'Small capital P'));
entries.push(entry('ʀ', 'r', 'Latin', 'homoglyph', 0.9, 'Small capital R'));
entries.push(entry('ᴛ', 't', 'Latin', 'homoglyph', 0.9, 'Small capital T'));
entries.push(entry('ᴜ', 'u', 'Latin', 'homoglyph', 0.9, 'Small capital U'));
entries.push(entry('ᴠ', 'v', 'Latin', 'homoglyph', 0.9, 'Small capital V'));
entries.push(entry('ᴡ', 'w', 'Latin', 'homoglyph', 0.9, 'Small capital W'));
entries.push(entry('ʏ', 'y', 'Latin', 'homoglyph', 0.9, 'Small capital Y'));
entries.push(entry('ᴢ', 'z', 'Latin', 'homoglyph', 0.9, 'Small capital Z'));

// IPA / Latin extended look-alikes
entries.push(
  entry('ɑ', 'a', 'Latin', 'homoglyph', 0.95, 'Latin alpha resembles a'),
  entry('ɐ', 'a', 'Latin', 'near-homoglyph', 0.85, 'Turned a resembles a'),
  entry('ɒ', 'a', 'Latin', 'near-homoglyph', 0.85, 'Turned alpha resembles a'),
  entry('ɓ', 'b', 'Latin', 'near-homoglyph', 0.85, 'Hooked b resembles b'),
  entry('ƅ', 'b', 'Latin', 'homoglyph', 0.9, 'Latin letter tone six resembles b'),
  entry('ɔ', 'c', 'Latin', 'homoglyph', 0.9, 'Open o resembles c'),
  entry('ɕ', 'c', 'Latin', 'near-homoglyph', 0.8, 'Curly c resembles c'),
  entry('ɖ', 'd', 'Latin', 'near-homoglyph', 0.85, 'Retroflex d resembles d'),
  entry('ɗ', 'd', 'Latin', 'near-homoglyph', 0.85, 'Hooked d resembles d'),
  entry('đ', 'd', 'Latin', 'homoglyph', 0.9, 'D with stroke resembles d'),
  entry('ƌ', 'd', 'Latin', 'near-homoglyph', 0.85, 'D with topbar resembles d'),
  entry('ə', 'e', 'Latin', 'homoglyph', 0.9, 'Schwa resembles e'),
  entry('ɛ', 'e', 'Latin', 'homoglyph', 0.9, 'Open e resembles e'),
  entry('ɜ', 'e', 'Latin', 'homoglyph', 0.9, 'Reversed open e resembles e'),
  entry('ɘ', 'e', 'Latin', 'near-homoglyph', 0.85, 'Reversed e resembles e'),
  entry('ɞ', 'e', 'Latin', 'near-homoglyph', 0.8, 'Closed reversed open e resembles e'),
  entry('ɟ', 'j', 'Latin', 'near-homoglyph', 0.8, 'Hooked dotless j resembles j'),
  entry('ɠ', 'g', 'Latin', 'near-homoglyph', 0.8, 'Hooked g resembles g'),
  entry('ɡ', 'g', 'Latin', 'homoglyph', 0.95, 'Script g resembles g'),
  entry('ɣ', 'y', 'Latin', 'near-homoglyph', 0.8, 'Gamma resembles y'),
  entry('ɤ', 'y', 'Latin', 'near-homoglyph', 0.8, "Ram's horns resembles y"),
  entry('ɥ', 'h', 'Latin', 'near-homoglyph', 0.8, 'Turned h resembles h'),
  entry('ɦ', 'h', 'Latin', 'near-homoglyph', 0.85, 'Hooked h resembles h'),
  entry('ɨ', 'i', 'Latin', 'homoglyph', 0.9, 'Barred i resembles i'),
  entry('ɩ', 'i', 'Latin', 'homoglyph', 0.9, 'Iota resembles i'),
  entry('ɪ', 'i', 'Latin', 'homoglyph', 0.95, 'Small capital I resembles i'),
  entry('ɫ', 'l', 'Latin', 'homoglyph', 0.9, 'L with belt resembles l'),
  entry('ɬ', 'l', 'Latin', 'near-homoglyph', 0.85, 'L with retroflex hook resembles l'),
  entry('ɭ', 'l', 'Latin', 'near-homoglyph', 0.85, 'Retroflex l resembles l'),
  entry('ƙ', 'k', 'Latin', 'near-homoglyph', 0.85, 'K with hook resembles k'),
  entry('ɱ', 'm', 'Latin', 'near-homoglyph', 0.85, 'M with hook resembles m'),
  entry('ɲ', 'n', 'Latin', 'near-homoglyph', 0.85, 'N with left hook resembles n'),
  entry('ɳ', 'n', 'Latin', 'near-homoglyph', 0.85, 'Retroflex n resembles n'),
  entry('ŋ', 'n', 'Latin', 'near-homoglyph', 0.85, 'Eng resembles n'),
  entry('ɴ', 'n', 'Latin', 'homoglyph', 0.9, 'Small capital N resembles n'),
  entry('ɵ', 'o', 'Latin', 'homoglyph', 0.9, 'Barred o resembles o'),
  entry('ɷ', 'o', 'Latin', 'near-homoglyph', 0.85, 'Closed omega resembles o'),
  entry('ø', 'o', 'Latin', 'homoglyph', 0.9, 'O with stroke resembles o'),
  entry('ɸ', 'p', 'Latin', 'homoglyph', 0.9, 'Latin phi resembles p'),
  entry('ƿ', 'p', 'Latin', 'near-homoglyph', 0.8, 'Wynn resembles p'),
  entry('ʁ', 'r', 'Latin', 'near-homoglyph', 0.85, 'Small capital inverted R resembles r'),
  entry('ɽ', 'r', 'Latin', 'near-homoglyph', 0.85, 'Retroflex r resembles r'),
  entry('ɾ', 'r', 'Latin', 'near-homoglyph', 0.85, 'R with fishhook resembles r'),
  entry('ʀ', 'r', 'Latin', 'homoglyph', 0.9, 'Small capital R resembles r'),
  entry('ʂ', 's', 'Latin', 'near-homoglyph', 0.85, 'S with hook resembles s'),
  entry('ʃ', 's', 'Latin', 'near-homoglyph', 0.85, 'Esh resembles s'),
  entry('ʈ', 't', 'Latin', 'near-homoglyph', 0.85, 'Retroflex t resembles t'),
  entry('ƫ', 't', 'Latin', 'near-homoglyph', 0.85, 'T with palatal hook resembles t'),
  entry('ʉ', 'u', 'Latin', 'homoglyph', 0.9, 'U bar resembles u'),
  entry('ʊ', 'u', 'Latin', 'homoglyph', 0.9, 'Upsilon resembles u'),
  entry('ʋ', 'v', 'Latin', 'homoglyph', 0.9, 'V with hook resembles v'),
  entry('ʌ', 'v', 'Latin', 'homoglyph', 0.9, 'Turned v resembles v'),
  entry('ʍ', 'w', 'Latin', 'near-homoglyph', 0.85, 'Turned w resembles w'),
  entry('ɯ', 'w', 'Latin', 'near-homoglyph', 0.85, 'Turned m resembles w'),
  entry('ʎ', 'y', 'Latin', 'near-homoglyph', 0.85, 'Turned y resembles y'),
  entry('ʏ', 'y', 'Latin', 'homoglyph', 0.9, 'Small capital Y resembles y'),
  entry('ʑ', 'z', 'Latin', 'near-homoglyph', 0.85, 'Curly z resembles z'),
  entry('ʐ', 'z', 'Latin', 'near-homoglyph', 0.85, 'Retroflex z resembles z'),
  entry('ʒ', 'z', 'Latin', 'near-homoglyph', 0.85, 'Ezh resembles z')
);

// Additional homoglyphs
entries.push(
  entry('ℋ', 'H', 'Common', 'stylistic', 0.85, 'Script capital H'),
  entry('ℌ', 'H', 'Common', 'stylistic', 0.85, 'Black-letter capital H'),
  entry('ℍ', 'H', 'Common', 'stylistic', 0.85, 'Double-struck capital H'),
  entry('ℐ', 'I', 'Common', 'stylistic', 0.85, 'Script capital I'),
  entry('ℑ', 'I', 'Common', 'stylistic', 0.85, 'Black-letter capital I'),
  entry('ℒ', 'L', 'Common', 'stylistic', 0.85, 'Script capital L'),
  entry('ℓ', 'l', 'Common', 'stylistic', 0.9, 'Script small l'),
  entry('ℕ', 'N', 'Common', 'stylistic', 0.85, 'Double-struck capital N'),
  entry('ℙ', 'P', 'Common', 'stylistic', 0.85, 'Double-struck capital P'),
  entry('ℚ', 'Q', 'Common', 'stylistic', 0.85, 'Double-struck capital Q'),
  entry('ℝ', 'R', 'Common', 'stylistic', 0.85, 'Double-struck capital R'),
  entry('ℤ', 'Z', 'Common', 'stylistic', 0.85, 'Double-struck capital Z'),
  entry('ℨ', 'Z', 'Common', 'stylistic', 0.8, 'Black-letter capital Z'),
  entry('ℬ', 'B', 'Common', 'stylistic', 0.8, 'Script capital B'),
  entry('ℭ', 'C', 'Common', 'stylistic', 0.8, 'Black-letter capital C'),
  entry('ℰ', 'E', 'Common', 'stylistic', 0.8, 'Script capital E'),
  entry('ℱ', 'F', 'Common', 'stylistic', 0.8, 'Script capital F'),
  entry('ℳ', 'M', 'Common', 'stylistic', 0.8, 'Script capital M'),
  entry('ℴ', 'o', 'Common', 'stylistic', 0.8, 'Script small o'),
  entry('ℎ', 'h', 'Common', 'stylistic', 0.85, 'Planck constant resembles h'),
  entry('ℯ', 'e', 'Common', 'stylistic', 0.85, 'Natural exponent resembles e'),
  entry('ℊ', 'g', 'Common', 'stylistic', 0.8, 'Script small g'),
  entry('ℴ', 'o', 'Common', 'stylistic', 0.8, 'Script small o'),
  entry('℩', 'i', 'Common', 'symbol', 0.8, 'Turned iota resembles i')
);

// Remove duplicates by char (keep first occurrence)
const seen = new Set();
const uniqueEntries = [];
for (const e of entries) {
  if (!seen.has(e.char)) {
    seen.add(e.char);
    uniqueEntries.push(e);
  }
}

const output = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  count: uniqueEntries.length,
  categories: ['homoglyph', 'near-homoglyph', 'stylistic', 'diacritic', 'digit', 'symbol'],
  entries: uniqueEntries,
};

const outPath = path.resolve(__dirname, '..', 'platform', 'db', 'confusables.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Wrote ${uniqueEntries.length} confusable entries to ${outPath}`);
