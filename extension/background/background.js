/**
 * PÚNYCODEX Type — Background Service Worker (Manifest V3)
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
        console.log('PÚNYCODEX Type installed.');
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.sync.get([
            'enabled', 'pantheonFilter', 'inlineMode', 'siteMode', 'siteList'
        ]).then(sendResponse);
        return true; // async response
    }
    if (request.action === 'copyToClipboard') {
        navigator.clipboard.writeText(request.text).then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }
});
