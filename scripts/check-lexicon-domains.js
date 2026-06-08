const fs = require('fs');
const lex = fs.readFileSync('type/js/lexicon.js', 'utf8');

const flagshipIds = ['selene','demeter','artemis','zeus','poseidon','hera','athena','hekate','nike','hades','hermes','hephaistos','persephone','prometheus','apollon','ares','aphrodite'];

for (const id of flagshipIds) {
    const idMatch = new RegExp(`id:\s*["']${id}["']`);
    const idx = lex.search(idMatch);
    if (idx === -1) {
        console.log(id + ': NOT FOUND');
        continue;
    }
    let braceDepth = 0;
    let blockStart = idx;
    while (blockStart > 0 && lex[blockStart] !== '{') blockStart--;
    let blockEnd = blockStart + 1;
    braceDepth = 1;
    while (blockEnd < lex.length && braceDepth > 0) {
        if (lex[blockEnd] === '{') braceDepth++;
        if (lex[blockEnd] === '}') braceDepth--;
        blockEnd++;
    }
    const block = lex.slice(blockStart, blockEnd);
    const unicodeMatch = block.match(/unicode:\s*["']([^"']+)["']/);
    const asciiMatch = block.match(/ascii:\s*["']([^"']+)["']/);
    const variantsMatch = block.match(/variants:\s*\[/);
    const unicode = unicodeMatch ? unicodeMatch[1] : '?';
    const ascii = asciiMatch ? asciiMatch[1] : '?';
    console.log(id + ': unicode=' + unicode + ' ascii=' + ascii + (variantsMatch ? ' has-variants' : ''));
}
