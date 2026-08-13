#!/usr/bin/env node
/**
 * PuniCodex — Teacher-distillation corpus generator
 *
 * Expands the AI training corpus with VERIFIED, grounded Q&A records produced
 * by an OpenAI-compatible teacher model. Governance follows the authoritative
 * import framework: canonical sources are king, so teacher output NEVER lands
 * in `data/corpus/` directly. Accepted records are staged for human review at
 * `data/authoritative/staging/suggestions/teacher/{runId}.json`, each with a
 * `provenance` object (`source: 'teacher-distillation'`, CC-BY-4.0).
 *
 * Every teacher record passes a self-verification gate before staging:
 *   (a) instruction/output are non-empty strings under length caps
 *   (b) every citedSource appears in the entry's canonical sources list
 *   (c) the output does not contradict canonical fields (unicode form, ascii
 *       form, pantheon, tier — when mentioned they must match exactly)
 *   (d) the output carries no template markers / undefined / null
 * Rejected records land in the same staging file with their reasons.
 *
 * Usage:
 *   node scripts/generate-teacher-corpus.js [--limit N] [--entry <id>]
 *     [--tasks qa,etymology,pronunciation] [--run-id <id>] [--dry-run]
 *
 * Required env (unless --dry-run): TEACHER_BASE_URL, TEACHER_API_KEY, TEACHER_MODEL.
 */

const fs = require('node:fs');
const path = require('node:path');

const teacherClient = require('../platform/agents/teacher-client.js');

const ROOT = path.resolve(__dirname, '..');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const STAGING_ROOT = path.join(ROOT, 'data', 'authoritative', 'staging', 'suggestions');

const LICENSE = 'CC-BY-4.0';
const PROVENANCE_SOURCE = 'teacher-distillation';

// Sane length caps for the verification gate (rule a).
const MAX_INSTRUCTION_LEN = 600;
const MAX_INPUT_LEN = 1000;
const MAX_OUTPUT_LEN = 4000;

// Rule (d): template leakage / serialization artifacts.
const TEMPLATE_MARKER_RE = /\{\{|\}\}|\[object Object\]|\bundefined\b|\bnull\b/i;

const CONFIG_HELP = `Teacher model not configured. Set these environment variables and re-run:

  TEACHER_BASE_URL   OpenAI-compatible API base (default: https://api.openai.com/v1)
  TEACHER_API_KEY    API key for the teacher model
  TEACHER_MODEL      model name (e.g. gpt-4o-mini)

Preview prompts without a teacher: add --dry-run.`;

// ═════════════════════════════════════════════════════════════════════════════
// Task definitions
// ═════════════════════════════════════════════════════════════════════════════

const TASKS = {
  qa: {
    label: 'Grounded Q&A',
    directive:
      'Task: write 2-3 question/answer pairs a curious reader might ask about this name — ' +
      'what it means, what the restored Unicode form preserves over plain ASCII, and which ' +
      'sources attest it.',
  },
  etymology: {
    label: 'Etymology Q&A',
    directive:
      'Task: write 2-3 question/answer pairs about the etymology and meaning of this name — ' +
      'proto-forms, derivation, cognates — strictly from the supplied context.',
  },
  pronunciation: {
    label: 'Pronunciation Q&A',
    directive:
      'Task: write 2-3 question/answer pairs about how the restored form of this name is ' +
      'pronounced and what each diacritic changes, grounded in the character breakdown and ' +
      'the original script.',
  },
};

const SYSTEM_PROMPT = [
  'You are a distillation teacher producing training records for the PuniCodex lexicon of',
  'Unicode-restored mythological names.',
  'Rules:',
  '- Ground every answer ONLY in the entry context supplied by the user. Never use outside',
  '  knowledge.',
  '- Answers are concise and scholarly (1-4 sentences).',
  '- Cite any source named in the context that an answer relies on, by its exact name, in',
  '  "citedSources". Never invent a source.',
  '- If the context cannot support a solid answer, produce fewer records rather than',
  '  speculating.',
  '- Reply with strict JSON only, no prose:',
  '  {"records":[{"instruction":"...","input":"","output":"...","citedSources":["..."]}]}',
  '- "instruction" is the learner-facing question, "input" is optional supplementary context',
  '  (use "" when none), "output" is the answer.',
].join('\n');

