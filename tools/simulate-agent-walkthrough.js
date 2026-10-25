#!/usr/bin/env node
/**
 * One-off: simulate the AGENT-GUIDE walkthrough against the package folder.
 * Verifies every file the guide references exists, every gate's expected
 * numbers match a real prep run, and every yaml dataset path resolves.
 * Read-only except running the prep script into a temp output.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const PKG = path.join(__dirname, '..', '..', 'punicodex-training-package');
let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('── Package simulation: agent walkthrough ──\n');

// Phase 0/1 prerequisites: files the guide assumes
console.log('Phase 0–1 environment references:');
check('AGENT-GUIDE.md exists', fs.existsSync(path.join(PKG, 'AGENT-GUIDE.md')));
check('HUMAN-README.md exists', fs.existsSync(path.join(PKG, 'HUMAN-README.md')));
check('ORACLE-SITE-CONTEXT.md exists', fs.existsSync(path.join(PKG, 'ORACLE-SITE-CONTEXT.md')));
check('prep script exists', fs.existsSync(path.join(PKG, 'scripts', 'prepare-finetune-data.js')));
check('yaml exists', fs.existsSync(path.join(PKG, 'docs', 'fine-tuning', 'axolotl-5090-chat.yaml')));
check('corpus manifest exists', fs.existsSync(path.join(PKG, 'data', 'corpus', 'manifest.json')));

// Phase 2: run prep into the package and compare to the guide's Gate 2.
console.log('\nPhase 2 data prep (live run inside package):');
try {
  const out = execSync('node scripts/prepare-finetune-data.js', { cwd: PKG, encoding: 'utf8' });
  console.log(out.trim().split('\n').map((l) => `        ${l}`).join('\n'));
  check(
    'Gate 2 line 1 matches guide',
    out.includes('train:      61268/65707 written (3927 skipped)')
  );
  check(
    'Gate 2 line 2 matches guide',
    out.includes('eval:       15388/16454 written (966 skipped)')
  );
  check(
    'Gate 2 line 3 matches guide',
    out.includes('scholarly:  3398 records (scholars 1067, lore 1135, blog 1196; 0 empty sources skipped)')
  );
} catch (e) {
  check('prep script runs in package', false, e.message.slice(0, 200));
}

// Phase 3: yaml dataset paths resolve after prep
console.log('\nPhase 3 yaml dataset paths:');
const yamlText = fs.readFileSync(path.join(PKG, 'docs', 'fine-tuning', 'axolotl-5090-chat.yaml'), 'utf8');
for (const m of yamlText.matchAll(/path:\s*(\S+)/g)) {
  const rel = m[1].replace(/^\.\//, '');
  // dataset_prepared_path/output_dir are created BY training, not inputs
  if (rel === 'prepared' || rel === 'out') {
    console.log(`  SKIP  yaml path ${m[1]} (created during training)`);
    continue;
  }
  const p = path.join(PKG, rel);
  check(`yaml path ${m[1]}`, fs.existsSync(p));
}
check('yaml num_epochs: 4', /num_epochs:\s*4/.test(yamlText));
check('yaml sequence_len: 4096', /sequence_len:\s*4096/.test(yamlText));

// Phase 4: merge/GGUF references
console.log('\nPhase 4–5 export/test references:');
check('yaml references out/merged implicitly (output_dir: ./out)', /output_dir:\s*\.\/out/.test(yamlText));
const guide = fs.readFileSync(path.join(PKG, 'AGENT-GUIDE.md'), 'utf8');
check('guide has checkpoint resume recovery', guide.includes('--resume_from_checkpoint'));
check('guide smoke battery has 13 prompts', (guide.match(/\$BIN -m punicodex-oracle-q8_0\.gguf/g) || []).length === 13);
check('guide gates base-model download', guide.includes('huggingface-cli download Qwen/Qwen3-8B'));
check('guide has baseline comparison', guide.includes('COMPARISON.md') && guide.includes('convert_hf_to_gguf.py base-model'));
check('guide binds servers to localhost', guide.includes('127.0.0.1'));
check('guide mentions zip for return bundle', guide.includes('punicodex-oracle-return.zip'));

// Question coverage evidence: what the corpus actually teaches
console.log('\nCorpus coverage evidence (manifest task distribution):');
const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'data', 'corpus', 'manifest.json'), 'utf8'));
const tasks = manifest.counts.chatTrainByTask || {};
for (const [k, v] of Object.entries(tasks).sort((a, b) => b[1] - a[1])) {
  console.log(`        ${k}: ${v}`);
}

console.log(`\n── Result: ${pass} pass, ${fail} fail ──`);
if (failures.length) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
