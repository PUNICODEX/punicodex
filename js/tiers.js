/**
 * PÚNYCODEX — Tier System Page JavaScript
 * Populate tier tags, handle converter
 */

(function() {
    'use strict';

    // Populate tier archetype tags
    function populateTierTags() {
        if (typeof ARCHETYPES === 'undefined') return;

        const tier1Container = document.getElementById('tier1-tags');
        const tier2Container = document.getElementById('tier2-tags');
        const tierDualContainer = document.getElementById('tier-dual-tags');

        if (tier1Container) {
            const tier1 = ARCHETYPES.filter(a => a.tier === 'tier-1' && a.tierDetail === 'single-tier')
                .sort((a, b) => a.name.localeCompare(b.name));
            tier1Container.innerHTML = tier1.map(a =>
                `<span class="tier-tag" title="${a.greek}">${a.name}</span>`
            ).join('');
        }

        if (tier2Container) {
            const tier2 = ARCHETYPES.filter(a => a.tier === 'tier-2')
                .sort((a, b) => a.name.localeCompare(b.name));
            tier2Container.innerHTML = tier2.map(a =>
                `<span class="tier-tag" title="${a.greek}">${a.name}</span>`
            ).join('');
        }

        if (tierDualContainer) {
            const dual = ARCHETYPES.filter(a => a.tier === 'dual-tier')
                .sort((a, b) => a.name.localeCompare(b.name));
            tierDualContainer.innerHTML = dual.map(a =>
                `<span class="tier-tag" title="${a.greek}">${a.name}</span>`
            ).join('');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populateTierTags);
    } else {
        populateTierTags();
    }

    // Simple Punycode converter (simulated - uses basic prefix for demo)
    const converterInput = document.getElementById('converter-input');
    const converterBtn = document.getElementById('converter-btn');
    const converterResult = document.getElementById('converter-result');
    const resultUnicode = document.getElementById('result-unicode');
    const resultPunycode = document.getElementById('result-punycode');

    function convertDomain() {
        const input = converterInput.value.trim();
        if (!input) return;

        // Find matching archetype
        const match = typeof ARCHETYPES !== 'undefined'
            ? ARCHETYPES.find(a => input.includes(a.domainUnicode) || input.includes(a.id))
            : null;

        if (match) {
            resultUnicode.textContent = match.domainUnicode;
            resultPunycode.textContent = match.domainPunycode;
        } else {
            resultUnicode.textContent = input;
            resultPunycode.textContent = 'xn--[unknown-encoding].com';
        }

        converterResult.classList.remove('hidden');
    }

    if (converterBtn) {
        converterBtn.addEventListener('click', convertDomain);
    }

    if (converterInput) {
        converterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') convertDomain();
        });
    }

})();
