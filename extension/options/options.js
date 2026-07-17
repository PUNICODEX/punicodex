/**
 * PuniCodex Type — Options Page
 */

(function() {
    'use strict';

    const optInline = document.getElementById('opt-inline');
    const optPreview = document.getElementById('opt-preview');
    const optAuthenticity = document.getElementById('opt-authenticity');
    const optPantheon = document.getElementById('opt-pantheon');
    const modeAll = document.getElementById('mode-all');
    const modeAllowlist = document.getElementById('mode-allowlist');
    const modeBlocklist = document.getElementById('mode-blocklist');
    const siteList = document.getElementById('site-list');
    const saveBtn = document.getElementById('save-btn');
    const saveStatus = document.getElementById('save-status');

    const DEFAULT_SITES = [
        'google.com',
        '*.google.com',
        'bing.com',
        'duckduckgo.com',
        'wikipedia.org',
        '*.wikipedia.org',
    ];

    function getSiteMode() {
        if (modeAllowlist.checked) return 'allowlist';
        if (modeBlocklist.checked) return 'blocklist';
        return 'all';
    }

    function setSiteMode(mode) {
        modeAll.checked = mode === 'all';
        modeAllowlist.checked = mode === 'allowlist';
        modeBlocklist.checked = mode === 'blocklist';
    }

    // Load settings
    chrome.storage.sync.get([
        'enabled', 'inlineMode', 'showPreview', 'authenticityWarnings', 'pantheonFilter',
        'siteMode', 'siteList'
    ], (result) => {
        if (result.inlineMode !== undefined) optInline.checked = result.inlineMode;
        if (result.showPreview !== undefined) optPreview.checked = result.showPreview;
        if (result.authenticityWarnings !== undefined) optAuthenticity.checked = result.authenticityWarnings;
        if (result.pantheonFilter) optPantheon.value = result.pantheonFilter;
        setSiteMode(result.siteMode || 'all');
        siteList.value = (result.siteList || DEFAULT_SITES).join('\n');
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const sites = siteList.value
            .split('\n')
            .map(s => s.trim().toLowerCase())
            .filter(s => s.length > 0);

        chrome.storage.sync.set({
            enabled: true,
            inlineMode: optInline.checked,
            showPreview: optPreview.checked,
            authenticityWarnings: optAuthenticity.checked,
            pantheonFilter: optPantheon.value,
            siteMode: getSiteMode(),
            siteList: sites,
        }, () => {
            saveStatus.textContent = 'Saved!';
            setTimeout(() => saveStatus.textContent = '', 2000);
        });
    });
})();
