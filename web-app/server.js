const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = ''; // Get from https://console.cloud.google.com

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (index.html)

// Serve Frontend at Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// LAYER 1: Domain Blacklist
// ==========================================
const adultDomains = [
    'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com',
    'youporn.com', 'xhamster.com', 'tube8.com', 'spankbang.com',
    'pornhd.com', 'beeg.com', 'xnxx.tv', 'tnaflix.com',
];

const violentDomains = [
    'bestgore.com', 'liveleak.com', 'goregrish.com',
    'documentingreality.com', 'theync.com'
];

function checkBlacklist(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');

        if (adultDomains.includes(hostname)) {
            return { blocked: true, category: 'Adult Content', reason: 'Domain found in adult blacklist', severity: 'HIGH' };
        }
        if (violentDomains.includes(hostname)) {
            return { blocked: true, category: 'Violent Content', reason: 'Domain found in violence blacklist', severity: 'HIGH' };
        }
        return null;
    } catch (e) {
        console.error('URL Parsing Error in Blacklist:', e);
        return null; // Let other layers handle malformed URLs if strictly necessary, or handle invalid URL earlier
    }
}

// ==========================================
// LAYER 2: Keyword Detection
// ==========================================
const adultKeywords = [
    'porn', 'xxx', 'sex', 'nude', 'adult', 'nsfw',
    'hentai', 'camgirl', 'onlyfans', 'escort', 'dating',
    'hookup', 'milf', 'teen', 'webcam'
];

const violentKeywords = [
    'gore', 'death', 'murder', 'torture', 'execution',
    'beheading', 'suicide', 'selfharm', 'kill', 'violent'
];

function checkKeywords(url) {
    const lowerUrl = url.toLowerCase();

    for (const word of adultKeywords) {
        if (lowerUrl.includes(word)) {
            return { blocked: true, category: 'Adult Content', reason: `URL contains restricted keyword: "${word}"`, severity: 'MEDIUM' };
        }
    }

    for (const word of violentKeywords) {
        if (lowerUrl.includes(word)) {
            return { blocked: true, category: 'Violent Content', reason: `URL contains restricted keyword: "${word}"`, severity: 'MEDIUM' };
        }
    }

    return null;
}

// ==========================================
// LAYER 3: Google Safe Browsing API
// ==========================================
async function checkGoogleSafeBrowsing(url) {
    if (API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
        console.warn('Google API Key not set. Skipping Layer 3.');
        return null;
    }

    try {
        const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client: {
                    clientId: "safeguard-kids",
                    clientVersion: "1.0.0"
                },
                threatInfo: {
                    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{ "url": url }]
                }
            })
        });

        const data = await response.json();

        if (data.matches && data.matches.length > 0) {
            const match = data.matches[0];
            return {
                blocked: true,
                category: 'Malicious Content',
                reason: `Google Safe Browsing detected threat: ${match.threatType}`,
                severity: 'HIGH'
            };
        }

        return null;
    } catch (error) {
        console.error('Google Safe Browsing API Error:', error);
        return null; // Fail open (safe) on API error to avoid blocking everything
    }
}

// ==========================================
// API Endpoint
// ==========================================
app.post('/check', async (req, res) => {
    const { url } = req.body;

    console.log(`Checking URL: ${url}`);

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Add protocol if missing for better parsing
    let infoUrl = url;
    if (!/^https?:\/\//i.test(infoUrl)) {
        infoUrl = 'http://' + infoUrl;
    }

    // 1. Blacklist Check
    const blacklistResult = checkBlacklist(infoUrl);
    if (blacklistResult) {
        console.log(`Result: BLOCKED - ${blacklistResult.reason}`);
        return res.json(blacklistResult);
    }

    // 2. Keyword Check
    const keywordResult = checkKeywords(infoUrl);
    if (keywordResult) {
        console.log(`Result: BLOCKED - ${keywordResult.reason}`);
        return res.json(keywordResult);
    }

    // 3. Google Safe Browsing Check
    const apiResult = await checkGoogleSafeBrowsing(infoUrl);
    if (apiResult) {
        console.log(`Result: BLOCKED - ${apiResult.reason}`);
        return res.json(apiResult);
    }

    // If all pass
    console.log('Result: SAFE');
    res.json({
        blocked: false,
        category: 'Safe',
        reason: 'This website passed all safety checks',
        severity: 'NONE'
    });
});

app.listen(PORT, () => {
    console.log(`✅ SafeGuard API running on http://localhost:${PORT}`);
    console.log(`ℹ️  Submit URLs to POST /check to test.`);
});
