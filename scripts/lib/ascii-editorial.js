function isAsciiForm(value) {
  return /^[\x00-\x7F]+$/.test(String(value || ''));
}

function asciiEditorialText(value) {
  return String(value || '')
    .replace(/[\u200B\u200C]/g, '')
    .replace(
      /PuniCodex therefore treats \*\*([^*]+)\*\* as the scholarly citation form and \*\*([^*]+)\*\* as the DNS compromise\./g,
      'PuniCodex treats **$1** as the scholarly citation form; the lowercase form **$2** differs only in capitalization.'
    )
    .replace(
      /The ASCII form \*([^*]+)\* is a DNS compromise; the capitalised restoration \*\*([^*]+)\*\* is the conventional citation form\./g,
      'The capitalised conventional citation form is **$2**; the lowercase form *$1* differs only in capitalization.'
    )
    .replace(
      /The ASCII form \*([^*]+)\* is a practical DNS compromise; the restored form is (the scholarly citation form[^.\n]*)\./g,
      'The conventional spelling **$1** is $2; the lowercase form *$1* differs only in capitalization.'
    )
    .replace(
      /Restoring ([^.\n]+?) in Unicode preserves the name's cultural specificity against the flattening force of plain ASCII\./g,
      'Preserving the conventional spelling $1 keeps the name attached to its cultural and scholarly record.'
    )
    .replace(
      /The ASCII form "([^"]+)" is a DNS compromise; the restoration "([^"]+)" preserves the name's scholarly dignity\./g,
      'The conventional spelling "$2" is already written in Latin letters; the lowercase form "$1" differs only in capitalization.'
    )
    .replace(
      /Say "[^"]+" with the stress and length implied by the scholarly restoration "([^"]+)"\./g,
      'Read "$1" using the reconstructed pronunciation above; the conventional Latin spelling adds no diacritic marks.'
    )
    .replace(
      /The restoration ([^.\n]+?) keeps the prosodic information visible even when the name is typed in plain ASCII\./g,
      'The reconstructed pronunciation of $1 is explained separately from its conventional Latin spelling, which adds no diacritic marks.'
    )
    .replace(
      /The PuniCodex restoration ([^.\n]+?) preserves the prosodic features that rhapsodes would have articulated\./g,
      'The conventional spelling $1 is considered alongside the phonological evidence from the original language.'
    )
    .replace(
      /The restored form ([^.\n]+?) carries the same vowel quantities that these epithets inherited in oral performance\./g,
      'The conventional spelling $1 provides a stable reference; the original language and reconstructed pronunciation carry the phonological detail.'
    )
    .replace(
      /Preserved as a flagship temple despite the unregistrable plain-ASCII form\./g,
      'Preserved as a flagship temple with its canonical scholarly spelling and supporting evidence.'
    )
    .replace(/DNS compromise/g, 'lowercase ASCII equivalent')
    .replace(/domain-name compromise/g, 'lowercase ASCII equivalent')
    .replace(/unregistrable plain-ASCII form/g, 'ASCII-identical canonical spelling')
    .replace(/the marks are the message/g, 'the evidence is the message')
    .replace(/carries the name's full information/g, 'provides a consistent scholarly reference')
    .replace(/The restoration aSCII-equivalent form/g, 'The displayed form is ASCII-equivalent')
    .replace(/The restoration ASCII-equivalent form/g, 'The displayed form is ASCII-equivalent')
    .replace(/canonical Unicode restoration/g, 'canonical restoration')
    .replace(/Unicode Restoration/g, 'Canonical Restoration')
    .replace(/Unicode restoration/g, 'canonical restoration')
    .replace(/unicode restoration/g, 'canonical restoration')
    .replace(/Unicode orthography/g, 'canonical orthography')
    .replace(/Unicode character breakdown/gi, 'Character breakdown')
    .replace(/Unicode domain/g, 'canonical domain')
    .replace(/Unicode form/g, 'canonical form')
    .replace(/Unicode spelling/g, 'canonical spelling')
    .replace(/Unicode name/g, 'canonical name')
    .replace(/restored Unicode temple/g, 'canonical digital temple')
    .replace(/Unicode and ASCII forms/g, 'canonical and ASCII forms')
    .replace(/ASCII and Unicode forms/g, 'ASCII and canonical forms')
    .replace(/no Punycode encoding/g, 'no special domain encoding')
    .replace(/Punycode/g, 'domain encoding')
    .replace(/punycode/g, 'domain encoding')
    .replace(/IDNA 2008/g, 'domain-name standards')
    .replace(/\bIDN\b/g, 'domain naming')
    .replace(/\bUnicode\b/g, 'canonical')
    .replace(/\bunicode\b/g, 'canonical')
    .replace(/canonical canonical/g, 'canonical')
    .replace(/canonical Restoration/g, 'Canonical Restoration')
    .replace(/aSCII/g, 'ASCII');
}

function asciiTempleText(value, entry) {
  if (!isAsciiForm(entry?.unicode)) return String(value || '');
  let rawElement = null;
  let jsonLd = false;
  return String(value || '')
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith('<')) {
        const open = part.match(/^<(script|style)\b/i);
        if (open) {
          rawElement = open[1].toLowerCase();
          jsonLd = rawElement === 'script' && /type=["']application\/ld\+json["']/i.test(part);
        } else if (/^<\/(script|style)>/i.test(part)) {
          rawElement = null;
          jsonLd = false;
        }
        return part.replace(
          /\b(content|alt|title|aria-label)="([^"]*)"/gi,
          (_match, name, content) => `${name}="${asciiEditorialText(content)}"`
        );
      }
      if (rawElement && !jsonLd) return part;
      return asciiEditorialText(part).replace(/Authentic unicode domains\./g, 'Attested names.');
    })
    .join('');
}

module.exports = { isAsciiForm, asciiEditorialText, asciiTempleText };
