/**
 * PuniCodex — Name Authenticity Shield V2 Tier Definitions
 *
 * Maps V2 numeric severity tiers to UI payloads.
 */

const TIERS = [
  {
    level: 0,
    severity: 'none',
    verdict: 'authentic',
    label: 'Authentic',
    shortLabel: 'Authentic',
    color: '#22c55e',
    background: 'rgba(34, 197, 94, 0.12)',
    border: '#22c55e',
    icon: 'seal',
    action: 'allow',
    i18nKey: 'verdict.authentic',
    description: 'No deception indicators detected.',
  },
  {
    level: 1,
    severity: 'low',
    verdict: 'verified-variant',
    label: 'Verified Variant',
    shortLabel: 'Verified',
    color: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.12)',
    border: '#3b82f6',
    icon: 'check',
    action: 'allow',
    i18nKey: 'verdict.verifiedVariant',
    description: 'A registered or known alternate form of a canonical name.',
  },
  {
    level: 2,
    severity: 'low',
    verdict: 'styled',
    label: 'Styled / Benign',
    shortLabel: 'Styled',
    color: '#6b7280',
    background: 'rgba(107, 114, 128, 0.12)',
    border: '#6b7280',
    icon: 'info',
    action: 'log',
    i18nKey: 'verdict.styled',
    description: 'Uses Unicode stylistically but matches a recognized identity.',
  },
  {
    level: 3,
    severity: 'medium',
    verdict: 'uncertain',
    label: 'Uncertain',
    shortLabel: 'Uncertain',
    color: '#eab308',
    background: 'rgba(234, 179, 8, 0.12)',
    border: '#eab308',
    icon: 'ask',
    action: 'warn',
    i18nKey: 'verdict.uncertain',
    description: 'Some risk signals are present; user confirmation is recommended.',
  },
  {
    level: 4,
    severity: 'high',
    verdict: 'suspicious',
    label: 'Suspicious',
    shortLabel: 'Suspicious',
    color: '#f97316',
    background: 'rgba(249, 115, 22, 0.12)',
    border: '#f97316',
    icon: 'alert',
    action: 'warn',
    i18nKey: 'verdict.suspicious',
    description: 'Strong lookalike or mixed-script indicators detected.',
  },
  {
    level: 5,
    severity: 'critical',
    verdict: 'deceptive',
    label: 'Deceptive',
    shortLabel: 'Deceptive',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    icon: 'block',
    action: 'block',
    i18nKey: 'verdict.deceptive',
    description: 'Likely designed to mislead users by imitating a trusted identity.',
  },
  {
    level: 6,
    severity: 'critical',
    verdict: 'known-threat',
    label: 'Known Threat',
    shortLabel: 'Known Threat',
    color: '#171717',
    background: 'rgba(23, 23, 23, 0.9)',
    border: '#000000',
    icon: 'block',
    action: 'block',
    i18nKey: 'verdict.knownThreat',
    description: 'Confirmed threat intelligence match.',
  },
];

const TIER_BY_LEVEL = new Map(TIERS.map((tier) => [tier.level, tier]));
const TIER_BY_VERDICT = new Map(TIERS.map((tier) => [tier.verdict, tier]));

function getTier(verdict, severity) {
  if (typeof verdict === 'number') {
    return TIER_BY_LEVEL.get(verdict) || TIERS[0];
  }

  if (verdict && TIER_BY_VERDICT.has(verdict)) {
    return TIER_BY_VERDICT.get(verdict);
  }

  if (severity === 'critical') return TIERS[5];
  if (severity === 'high') return TIERS[4];
  if (severity === 'medium') return TIERS[3];
  if (severity === 'low') return TIERS[2];
  return TIERS[0];
}

function listTiers() {
  return TIERS.map((tier) => ({
    level: tier.level,
    severity: tier.severity,
    verdict: tier.verdict,
    label: tier.label,
    color: tier.color,
    icon: tier.icon,
    i18nKey: tier.i18nKey,
    action: tier.action,
  }));
}

module.exports = {
  TIERS,
  getTier,
  listTiers,
};
