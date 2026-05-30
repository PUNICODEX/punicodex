#!/usr/bin/env node
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

const PROJECTS = [
  'zeus','athena','poseidon','apollon','ares','artemis','aphrodite',
  'demeter','hermes','hera','hephaistos','hestia','hades','hekate',
  'persephone','prometheus','atlas','medousa','nike','ker'
];

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;

  for (const id of PROJECTS) {
    const resp = await fetch(`${CF_API_BASE}/accounts/${accountId}/pages/projects/${id}/domains`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    const domains = data.result || [];
    for (const d of domains) {
      console.log(`${id}: ${d.name} | status=${d.status} | validation=${JSON.stringify(d.validation_data || {})}`);
    }
  }
}

main().catch(console.error);