// ═════════════════════════════════════════════════════════════════════════════
// Canonical source loaders
// ═════════════════════════════════════════════════════════════════════════════

let lexiconCache = null;

function loadLexicon() {
  if (lexiconCache) return lexiconCache;
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  lexiconCache = new Function(`${code}; return LEXICON;`)();
  return lexiconCache;
}

function defaultGetEntryContext(entryId) {
  // Lazy-required so tests (and --dry-run on machines without the platform
  // DB) never load better-sqlite3 or open the database.
  const { getEntryContext } = require('../platform/api/oracle-context.js');
  return getEntryContext(entryId);
}

/**
 * Assemble the grounding context for an entry. Prefers the SAME context the
 * Oracle serves (`getEntryContext`); falls back to the canonical lexicon
 * entry itself when the platform DB is unavailable.
 */
function assembleContext(entry, getEntryContextFn = defaultGetEntryContext) {
  let ctx = null;
  try {
    ctx = getEntryContextFn(entry.id);
  } catch (_e) {
    ctx = null;
  }
  if (ctx) return ctx;

  let originalScript = null;
  try {
    const { getOriginalScript } = require('../type/js/original-scripts.js');
    originalScript = getOriginalScript(entry) || null;
  } catch (_e) {
    originalScript = null;
  }

  return {
    id: entry.id,
    ascii: entry.ascii,
    unicode: entry.unicode,
    greek: entry.greek,
    pantheon: entry.pantheon,
    tier: entry.tier,
    tierLabel: entry.tierLabel,
    domain: entry.domain,
    meaning: entry.meaning,
    sources: entry.sources || [],
    etymology: entry.etymology || null,
    variants: entry.variants || [],
    breakdown: entry.breakdown || [],
    originalScript,
    lore: null,
  };
}

/**
 * Default selection: all built flagships first (archetypes with `built`
 * flags), then the rest of the full lexicon. If the archetype list cannot be
 * loaded, fall back to the full lexicon in canonical order.
 */
function selectEntries(lexicon, { entry = null, limit = null } = {}) {
  const byId = new Map(lexicon.map((e) => [e.id, e]));
  let ids;
  if (entry) {
    ids = String(entry)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    let flagshipIds = [];
    try {
      const { ARCHETYPES } = require('../js/archetypes-v2.js');
      flagshipIds = ARCHETYPES.filter((a) => a.built && byId.has(a.id)).map((a) => a.id);
    } catch (_e) {
      flagshipIds = [];
    }
    const seen = new Set(flagshipIds);
    ids = [...flagshipIds, ...lexicon.filter((e) => !seen.has(e.id)).map((e) => e.id)];
  }
  if (limit != null) ids = ids.slice(0, limit);
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// ═════════════════════════════════════════════════════════════════════════════
// Prompt assembly
// ═════════════════════════════════════════════════════════════════════════════

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function sourceStrings(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') return s.name || s.id || s.title || '';
      return '';
    })
    .filter(Boolean);
}

function contextPayload(ctx) {
  return {
    id: ctx.id,
    ascii: ctx.ascii,
    unicode: ctx.unicode,
    greek: ctx.greek,
    pantheon: ctx.pantheon,
    tier: ctx.tierLabel || ctx.tier,
    domain: ctx.domain,
    meaning: ctx.meaning,
    sources: sourceStrings(ctx.sources),
    etymology: ctx.etymology || null,
    variants: (ctx.variants || []).map((v) => ({
      unicode: v.unicode,
      type: v.type,
      note: v.note,
    })),
    breakdown: (ctx.breakdown || []).map((b) => ({
      from: b.char,
      to: b.to ?? b.to_char,
      type: b.type,
      note: b.note,
    })),
    originalScript: ctx.originalScript ? truncate(JSON.stringify(ctx.originalScript), 800) : null,
    lore: ctx.lore ? truncate(JSON.stringify(ctx.lore), 1500) : null,
  };
}

