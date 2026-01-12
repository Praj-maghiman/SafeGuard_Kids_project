// SafeGuard Auto-Guard Background Service

const SAFEGUARD_API = 'http://localhost:3000/check';
const BLOCK_PAGE = 'http://localhost:3000/';

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check when the specific URL updates and is fully loading/loaded
    if (changeInfo.url) {
        verifyUrl(tabId, changeInfo.url);
    }
});

async function verifyUrl(tabId, url) {
    // 1. IGNORE SafeGuard itself (Infinite Loop Prevention)
    if (url.startsWith(BLOCK_PAGE) || url.includes('localhost:3000')) {
        return;
    }

    // 2. IGNORE Browser Internal Pages
    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
        return;
    }

    console.log(`[Auto-Guard] Checking: ${url}`);

    try {
        const response = await fetch(SAFEGUARD_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        const data = await response.json();

        if (data.blocked) {
            console.log(`[Auto-Guard] BLOCKED! Redirecting...`);

            // Construct redirect URL with parameters for the UI
            const redirectUrl = `${BLOCK_PAGE}?blocked=true&url=${encodeURIComponent(url)}&category=${encodeURIComponent(data.category)}&reason=${encodeURIComponent(data.reason)}&severity=${encodeURIComponent(data.severity)}`;

            chrome.tabs.update(tabId, { url: redirectUrl });
        } else {
            console.log(`[Auto-Guard] SAFE.`);
        }

    } catch (error) {
        console.error('[Auto-Guard] Server error:', error);
        // Fail SIlently: If server is down, we don't block the internet, 
        // but we might want to notify the user in a stricter version.
    }
}
