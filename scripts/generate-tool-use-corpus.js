#!/usr/bin/env node
/**
 * PuniCodex — Tool-Use / Function-Calling Corpus Generator (Phase 4)
 *
 * Emits multi-turn examples where the assistant must invoke PuniCodex APIs
 * to answer user questions: punycode conversion, name authenticity checks,
 * lexicon search, and URL decomposition.
 *
 * Output: data/corpus/tool-use-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'tool-use-examples.jsonl');

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'convert_to_punycode',
      description: 'Convert a Unicode domain name to its punycode ASCII encoding.',
      parameters: {
        type: 'object',
        properties: {
          unicodeDomain: { type: 'string', description: 'The Unicode domain name, e.g. Apóllōn.com' },
        },
        required: ['unicodeDomain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_authenticity',
      description: 'Check whether a name or domain is a canonical form, variant, or spoof.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'The name or domain to check.' },
        },
        required: ['input'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_names',
      description: 'Search the PuniCodex lexicon for entries matching a query.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query (ASCII, Unicode, Greek, or meaning).' },
          pantheon: { type: 'string', description: 'Optional pantheon filter.' },
        },
        required: ['q'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_entry',
      description: 'Fetch the full scholarly record for a lexicon entry by id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Lexicon entry id, e.g. apollon.' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_url',
      description: 'Decompose a URL into registrable domain, path, query, and punycode forms.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to analyze.' },
        },
        required: ['url'],
      },
    },
  },
];

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildConvertToolExample(entry, index) {
  if (!entry.punycodeDomain) return null;
  return {
    id: makeId(entry.id, 'tool_convert', index),
    entryId: entry.id,
    task: 'tool_convert',
    tools: TOOLS,
    messages: [
      { role: 'user', content: `What is the punycode form of ${entry.unicodeDomain}?` },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: `call_${entry.id}_convert`,
            type: 'function',
            function: {
              name: 'convert_to_punycode',
              arguments: JSON.stringify({ unicodeDomain: entry.unicodeDomain }),
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: `call_${entry.id}_convert`,
        content: JSON.stringify({ unicodeDomain: entry.unicodeDomain, punycodeDomain: entry.punycodeDomain }),
      },
      {
        role: 'assistant',
        content: `${entry.unicodeDomain} encodes to ${entry.punycodeDomain}.`,
      },
    ],
    metadata: { pantheon: entry.pantheon, tier: entry.tier },
  };
}

function buildCheckToolExample(entry, index) {
  const input = entry.unicode;
  return {
    id: makeId(entry.id, 'tool_check', index),
    entryId: entry.id,
    task: 'tool_check',
    tools: TOOLS,
    messages: [
      { role: 'user', content: `Is ${input} a safe canonical name?` },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: `call_${entry.id}_check`,
            type: 'function',
            function: {
              name: 'check_authenticity',
              arguments: JSON.stringify({ input }),
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: `call_${entry.id}_check`,
        content: JSON.stringify({
          input,
          verdict: entry.ownership.isOwned ? 'canonical' : 'recognized variant',
          target: entry.id,
          owned: entry.ownership.isOwned,
        }),
      },
      {
        role: 'assistant',
        content: `${input} is a ${entry.ownership.isOwned ? 'canonical owned form' : 'recognized scholarly variant'} of ${entry.ascii} in the PuniCodex corpus.`,
      },
    ],
    metadata: { pantheon: entry.pantheon, owned: entry.ownership.isOwned },
  };
}

function buildSearchToolExample(entry, index) {
  return {
    id: makeId(entry.id, 'tool_search', index),
    entryId: entry.id,
    task: 'tool_search',
    tools: TOOLS,
    messages: [
      { role: 'user', content: `Find the PuniCodex entry for ${entry.ascii}.` },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: `call_${entry.id}_search`,
            type: 'function',
            function: {
              name: 'search_names',
              arguments: JSON.stringify({ q: entry.ascii }),
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: `call_${entry.id}_search`,
        content: JSON.stringify({
          results: [{ id: entry.id, unicode: entry.unicode, pantheon: entry.pantheon, meaning: entry.meaning }],
        }),
      },
      {
        role: 'assistant',
        content: `Found ${entry.unicode} (${entry.id}) in the ${entry.pantheon} pantheon. Meaning: ${entry.meaning}.`,
      },
    ],
    metadata: { pantheon: entry.pantheon },
  };
}

function buildGetEntryToolExample(entry, index) {
  return {
    id: makeId(entry.id, 'tool_get_entry', index),
    entryId: entry.id,
    task: 'tool_get_entry',
    tools: TOOLS,
    messages: [
      { role: 'user', content: `Get the full record for ${entry.id}.` },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: `call_${entry.id}_get`,
            type: 'function',
            function: {
              name: 'get_entry',
              arguments: JSON.stringify({ id: entry.id }),
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: `call_${entry.id}_get`,
        content: JSON.stringify({
          id: entry.id,
          unicode: entry.unicode,
          ascii: entry.ascii,
          pantheon: entry.pantheon,
          meaning: entry.meaning,
          tierLabel: entry.tierLabel,
          punycodeDomain: entry.punycodeDomain,
        }),
      },
      {
        role: 'assistant',
        content: `${entry.unicode} (${entry.ascii}) is a ${entry.tierLabel} ${entry.pantheon} name meaning “${entry.meaning}”. ${entry.punycodeDomain ? `Punycode: ${entry.punycodeDomain}.` : ''}`,
      },
    ],
    metadata: { pantheon: entry.pantheon, tier: entry.tier },
  };
}

function buildAnalyzeUrlToolExample(entry, index) {
  if (!entry.punycodeDomain) return null;
  const url = `https://login-${entry.ascii}-verify.example.com/path?ref=${entry.punycodeDomain}`;
  return {
    id: makeId(entry.id, 'tool_analyze_url', index),
    entryId: entry.id,
    task: 'tool_analyze_url',
    tools: TOOLS,
    messages: [
      { role: 'user', content: `Analyze this URL: ${url}` },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: `call_${entry.id}_url`,
            type: 'function',
            function: {
              name: 'analyze_url',
              arguments: JSON.stringify({ url }),
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: `call_${entry.id}_url`,
        content: JSON.stringify({
          url,
          registrableDomain: 'example.com',
          punycodeRegistrableDomain: 'example.com',
          path: '/path',
          query: { ref: entry.punycodeDomain },
          containsTargetName: true,
          targetName: entry.ascii,
        }),
      },
      {
        role: 'assistant',
        content: `The registrable domain is example.com — not ${entry.punycodeDomain}. The name “${entry.ascii}” appears only in a subdomain and query parameter, which is a common lookalike pattern.`,
      },
    ],
    metadata: { pantheon: entry.pantheon },
  };
}

function generateForEntry(entry, index) {
  return [
    buildConvertToolExample(entry, index),
    buildCheckToolExample(entry, index),
    buildSearchToolExample(entry, index),
    buildGetEntryToolExample(entry, index),
    buildAnalyzeUrlToolExample(entry, index),
  ].filter(Boolean);
}

function main() {
  const entries = loadEntries();
  const examples = [];
  for (let i = 0; i < entries.length; i++) {
    examples.push(...generateForEntry(entries[i], i + 1));
  }

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} tool-use examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
