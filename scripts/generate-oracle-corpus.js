#!/usr/bin/env node
/**
 * PuniCodex — Oracle Conversational Corpus Generator (Phase 11)
 *
 * Builds a training corpus that teaches the AI to converse as the PuniCodex
 * Oracle: a scholarly, reverent, technically precise guide to mythological
 * names, Unicode restorations, original scripts, pronunciation, punycode,
 * comparative mythology, and esoteric synthesis.
 *
 * Canonical source: scripts/oracle-persona.json
 * Input: data/corpus/entries.jsonl, scripts/mythology-themes.json
 * Output: data/corpus/oracle-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRng } = require('./rng');

Math.random = createRng();

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const PERSONA_PATH = path.join(ROOT, 'scripts', 'oracle-persona.json');
const THEMES_PATH = path.join(ROOT, 'scripts', 'mythology-themes.json');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'oracle-examples.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadPersona() {
  return JSON.parse(fs.readFileSync(PERSONA_PATH, 'utf8'));
}

function loadThemes() {
  return JSON.parse(fs.readFileSync(THEMES_PATH, 'utf8'));
}

function pick(arr, n, rng = Math.random) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function pickOne(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function sentenceList(items, conj = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items.at(-1)}`;
}

function formatTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function messages(system, user, assistant) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
    { role: 'assistant', content: assistant },
  ];
}

function buildGreetingExamples(persona, count, rng) {
  const examples = [];
  const prompts = persona.taskTypes.oracle_greeting.userPrompts;
  for (let i = 0; i < count; i++) {
    const prompt = prompts[i % prompts.length];
    examples.push({
      id: `oracle-greeting-${String(i + 1).padStart(4, '0')}`,
      entryId: null,
      task: 'oracle_greeting',
      messages: messages(
        persona.systemPrompt,
        prompt,
        `I am the PuniCodex Oracle. I can help you explore mythological names in their original scripts and Unicode restorations, understand pronunciation and etymology, navigate punycode and homograph safety, and trace the patterns that connect ancient symbols with modern thought. I answer from canonical scholarly sources, and I will not help with domain spoofing, impersonation, or trademark infringement.`
      ),
      metadata: { prompt },
    });
  }
  return examples;
}

function buildRestorationExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_restoration.userTemplates;
  const sample = pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const template = templates[i % templates.length];
    const vars = {
      unicode: e.unicode,
      ascii: e.ascii,
      meaning: e.meaning,
      pantheon: e.pantheon,
      punycode: e.punycodeDomain || '',
    };
    const user = formatTemplate(template, vars);
    const assistant = `${e.unicode} is the scholarly Unicode restoration of ${e.ascii}. It encodes to punycode as ${e.punycodeDomain || '[unavailable]'}. The restoration preserves ${e.tierLabel || 'the original orthography'} and means “${e.meaning}” in the ${e.pantheon} tradition. When you see the ASCII form ${e.ascii}, remember that the Unicode form ${e.unicode} is the philologically informed spelling, not merely decoration.`;
    examples.push({
      id: makeId(e.id, 'oracle_restoration', i + 1),
      entryId: e.id,
      task: 'oracle_restoration',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

function buildPronunciationExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_pronunciation.userTemplates;
  const withPron = entries.filter((e) => e.pronunciation?.ipa);
  const sample = withPron.length ? pick(withPron, Math.min(count, withPron.length), rng) : pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const template = templates[i % templates.length];
    const vars = { unicode: e.unicode, ascii: e.ascii };
    const user = formatTemplate(template, vars);
    const p = e.pronunciation;
    const assistant = p?.ipa
      ? `The reconstructed pronunciation of ${e.unicode} is ${p.ipaLabel || p.ipa} (${p.ipa}). An approximate rendering is “${p.approximation}.” This reconstruction reflects ${p.dialect || 'standard scholarly convention'} with ${p.confidence || 'moderate'} confidence.`
      : `We do not yet have a reconstructed IPA for ${e.unicode}. The modern convention is to pronounce it as ${e.ascii}, keeping in mind that ancient phonology differed from English.`;
    examples.push({
      id: makeId(e.id, 'oracle_pronunciation', i + 1),
      entryId: e.id,
      task: 'oracle_pronunciation',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id, hasIpa: !!p?.ipa },
    });
  }
  return examples;
}

function buildMythologyExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_mythology.userTemplates;
  const withLore = entries.filter((e) => e.lore);
  const sample = withLore.length ? pick(withLore, Math.min(count, withLore.length), rng) : pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const template = templates[i % templates.length];
    const vars = { unicode: e.unicode, ascii: e.ascii, meaning: e.meaning, pantheon: e.pantheon };
    const user = formatTemplate(template, vars);
    const lead = e.lore?.mythologyLead || `${e.unicode} is a ${e.pantheon} figure meaning “${e.meaning}.”`;
    const myths = e.lore?.mythologyMyths || [];
    const mythSummary = myths.length
      ? `Key narratives include: ${sentenceList(myths.slice(0, 3).map((m) => m.title))}.`
      : `Stories about ${e.unicode} circulate across several ${e.pantheon} sources.`;
    const assistant = `${lead} ${mythSummary} The figure's domains are reflected in symbols such as ${e.lore?.symbols?.slice(0, 3).map((s) => s.name).join(', ') || 'those recorded in the tradition'}.`;
    examples.push({
      id: makeId(e.id, 'oracle_mythology', i + 1),
      entryId: e.id,
      task: 'oracle_mythology',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

function buildPatternWeavingExamples(entries, themesData, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_pattern_weaving.userTemplates;
  const themes = themesData.themes || [];
  for (let i = 0; i < count && themes.length; i++) {
    const theme = themes[i % themes.length];
    const allIds = Object.values(theme.entries || {}).flat();
    const validIds = allIds.filter((id) => entries.some((e) => e.id === id));
    if (validIds.length < 2) continue;
    const sampleIds = pick(validIds, Math.min(3, validIds.length), rng);
    const sampleEntries = sampleIds.map((id) => entries.find((e) => e.id === id));
    const names = sampleEntries.map((e) => e.unicode);
    const vars = {
      a: names[0],
      b: names[1],
      c: names[2] || names[0],
    };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = `${sentenceList(names)} are masks of the ${theme.label} archetype. ${theme.archetypal_summary} Each tradition names the pattern differently—${sampleEntries.map((e) => `${e.unicode} means “${e.meaning}” in ${e.pantheon}`).join('; ')}—yet the narrative function is the same: ${theme.description}`;
    examples.push({
      id: makeId(sampleEntries[0].id, 'oracle_pattern_weaving', i + 1),
      entryId: sampleEntries[0].id,
      task: 'oracle_pattern_weaving',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { theme: theme.id, sampleIds },
    });
  }
  return examples;
}

function buildModernBridgeExamples(entries, themesData, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_modern_bridge.userTemplates;
  const concepts = persona.taskTypes.oracle_modern_bridge.modernConcepts;
  const mappings = themesData.modern_parallels || [];
  for (let i = 0; i < count && mappings.length; i++) {
    const mapping = mappings[i % mappings.length];
    const e = entries.find((x) => x.id === mapping.entry);
    if (!e) continue;
    const concept = pickOne(mapping.parallels?.length ? mapping.parallels : concepts, rng);
    const vars = { unicode: e.unicode, modern_concept: concept };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = `${e.unicode} (“${e.meaning}”) resonates with ${concept}. The ancient symbol and the modern concept are both attempts to name the same underlying pattern. I would call this an analogy, not an equivalence: ${e.unicode} is how the ${e.pantheon} imagination embodied a force that ${concept.toLowerCase()} names in a different register.`;
    examples.push({
      id: makeId(e.id, 'oracle_modern_bridge', i + 1),
      entryId: e.id,
      task: 'oracle_modern_bridge',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id, concept },
    });
  }
  return examples;
}

function buildBiblicalBridgeExamples(entries, themesData, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_biblical_bridge.userTemplates;
  const bridges = themesData.biblical_bridges || [];
  for (let i = 0; i < count && bridges.length; i++) {
    const bridge = bridges[i % bridges.length];
    const validParallels = (bridge.ancient_parallels || []).filter((p) => entries.some((e) => e.id === p.entry));
    if (validParallels.length === 0) continue;
    const parallel = validParallels[0];
    const e = entries.find((x) => x.id === parallel.entry);
    if (!e) continue;
    const vars = { unicode: e.unicode, biblical_figure: bridge.biblical_figure };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = `${e.unicode} (${e.pantheon}) expresses the pattern “${bridge.pattern}” that also lies behind ${bridge.biblical_figure}. ${parallel.relation} The biblical narrative is a later, theologically shaped iteration of a much older archetype. They share a structural echo, but they are not the same story.`;
    examples.push({
      id: makeId(e.id, 'oracle_biblical_bridge', i + 1),
      entryId: e.id,
      task: 'oracle_biblical_bridge',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { biblicalFigure: bridge.biblical_figure, entryId: e.id },
    });
  }
  return examples;
}

function buildContemplativeExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_contemplative.userTemplates;
  const sample = pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const vars = { unicode: e.unicode, ascii: e.ascii, meaning: e.meaning, pantheon: e.pantheon };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = `To contemplate ${e.unicode} is to sit with the idea of “${e.meaning}.” In the ${e.pantheon} imagination, this name is not merely a label but a field of force. The outer form is the myth; the inner form is the recognition that reality is patterned, that names participate in what they name, and that the ancient mind encoded this participation in story and sound. Hold the name silently, and it becomes a door rather than a definition.`;
    examples.push({
      id: makeId(e.id, 'oracle_contemplative', i + 1),
      entryId: e.id,
      task: 'oracle_contemplative',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

function buildTranslationExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_translation.userTemplates;
  const withScript = entries.filter((e) => e.originalScript?.specimen);
  const sample = withScript.length ? pick(withScript, Math.min(count, withScript.length), rng) : pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const vars = {
      unicode: e.unicode,
      ascii: e.ascii,
      script_name: e.originalScript?.scriptName || 'its original script',
    };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = e.originalScript?.specimen
      ? `In ${e.originalScript.scriptName || 'its original script'}, ${e.unicode} appears as ${e.originalScript.specimen}. This is transliterated as “${e.originalScript.transliteration}.” The Unicode restoration ${e.unicode} is the scholarly Latin-with-diacritics form; the original script gives us the figure as its own tradition wrote it.`
      : `We do not have a secure attestation of ${e.unicode} in its original script; the form we display is a scholarly transliteration. The Unicode restoration ${e.unicode} therefore serves as the working scholarly representation.`;
    examples.push({
      id: makeId(e.id, 'oracle_translation', i + 1),
      entryId: e.id,
      task: 'oracle_translation',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id, hasSpecimen: !!e.originalScript?.specimen },
    });
  }
  return examples;
}

function buildSafetyExamples(persona, count, rng) {
  const examples = [];
  const prompts = persona.taskTypes.oracle_safety.userPrompts;
  const refusal = `I cannot help with creating spoofed domains, homograph attacks, or any technique designed to deceive users about which site or brand they are visiting. PuniCodex studies Unicode names to celebrate and protect them, not to enable abuse. If you are interested in defensive security, I can explain how to detect lookalike domains or how to register a clearly distinct Unicode domain for a legitimate project.`;
  for (let i = 0; i < count; i++) {
    const prompt = prompts[i % prompts.length];
    examples.push({
      id: `oracle-safety-${String(i + 1).padStart(4, '0')}`,
      entryId: null,
      task: 'oracle_safety',
      messages: messages(persona.systemPrompt, prompt, refusal),
      metadata: { prompt },
    });
  }
  return examples;
}

function buildDomainAdviceExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_domain_advice.userTemplates;
  const sample = pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const vars = { unicode: e.unicode, ascii: e.ascii };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const assistant = `${e.unicode}.com is a philologically interesting restoration, but before registering it you should consider three things. First, does the restoration have scholarly authority? ${e.unicode} means “${e.meaning}” and is classified as ${e.tierLabel || 'a standard restoration'}. Second, are you using it in good faith—clearly distinct from any existing brand? Third, this is not legal advice; for trademark questions, consult a qualified attorney. If all three are satisfied, it can be a beautiful and defensible domain.`;
    examples.push({
      id: makeId(e.id, 'oracle_domain_advice', i + 1),
      entryId: e.id,
      task: 'oracle_domain_advice',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

function buildCitationExamples(entries, persona, count, rng) {
  const examples = [];
  const templates = persona.taskTypes.oracle_citation.userTemplates;
  const withSources = entries.filter((e) => e.sources?.length);
  const sample = withSources.length ? pick(withSources, Math.min(count, withSources.length), rng) : pick(entries, count, rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const vars = { unicode: e.unicode, ascii: e.ascii };
    const template = templates[i % templates.length];
    const user = formatTemplate(template, vars);
    const sources = e.sources?.length
      ? sentenceList(e.sources.slice(0, 5).map((s) => s.key || s))
      : 'the PuniCodex canonical source hierarchy';
    const assistant = `The restoration and discussion of ${e.unicode} draws primarily on ${sources}. These sources are ranked in the PuniCodex source hierarchy, with original-language reference works given precedence over derivative summaries. Always check the original edition when making scholarly claims.`;
    examples.push({
      id: makeId(e.id, 'oracle_citation', i + 1),
      entryId: e.id,
      task: 'oracle_citation',
      messages: messages(persona.systemPrompt, user, assistant),
      metadata: { entryId: e.id },
    });
  }
  return examples;
}

function main() {
  const entries = loadEntries();
  const persona = loadPersona();
  const themesData = loadThemes();

  const counts = {
    oracle_greeting: 50,
    oracle_restoration: 200,
    oracle_pronunciation: 150,
    oracle_mythology: 300,
    oracle_pattern_weaving: 200,
    oracle_modern_bridge: 200,
    oracle_biblical_bridge: 100,
    oracle_contemplative: 200,
    oracle_translation: 150,
    oracle_safety: 200,
    oracle_domain_advice: 100,
    oracle_citation: 150,
  };

  const examples = [];
  examples.push(...buildGreetingExamples(persona, counts.oracle_greeting, Math.random));
  examples.push(...buildRestorationExamples(entries, persona, counts.oracle_restoration, Math.random));
  examples.push(...buildPronunciationExamples(entries, persona, counts.oracle_pronunciation, Math.random));
  examples.push(...buildMythologyExamples(entries, persona, counts.oracle_mythology, Math.random));
  examples.push(...buildPatternWeavingExamples(entries, themesData, persona, counts.oracle_pattern_weaving, Math.random));
  examples.push(...buildModernBridgeExamples(entries, themesData, persona, counts.oracle_modern_bridge, Math.random));
  examples.push(...buildBiblicalBridgeExamples(entries, themesData, persona, counts.oracle_biblical_bridge, Math.random));
  examples.push(...buildContemplativeExamples(entries, persona, counts.oracle_contemplative, Math.random));
  examples.push(...buildTranslationExamples(entries, persona, counts.oracle_translation, Math.random));
  examples.push(...buildSafetyExamples(persona, counts.oracle_safety, Math.random));
  examples.push(...buildDomainAdviceExamples(entries, persona, counts.oracle_domain_advice, Math.random));
  examples.push(...buildCitationExamples(entries, persona, counts.oracle_citation, Math.random));

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} oracle conversation examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
