
const express = require('express');
const fetch = require('node-fetch');
const app = express();

const GROUP_ID = 6259582;   // ← ثابت هنا

app.use(express.static('public'));

app.get('/zotero', async (req, res) => {
    try {
        const url = `https://api.zotero.org/groups/${GROUP_ID}/items?format=json&limit=100`;

        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).send(await response.text());
        }

        const items = await response.json();
        return res.json(items);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
