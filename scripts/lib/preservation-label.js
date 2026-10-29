/**
 * Shared restoration-preservation label for generators.
 *
 * Replaces the retired tier system (see archive/tier-system/): describes what a
 * displayed form preserves that ASCII cannot say, computed mechanically from
 * the form itself via the canonical engine — nothing stored, nothing to drift.
 */
const { preservedFeatures } = require('../../type/js/engine.js');

function preservationLabel(unicode) {
  return preservedFeatures(unicode).label;
}

module.exports = { preservationLabel };
