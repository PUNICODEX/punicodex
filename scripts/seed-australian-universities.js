#!/usr/bin/env node
/**
 * PuniCodex — seed Australian university outreach prospects.
 *
 * Curated dataset of Australian universities whose teaching/research
 * profiles align with PuniCodex (classics, ancient history, archaeology,
 * linguistics, religious studies, digital humanities, design, marketing,
 * Indigenous studies). Departments are matched against the benefit map in
 * platform/api/university-pitch-email.js.
 *
 * Idempotent — re-running only inserts missing slugs (upsert IGNORE).
 * The crawling ecosystem (docs/scholarly-transformation-plan.md) extends
 * this dataset automatically over time; this seed is its v1 ground truth.
 *
 * Usage:
 *   node scripts/seed-australian-universities.js [--check]
 */
const path = require('node:path');

const UNIVERSITIES = [
  // ── New South Wales ──
  { name: 'The University of Sydney', slug: 'university-of-sydney', state: 'NSW', domain: 'sydney.edu.au', departments: ['Classics and Ancient History', 'Linguistics', 'Religious Studies', 'Digital Humanities', 'Design', 'Indigenous Studies'] },
  { name: 'UNSW Sydney', slug: 'unsw-sydney', state: 'NSW', domain: 'unsw.edu.au', departments: ['Ancient History', 'Linguistics', 'Digital Humanities', 'Design', 'Marketing', 'Indigenous Studies'] },
  { name: 'Macquarie University', slug: 'macquarie-university', state: 'NSW', domain: 'mq.edu.au', departments: ['Egyptology', 'Ancient History', 'Linguistics', 'Indigenous Studies'] },
  { name: 'University of Newcastle, Australia', slug: 'university-of-newcastle', state: 'NSW', domain: 'newcastle.edu.au', departments: ['Classics and Ancient History', 'Indigenous Studies', 'Digital Humanities'] },
  { name: 'University of Wollongong', slug: 'university-of-wollongong', state: 'NSW', domain: 'uow.edu.au', departments: ['Indigenous Studies', 'Digital Humanities', 'Marketing'] },
  { name: 'Western Sydney University', slug: 'western-sydney-university', state: 'NSW', domain: 'westernsydney.edu.au', departments: ['Indigenous Studies', 'Marketing', 'Design'] },
  { name: 'University of New England', slug: 'university-of-new-england', state: 'NSW', domain: 'une.edu.au', departments: ['Classics and Ancient History', 'Religious Studies', 'Indigenous Studies', 'Linguistics'] },
  { name: 'Charles Sturt University', slug: 'charles-sturt-university', state: 'NSW', domain: 'csu.edu.au', departments: ['Ancient History', 'Indigenous Studies', 'Marketing'] },
  { name: 'Southern Cross University', slug: 'southern-cross-university', state: 'NSW', domain: 'scu.edu.au', departments: ['Indigenous Studies', 'Design'] },
  { name: 'Australian Catholic University', slug: 'australian-catholic-university', state: 'NSW', domain: 'acu.edu.au', departments: ['Religious Studies', 'Ancient History', 'Design', 'Marketing'] },
  { name: 'University of Technology Sydney', slug: 'university-of-technology-sydney', state: 'NSW', domain: 'uts.edu.au', departments: ['Digital Humanities', 'Design', 'Marketing', 'Indigenous Studies', 'Linguistics'] },

  // ── Victoria ──
  { name: 'The University of Melbourne', slug: 'university-of-melbourne', state: 'VIC', domain: 'unimelb.edu.au', departments: ['Classics and Archaeology', 'Linguistics and Applied Linguistics', 'Religious Studies', 'Digital Humanities', 'Design', 'Marketing'] },
  { name: 'Monash University', slug: 'monash-university', state: 'VIC', domain: 'monash.edu', departments: ['Classics and Ancient History', 'Linguistics', 'Religious Studies', 'Design', 'Marketing', 'Indigenous Studies'] },
  { name: 'La Trobe University', slug: 'la-trobe-university', state: 'VIC', domain: 'latrobe.edu.au', departments: ['Archaeology and Ancient History', 'Linguistics', 'Indigenous Studies'] },
  { name: 'Deakin University', slug: 'deakin-university', state: 'VIC', domain: 'deakin.edu.au', departments: ['Indigenous Studies', 'Marketing', 'Design', 'Digital Humanities'] },
  { name: 'RMIT University', slug: 'rmit-university', state: 'VIC', domain: 'rmit.edu.au', departments: ['Design', 'Marketing', 'Digital Humanities', 'Indigenous Studies'] },
  { name: 'Swinburne University of Technology', slug: 'swinburne-university', state: 'VIC', domain: 'swinburne.edu.au', departments: ['Design', 'Marketing', 'Digital Humanities'] },
  { name: 'Victoria University', slug: 'victoria-university', state: 'VIC', domain: 'vu.edu.au', departments: ['Indigenous Studies', 'Marketing', 'Design'] },
  { name: 'Federation University Australia', slug: 'federation-university', state: 'VIC', domain: 'federation.edu.au', departments: ['Indigenous Studies', 'Marketing'] },

  // ── Queensland ──
  { name: 'The University of Queensland', slug: 'university-of-queensland', state: 'QLD', domain: 'uq.edu.au', departments: ['Classics and Ancient History', 'Linguistics', 'Religious Studies', 'Indigenous Studies', 'Marketing'] },
  { name: 'Queensland University of Technology', slug: 'qut', state: 'QLD', domain: 'qut.edu.au', departments: ['Digital Humanities', 'Design', 'Marketing', 'Indigenous Studies'] },
  { name: 'Griffith University', slug: 'griffith-university', state: 'QLD', domain: 'griffith.edu.au', departments: ['Indigenous Studies', 'Design', 'Marketing', 'Religious Studies'] },
  { name: 'James Cook University', slug: 'james-cook-university', state: 'QLD', domain: 'jcu.edu.au', departments: ['Indigenous Studies', 'Ancient History', 'Linguistics'] },
  { name: 'University of Southern Queensland', slug: 'university-of-southern-queensland', state: 'QLD', domain: 'unisq.edu.au', departments: ['Indigenous Studies', 'Marketing', 'Ancient History'] },
  { name: 'University of the Sunshine Coast', slug: 'university-of-the-sunshine-coast', state: 'QLD', domain: 'usc.edu.au', departments: ['Indigenous Studies', 'Marketing'] },
  { name: 'Central Queensland University', slug: 'central-queensland-university', state: 'QLD', domain: 'cqu.edu.au', departments: ['Indigenous Studies', 'Marketing', 'Digital Humanities'] },
  { name: 'Bond University', slug: 'bond-university', state: 'QLD', domain: 'bond.edu.au', departments: ['Marketing', 'Design', 'Linguistics'] },

  // ── Western Australia ──
  { name: 'The University of Western Australia', slug: 'university-of-western-australia', state: 'WA', domain: 'uwa.edu.au', departments: ['Classics and Ancient History', 'Linguistics', 'Indigenous Studies', 'Design', 'Marketing'] },
  { name: 'Curtin University', slug: 'curtin-university', state: 'WA', domain: 'curtin.edu.au', departments: ['Indigenous Studies', 'Design', 'Marketing', 'Digital Humanities'] },
  { name: 'Murdoch University', slug: 'murdoch-university', state: 'WA', domain: 'murdoch.edu.au', departments: ['Indigenous Studies', 'Linguistics', 'Marketing'] },
  { name: 'Edith Cowan University', slug: 'edith-cowan-university', state: 'WA', domain: 'ecu.edu.au', departments: ['Indigenous Studies', 'Design', 'Marketing'] },
  { name: 'The University of Notre Dame Australia', slug: 'university-of-notre-dame-australia', state: 'WA', domain: 'nd.edu.au', departments: ['Religious Studies', 'Ancient History'] },

  // ── South Australia ──
  { name: 'The University of Adelaide', slug: 'university-of-adelaide', state: 'SA', domain: 'adelaide.edu.au', departments: ['Classics and Ancient History', 'Linguistics', 'Indigenous Studies', 'Marketing'] },
  { name: 'University of South Australia', slug: 'university-of-south-australia', state: 'SA', domain: 'unisa.edu.au', departments: ['Indigenous Studies', 'Design', 'Marketing', 'Digital Humanities'] },
  { name: 'Flinders University', slug: 'flinders-university', state: 'SA', domain: 'flinders.edu.au', departments: ['Archaeology', 'Indigenous Studies', 'Linguistics', 'Marketing'] },

  // ── Tasmania ──
  { name: 'University of Tasmania', slug: 'university-of-tasmania', state: 'TAS', domain: 'utas.edu.au', departments: ['Ancient History', 'Indigenous Studies', 'Design', 'Marketing'] },

  // ── Australian Capital Territory ──
  { name: 'The Australian National University', slug: 'australian-national-university', state: 'ACT', domain: 'anu.edu.au', departments: ['Classics', 'Linguistics', 'Religious Studies', 'Digital Humanities', 'Indigenous Studies', 'Archaeology'] },
  { name: 'University of Canberra', slug: 'university-of-canberra', state: 'ACT', domain: 'canberra.edu.au', departments: ['Indigenous Studies', 'Design', 'Marketing', 'Digital Humanities'] },

  // ── Northern Territory ──
  { name: 'Charles Darwin University', slug: 'charles-darwin-university', state: 'NT', domain: 'cdu.edu.au', departments: ['Indigenous Studies', 'Linguistics', 'Digital Humanities'] },
];

async function main() {
  const { upsertProspect, listProspects } = require(path.join(
    __dirname,
    '..',
    'platform',
    'db',
    'university-prospects.js'
  ));

  for (const u of UNIVERSITIES) {
    await upsertProspect({
      institution_name: u.name,
      slug: u.slug,
      country: 'AU',
      state: u.state,
      domain: u.domain,
      departments: u.departments,
      source: 'seed',
      metadata: { seeded_by: 'scripts/seed-australian-universities.js', v: 1 },
    });
  }

  const all = await listProspects();
  const byStatus = {};
  for (const p of all) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  console.log(
    `University prospects: ${all.length} total (${UNIVERSITIES.length} in seed) — status: ${JSON.stringify(byStatus)}`
  );
}

main().catch((err) => {
  console.error(`University seed stopped: ${err.message}`);
  process.exit(1);
});
