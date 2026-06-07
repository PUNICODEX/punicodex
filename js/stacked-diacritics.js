/**
 * Stacked Diacritics — Visual Unicode Decomposition
 * Renders NFD-decomposed characters as base letter + stacked marks.
 * Works in browser (window.StackedDiacritics) and Node.js (require).
 */

(function () {
    'use strict';

    const DOTTED_CIRCLE = '\u25CC';

    function isCombiningMark(codePoint) {
        return (codePoint >= 0x0300 && codePoint <= 0x036F) ||   // Combining Diacritical Marks
               (codePoint >= 0x1AB0 && codePoint <= 0x1AFF) ||   // Extended
               (codePoint >= 0x1DC0 && codePoint <= 0x1DFF) ||   // Supplement
               (codePoint >= 0x20D0 && codePoint <= 0x20FF) ||   // for Symbols
               (codePoint >= 0xFE20 && codePoint <= 0xFE2F);     // Half Marks
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Check if a string contains any combining marks when NFD-decomposed.
     */
    function hasStackedDiacritics(text) {
        if (!text) return false;
        const nfd = String(text).normalize('NFD');
        for (const char of nfd) {
            if (isCombiningMark(char.codePointAt(0))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Render text with a stacked-diacritics visualization.
     * Each grapheme cluster is shown as:
     *   [marks on dotted circles]
     *   [base character]
     *
     * Returns an HTML string.
     */
    function render(text) {
        if (!text) return '';
        const nfd = String(text).normalize('NFD');
        const chars = Array.from(nfd);
        let html = '<span class="stacked-diacritics">';

        let i = 0;
        while (i < chars.length) {
            const base = chars[i];
            i++;

            const marks = [];
            while (i < chars.length) {
                const cp = chars[i].codePointAt(0);
                if (isCombiningMark(cp)) {
                    marks.push(chars[i]);
                    i++;
                } else {
                    break;
                }
            }

            if (marks.length === 0) {
                html += '<span class="sd-plain">' + escapeHtml(base) + '</span>';
            } else {
                html += '<span class="sd-char">';
                html += '<span class="sd-marks">';
                for (const mark of marks) {
                    // Dotted circle gives the mark a visible anchor
                    html += '<span class="sd-mark">' + escapeHtml(DOTTED_CIRCLE + mark) + '</span>';
                }
                html += '</span>';
                html += '<span class="sd-base">' + escapeHtml(base) + '</span>';
                html += '</span>';
            }
        }

        html += '</span>';
        return html;
    }

    const StackedDiacritics = {
        render,
        hasStackedDiacritics,
        isCombiningMark,
        escapeHtml
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = StackedDiacritics;
    }
    if (typeof window !== 'undefined') {
        window.StackedDiacritics = StackedDiacritics;
    }
})();
