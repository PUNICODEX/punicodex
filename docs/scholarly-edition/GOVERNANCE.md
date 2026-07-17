# PuniCodex Scholarly Edition — Governance Charter

> Version 1.0.0 — Structure-first, content-blank, university-credited.

---

## 1. Mission

The PuniCodex Scholarly Edition is a living, university-edited scholarly layer for the 123 flagship mythological names in the PuniCodex canon. Its purpose is to transform each flagship temple from a curated product page into a credible, transparent, continuously improving scholarly resource — authored by students and faculty, credited to their institutions, and reviewed before publication.

It must be:
- **Authoritative:** Every claim is sourced.
- **Attributable:** Every section credits its contributors and institutions.
- **Additive:** It never damages existing PuniCodex infrastructure or canonical sources.
- **Scalable:** It supports millions of student editors across thousands of institutions.
- **Safe:** It is resistant to vandalism, original research, and abuse.

---

## 2. Scope

The Scholarly Edition applies **only** to the 123 PuniCodex flagship temples. Base temples (the remaining 777 lexicon entries) are not editable through this system.

Each flagship receives a blank Scholarly Edition page at `/sites/{id}/scholars/` containing 13 universal sections plus pantheon-kit sections. Content begins blank and is populated through the edit-and-review workflow described below.

---

## 3. Editorial Hierarchy

The canonical sources of PuniCodex remain the ultimate authority. The Scholarly Edition is a curated overlay, not a replacement.

| Layer | Authority | Examples |
|---|---|---|
| Canonical sources | Highest | `type/js/lexicon.js`, `type/js/original-scripts.js`, `scripts/lore-catalog.json`, `ACCURACY.md` |
| PuniCodex curators | Override | Final say on disputes, vandalism, tier rules |
| Approved institutional edits | Credited | Student/faculty contributions that pass review |
| Pending edits | Not public | Awaiting review |

Any Scholarly Edition content that contradicts a canonical source must be flagged for curator review and may only be published if the contradiction is resolved through the canonical governance workflow.

---

## 4. Roles

### 4.1 Anonymous Visitor
- Can read all published Scholarly Edition content.
- Cannot submit edits.

### 4.2 Student Editor
- Must be enrolled at a verified institution.
- Can propose edits to sections of any flagship.
- Cannot approve their own edits.
- Must cite sources for every substantive claim.

### 4.3 Faculty Reviewer
- Verified faculty or approved graduate teaching staff.
- Can review edits from their institution or assigned temples.
- Can approve, reject, or request revision.
- Cannot approve edits where they are the sole author.

### 4.4 Department Admin
- Manages department tags and specialization claims.
- Can assign reviewers.
- Can view department-level analytics.

### 4.5 Institution Admin
- Manages institution membership and branding.
- Can invite users, revoke memberships, and view institution analytics.
- Cannot override curator decisions.

### 4.6 PuniCodex Curator
- Has final editorial authority.
- Can freeze temples, revert sections, suspend users, and resolve disputes.
- Can approve high-risk edits regardless of institutional origin.
- Must provide a public justification for every override.

---

## 5. Content License

By submitting content to the Scholarly Edition, the contributor grants PuniCodex a perpetual, worldwide, royalty-free, sublicensable license to publish, display, modify, and distribute the contribution under the project’s chosen open-data license (currently CC BY 4.0 for data). The contributor retains the right to be credited.

Contributors must not submit content they do not have the right to license.

---

## 6. Attribution

Every section displays:
- The current primary author(s).
- The contributing institution(s).
- The edit history link.
- ORCID if provided.

When a section is replaced by a better submission from another institution, the new institution receives primary credit for the current version. Previous contributors remain visible in the history.

Institutions receive a public profile page listing their contributions.

---

## 7. Source Standards

All claims must be supported by sources drawn from the hierarchy defined in `ACCURACY.md`:

1. **Tier 1:** Primary texts and canonical reference works (e.g., LSJ, CAD, Faulkner, KTU).
2. **Tier 2:** Peer-reviewed scholarship and authoritative dictionaries.
3. **Tier 3:** Encyclopedic references and cross-checks (use sparingly).

Original research, unsourced speculation, and personal interpretation are prohibited. Religious advocacy or devotional content is prohibited. Plain-language summaries must accurately reflect the cited sources.

---

## 8. Edit Workflow

1. An authenticated editor opens a section on a flagship Scholars page.
2. The editor composes prose, adds citations, and optionally attaches media.
3. The editor submits the edit for review.
4. The system validates the section key, source format, and payload limits.
5. The edit enters the `pending` state and notifies watchers.
6. A reviewer evaluates the edit.
7. Approved edits are applied to the section and published. Rejected edits return to the author with comments.

---

## 9. Approval Workflow

- Every edit requires at least one approval from a faculty reviewer or curator.
- Authors cannot approve their own edits.
- Reviewers from the same institution as the author are preferred but not required.
- Curators can approve any edit and may bypass institutional review when necessary.
- Edits that remain pending beyond 14 days are escalated to curators.
- Sections can be frozen by curators to halt further edits during disputes.

---

## 10. Prohibited Content

The following are not allowed:
- Original research or unsupported claims.
- Plagiarism or copyright-infringing material.
- Religious proselytizing or devotional language.
- Hate speech, harassment, or defamation.
- AI-generated false citations or hallucinated sources.
- Promotional or commercial content unrelated to scholarship.
- Content that contradicts `ACCURACY.md` without curator approval.

Violations may result in edit rejection, user warning, suspension, or permanent ban.

---

## 11. Dispute Resolution

1. Disputes over content are raised through the section’s "Flag for Review" feature.
2. A curator reviews the dispute and the relevant sources.
3. The curator may open a discussion thread involving all parties.
4. The curator issues a binding decision with a public rationale.
5. If new evidence emerges, the dispute may be reopened by a curator.

---

## 12. Data Retention and Export

- Published Scholarly Edition content is retained indefinitely as part of the scholarly record.
- Pending edits may be deleted by their authors.
- Institutions may request an export of their contributions at any time.
- User accounts may be deleted; attribution records are anonymized, not erased, to preserve the scholarly record.

---

## 13. Code of Conduct

All contributors agree to:
- Engage respectfully and constructively.
- Prioritize accuracy over speed.
- Cite sources honestly.
- Accept reviewer feedback gracefully.
- Respect the diversity of traditions represented in the canon.

---

## 14. Amendments

This charter is versioned. Changes require approval from PuniCodex curators and are announced to all institutions 30 days before taking effect.

---

## 15. University Partnership Agreement (Summary)

Institutions that participate in the Scholarly Edition agree to:
- Verify the academic affiliation of their students and faculty.
- Encourage adherence to this charter.
- Accept that PuniCodex curators retain final editorial authority.
- Allow PuniCodex to display institutional attribution on published content.
- Receive quarterly impact reports on their contributions.

A full partnership agreement template is available separately.