function buildMessages(ctx, task) {
  const taskDef = TASKS[task];
  const user = [
    taskDef.directive,
    '',
    `Entry context (canonical PuniCodex data for "${ctx.unicode}" / ${ctx.ascii}):`,
    '```json',
    JSON.stringify(contextPayload(ctx), null, 2),
    '```',
    '',
    'Produce 2-3 records. Strict JSON only.',
  ].join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
// Teacher response parsing (defensive)
// ═════════════════════════════════════════════════════════════════════════════

function normalizeParsed(parsed) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) return null;
  return parsed.records;
}

function parseTeacherJson(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return normalizeParsed(JSON.parse(cleaned));
  } catch (_e) {
    // fall through to brace-slicing
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return normalizeParsed(JSON.parse(cleaned.slice(start, end + 1)));
  } catch (_e) {
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Self-verification gate
// ═════════════════════════════════════════════════════════════════════════════

function stripMarks(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeSourceName(name) {
  return String(name).trim().toLowerCase();
}

/**
 * Verify one teacher record against the entry's canonical context.
 * Returns { ok, reasons } — a record is ACCEPTED only when reasons is empty.
 */
function verifyRecord(record, ctx, { pantheonBases = new Set() } = {}) {
  const reasons = [];

  if (!record || typeof record !== 'object') {
    return { ok: false, reasons: ['invalid-shape: record is not an object'] };
  }

  // (a) shape + length caps
  const instruction = typeof record.instruction === 'string' ? record.instruction.trim() : '';
  const output = typeof record.output === 'string' ? record.output.trim() : '';
  const input = record.input == null ? '' : record.input;
  if (!instruction) reasons.push('invalid-shape: instruction is missing or not a string');
  if (!output) reasons.push('invalid-shape: output is missing or not a string');
  if (typeof input !== 'string') {
    reasons.push('invalid-shape: input must be a string');
  }
  if (instruction.length > MAX_INSTRUCTION_LEN) {
    reasons.push(`too-long: instruction exceeds ${MAX_INSTRUCTION_LEN} chars`);
  }
  if (output.length > MAX_OUTPUT_LEN) {
    reasons.push(`too-long: output exceeds ${MAX_OUTPUT_LEN} chars`);
  }
  if (typeof input === 'string' && input.length > MAX_INPUT_LEN) {
    reasons.push(`too-long: input exceeds ${MAX_INPUT_LEN} chars`);
  }

  // (b) cited sources must exist in the entry's canonical sources list
  let cited = record.citedSources == null ? [] : record.citedSources;
  if (!Array.isArray(cited) || cited.some((s) => typeof s !== 'string')) {
    reasons.push('invalid-shape: citedSources must be an array of strings');
    cited = [];
  }
  const canonicalSources = new Set(sourceStrings(ctx.sources).map(normalizeSourceName));
  for (const s of cited) {
    if (!canonicalSources.has(normalizeSourceName(s))) {
      reasons.push(`uncited-source: "${s}" is not in the entry's canonical sources`);
    }
  }

  if (output) {
    // (d) template markers / serialization artifacts
    for (const text of [instruction, output]) {
      if (TEMPLATE_MARKER_RE.test(text)) {
        reasons.push('template-marker: output contains template markers or undefined/null');
        break;
      }
    }

    // (c1) restored-form check: any word whose mark-stripped skeleton equals
    // the ascii form must be exactly the ascii form, the canonical unicode
    // form, or an attested variant — anything else is a hallucinated spelling.
    const asciiLower = stripMarks(ctx.ascii || '').toLowerCase();
    const allowedForms = new Set(
      [ctx.unicode, ...(ctx.variants || []).map((v) => v?.unicode)].filter(Boolean)
    );
    const tokens = output.match(/[\p{L}\p{M}]+/gu) || [];
    for (const token of tokens) {
      if (stripMarks(token).toLowerCase() !== asciiLower) continue;
      if (token.toLowerCase() === asciiLower) continue; // plain ascii mention
      if (allowedForms.has(token)) continue; // canonical or attested variant
      reasons.push(`form-mismatch: "${token}" is not the canonical restored form "${ctx.unicode}"`);
    }

    // (c2) pantheon check: a mention of a different pantheon contradicts canon.
    const canonicalBase = String(ctx.pantheon || '')
      .split('-')[0]
      .toLowerCase();
    for (const base of pantheonBases) {
      if (base === canonicalBase) continue;
      const mention = new RegExp(`(?<![\\p{L}])${base}(?![\\p{L}])`, 'iu');
      if (mention.test(output)) {
        reasons.push(
          `pantheon-mismatch: mentions "${base}" but the entry pantheon is "${ctx.pantheon}"`
        );
      }
    }

    // (c3) tier check: any tier label mentioned must match the canonical tier.
    const canonicalTier = String(ctx.tier || '').toLowerCase();
    const tierMentions = output.matchAll(/\btier[-\s]?(1|2|dual)\b/gi);
    for (const m of tierMentions) {
      const mentioned = m[1].toLowerCase();
      if (mentioned !== canonicalTier) {
        reasons.push(
          `tier-mismatch: output says "Tier ${m[1]}" but the canonical tier is "${ctx.tier}"`
        );
      }
    }
    if (/\bdual[-\s]?tier\b/i.test(output) && canonicalTier !== 'dual') {
      reasons.push(
        `tier-mismatch: output says "dual-tier" but the canonical tier is "${ctx.tier}"`
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

// ═════════════════════════════════════════════════════════════════════════════
// Staging I/O
// ═════════════════════════════════════════════════════════════════════════════

function sanitizeRunId(id) {
  return String(id).replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function stagingPath(stagingDir, runId) {
  return path.join(stagingDir, 'teacher', `${runId}.json`);
}

function loadStaging(stagingDir, runId) {
  const filePath = stagingPath(stagingDir, runId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

function writeStaging(stagingDir, staging) {
  const filePath = stagingPath(stagingDir, staging.runId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(staging, null, 2)}\n`, 'utf8');
  return filePath;
}

// ═════════════════════════════════════════════════════════════════════════════
// Pipeline
// ═════════════════════════════════════════════════════════════════════════════

async function runPipeline(options = {}) {
  const {
    limit = null,
    entry = null,
    tasks = Object.keys(TASKS),
    dryRun = false,
    stagingDir = STAGING_ROOT,
    chatFn = teacherClient.chat,
    getEntryContextFn = defaultGetEntryContext,
    log = console.log,
  } = options;
  const runId = sanitizeRunId(
    options.runId || `teacher-${new Date().toISOString().replace(/:/g, '-')}`
  );

  const lexicon = loadLexicon();
  const entries = selectEntries(lexicon, { entry, limit });
  if (entries.length === 0) {
    throw new Error('No lexicon entries selected (check --entry / --limit)');
  }

  const pantheonBases = new Set(
    lexicon.map((e) =>
      String(e.pantheon || '')
        .split('-')[0]
        .toLowerCase()
    )
  );

  const config = teacherClient.getConfig();
  const staging = loadStaging(stagingDir, runId) || {
    runId,
    generatedAt: new Date().toISOString(),
    teacher: { baseUrl: config.baseUrl, model: config.model || null },
    accepted: [],
    rejected: [],
  };
  staging.accepted = staging.accepted || [];
  staging.rejected = staging.rejected || [];

  // Resume support: entry+task pairs already staged are skipped.
  const completed = new Set(
    [...staging.accepted, ...staging.rejected].map((r) => `${r.entryId}:${r.task}`)
  );

  let prompted = 0;
  let skipped = 0;
  let filePath = stagingPath(stagingDir, runId);

  for (const entryObj of entries) {
    const ctx = assembleContext(entryObj, getEntryContextFn);
    for (const task of tasks) {
      const pairKey = `${entryObj.id}:${task}`;
      if (completed.has(pairKey)) {
        skipped++;
        log(`  · skip ${pairKey} (already staged)`);
        continue;
      }

      const messages = buildMessages(ctx, task);

      if (dryRun) {
        prompted++;
        log(`── DRY-RUN prompt ── entry: ${entryObj.id} · task: ${task}`);
        for (const m of messages) {
          log(`[${m.role}]`);
          log(m.content);
        }
        log('');
        continue;
      }

      log(`▸ ${entryObj.id} / ${task}: querying teacher…`);
      const content = await chatFn(messages, { temperature: 0.2, maxTokens: 1600 });
      if (content == null) {
        staging.rejected.push({
          entryId: entryObj.id,
          task,
          reasons: ['teacher-unavailable: teacher returned no content'],
          record: null,
        });
      } else {
        const records = parseTeacherJson(content);
        if (!records) {
          staging.rejected.push({
            entryId: entryObj.id,
            task,
            reasons: ['unparseable-response: teacher reply was not the required JSON shape'],
            record: null,
          });
        } else {
          for (const raw of records) {
            const record = {
              instruction:
                typeof raw?.instruction === 'string' ? raw.instruction.trim() : raw?.instruction,
              input: typeof raw?.input === 'string' ? raw.input.trim() : (raw?.input ?? ''),
              output: typeof raw?.output === 'string' ? raw.output.trim() : raw?.output,
              citedSources: Array.isArray(raw?.citedSources) ? raw.citedSources : raw?.citedSources,
            };
            const { ok, reasons } = verifyRecord(record, ctx, { pantheonBases });
            if (ok) {
              staging.accepted.push({
                entryId: entryObj.id,
                task,
                instruction: record.instruction,
                input: record.input,
                output: record.output,
                citedSources: record.citedSources || [],
                provenance: {
                  source: PROVENANCE_SOURCE,
                  retrievedAt: new Date().toISOString(),
                  license: LICENSE,
                  teacher: config.model || null,
                },
              });
            } else {
              staging.rejected.push({ entryId: entryObj.id, task, reasons, record });
            }
          }
        }
      }
      // Persist after every pair so a crashed run can resume.
      filePath = writeStaging(stagingDir, staging);
    }
  }

  if (dryRun) {
    log(
      `Dry-run complete: ${prompted} prompt(s) across ${entries.length} entry(ies). ` +
        `Intended write: ${filePath} (not written).`
    );
  }

  return {
    runId,
    dryRun,
    prompted,
    skipped,
    accepted: staging.accepted.length,
    rejected: staging.rejected.length,
    path: dryRun ? null : filePath,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[i + 1];
        i += 1;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;

  if (!dryRun && !teacherClient.isConfigured()) {
    console.log(CONFIG_HELP);
    process.exit(2);
  }

  const tasks = flags.tasks
    ? String(flags.tasks)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : Object.keys(TASKS);
  const unknownTasks = tasks.filter((t) => !TASKS[t]);
  if (unknownTasks.length > 0) {
    console.error(
      `Unknown task(s): ${unknownTasks.join(', ')}. Known: ${Object.keys(TASKS).join(', ')}`
    );
    process.exit(1);
  }

  let limit = null;
  if (flags.limit != null) {
    limit = Number.parseInt(flags.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) {
      console.error(`Invalid --limit: ${flags.limit}`);
      process.exit(1);
    }
  }

  if (flags.entry) {
    const byId = new Map(loadLexicon().map((e) => [e.id, e]));
    const missing = String(flags.entry)
      .split(',')
      .map((s) => s.trim())
      .filter((id) => id && !byId.has(id));
    if (missing.length > 0) {
      console.error(`Unknown lexicon entry id(s): ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const result = await runPipeline({
    limit,
    entry: flags.entry || null,
    tasks,
    dryRun,
    runId: flags['run-id'] || undefined,
  });

  console.log('');
  if (dryRun) {
    console.log(`✓ Dry-run finished: ${result.prompted} prompt(s) printed, nothing written.`);
  } else {
    console.log(
      `✓ Run ${result.runId}: ${result.accepted} accepted, ${result.rejected} rejected, ` +
        `${result.skipped} skipped (resumed).`
    );
    console.log(`  Staging: ${result.path}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Teacher corpus generation failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  TASKS,
  SYSTEM_PROMPT,
  CONFIG_HELP,
  MAX_INSTRUCTION_LEN,
  MAX_INPUT_LEN,
  MAX_OUTPUT_LEN,
  loadLexicon,
  assembleContext,
  selectEntries,
  contextPayload,
  buildMessages,
  parseTeacherJson,
  verifyRecord,
  sanitizeRunId,
  stagingPath,
  loadStaging,
  writeStaging,
  runPipeline,
};
