const express = require('express');
const fetch = require('node-fetch');
const app = express();

const GROUP_ID = 6259582;

// Serve static files from the project structure
// Adjust '../html' if your folder structure is different
app.use(express.static('../html')); 
app.use(express.static('public'));

/**
 * ROUTE 1: Get Collections (Categories)
 * Required for the dropdown menu in bibliographie.html
 */
app.get('/zotero-collections', async (req, res) => {
    try {
        const url = `https://api.zotero.org/groups/${GROUP_ID}/collections?limit=100`;
        console.log(`Fetching collections: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Zotero Error: ${response.statusText}`);
        }

        const rawData = await response.json();

        // Simplify data for the frontend dropdown
        const collections = rawData.map(c => ({
            key: c.key,
            name: c.data.name,
            numItems: c.meta.numItems
        }));

        res.json(collections);

    } catch (err) {
        console.error("Collections Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * ROUTE 2: Get Items
 * Required for the bibliography list.
 * Note: We MUST add 'include=bib' to get the HTML citation.
 */
app.get('/zotero-api', async (req, res) => {
    try {
        const { collectionKey } = req.query;
        
        // Base URL
        let url = `https://api.zotero.org/groups/${GROUP_ID}`;

        // Determine filter logic based on dropdown selection
        if (collectionKey === 'top' || !collectionKey) {
            url += `/items/top`; // Top-level items only
        } else if (collectionKey === 'all') {
            url += `/items`;     // Everything
        } else {
            url += `/collections/${collectionKey}/items`; // Specific folder
        }

        // CRITICAL: We request 'bib' (HTML citation) and 'data' (Metadata)
        // 'sort=date' ensures chronological order
        url += `?format=json&include=bib,data&limit=100&sort=date&direction=desc`;

        console.log(`Fetching items: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            // Forward the Zotero error text to the frontend
            return res.status(response.status).send(await response.text());
        }

        const items = await response.json();
        return res.json(items);

    } catch (err) {
        console.error("Items Error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Route for direct access (optional backup)
app.get('/zotero', async (req, res) => {
    res.redirect('/zotero-api?collectionKey=top');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));