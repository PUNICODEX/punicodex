/**
 * PuniCodex Type — Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.storage.sync.set({
            enabled: true,
            pantheonFilter: 'all',
            inlineMode: true,
            showPreview: true,
            siteMode: 'all',
            siteList: [],
        });
        console.log('PuniCodex Type installed.');
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.sync.get([
            'enabled', 'pantheonFilter', 'inlineMode', 'showPreview', 'siteMode', 'siteList'
        ]).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'copyToClipboard') {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(request.text).then(() => {
                sendResponse({ success: true });
            }).catch(err => {
                console.warn('Clipboard write failed:', err);
                sendResponse({ success: false, error: err.message });
            });
        } else {
            console.warn('Clipboard API unavailable in service worker');
            sendResponse({ success: false, error: 'Clipboard API unavailable' });
        }
        return true;
    }
});
