import express from 'express';
import db from './db.js';
import { addWhereVestiges, addWhereDecouvertes, addWhereBiblio, addOrderAliasOnSelectDistinct, cacheMiddleware } from './middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Helper for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, 'zotero_cache.json');

router.get('/', (req, res) => res.render('index.html'));
router.get('/bibliographie', (req, res) => res.render('zotero.html'));

const ZOTERO_GROUP_ID = 6259582;

// --- ZOTERO BACKGROUND CACHE SERVICE ---
const CACHE = {
    items: [],       
    collections: [], 
    lastUpdated: null,
    isUpdating: false
};

// 1. Load Cache from Disk on Startup
function loadCacheFromDisk() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (data.items && data.items.length > 0) {
                CACHE.items = data.items;
                CACHE.collections = data.collections || [];
                CACHE.lastUpdated = data.lastUpdated;
                console.log(`📂 Loaded Zotero Cache from disk: ${CACHE.items.length} items.`);
            }
        }
    } catch (err) {
        console.error("Failed to load disk cache:", err.message);
    }
}

// 2. Save Cache to Disk
function saveCacheToDisk() {
    try {
        const data = JSON.stringify({
            items: CACHE.items,
            collections: CACHE.collections,
            lastUpdated: new Date()
        });
        fs.writeFileSync(CACHE_FILE, data);
        console.log("💾 Saved Zotero cache to disk.");
    } catch (err) {
        console.error("Failed to save disk cache:", err.message);
    }
}

// Helper: Sleep (to prevent rate limiting)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Helper: Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Function to fetch ALL data pages
async function updateZoteroCache() {
    if (CACHE.isUpdating) return;
    CACHE.isUpdating = true;
    console.log('🔄 Zotero Cache: Starting full background update...');

    try {
        const headers = { 'User-Agent': 'Cartalex-App/1.0' };
        
        // A. Fetch Collections
        const colUrl = `https://api.zotero.org/groups/${ZOTERO_GROUP_ID}/collections?limit=100`;
        const colRes = await fetchWithTimeout(colUrl, { headers });
        if (colRes.ok) {
            const rawCols = await colRes.json();
            CACHE.collections = rawCols.map(c => ({
                key: c.key,
                name: c.data.name,
                numItems: c.meta.numItems,
                parent: c.data.parentCollection
            })).sort((a, b) => a.name.localeCompare(b.name));
        }

        // B. Fetch ALL Items (Pagination Loop)
        let allItems = [];
        let start = 0;
        // CHANGED: Lower limit to 25 to be safer
        const limit = 25; 
        let hasMore = true;
        const baseUrl = `https://api.zotero.org/groups/${ZOTERO_GROUP_ID}/items/top`; 

        while (hasMore) {
            const itemsUrl = `${baseUrl}?format=json&limit=${limit}&start=${start}&sort=creator&direction=asc&include=bib&style=apa`;
            
            console.log(`   -> Fetching items ${start} to ${start + limit}...`);
            const itemsRes = await fetchWithTimeout(itemsUrl, { headers });

            if (!itemsRes.ok) {
                console.warn(`⚠️ Failed batch ${start}: ${itemsRes.statusText}`);
                // If failing, maybe try again after short delay? For now, break.
                break; 
            }

            const batch = await itemsRes.json();
            allItems = allItems.concat(batch);

            if (batch.length < limit) {
                hasMore = false;
            } else {
                start += limit;
                // CHANGED: Wait 1 second between requests to be nice to Zotero API
                await sleep(1000); 
            }
        }

        if (allItems.length > 0) {
            CACHE.items = allItems;
            CACHE.lastUpdated = new Date();
            console.log(`✅ Zotero Cache: Complete! Loaded ${CACHE.items.length} items.`);
            saveCacheToDisk(); 
        }

    } catch (err) {
        console.error("❌ Zotero Cache Update Failed:", err.message);
    } finally {
        CACHE.isUpdating = false;
    }
}

// --- INITIALIZATION ---
loadCacheFromDisk(); 
updateZoteroCache(); 
setInterval(updateZoteroCache, 3600000); 

// --- API ROUTES ---

router.get('/zotero-api', (req, res) => {
    const { collectionKey } = req.query;
    let results = CACHE.items;

    if (collectionKey && collectionKey !== 'top' && collectionKey !== 'all') {
        results = results.filter(item => 
            item.data.collections && item.data.collections.includes(collectionKey)
        );
    }

    res.json(results);
});

router.get('/zotero-collections', (req, res) => {
    res.json(CACHE.collections);
});

// --- Map Routes ---
router.get('/carte/:fid(\\d+)', (req, res) => res.render('map.html'));
router.get('/carte', (req, res) => res.render('map.html'));

// --- Site Details Endpoint ---
router.get('/sitesFouilles/:fid/details', async (req, res, next) => {
    const { fid } = req.params;
    try {
        const details = await db.oneOrNone(`
            SELECT sf.id, sf.num_tkaczow, sf.commentaire, sf."labelFr"
            FROM public.sites_fouilles AS sf
            WHERE sf.fid = $1;
        `, [fid]);

        if (!details) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const discoveries = await db.any(`
            SELECT p.nom AS inventeur, d.date_decouverte, dt."labelFr" as type_decouverte
            FROM public.decouvertes AS d
            LEFT JOIN public.personnes AS p ON d.id_inventeur = p.id
            LEFT JOIN public.discovery_types AS dt ON d.type = dt.id
            WHERE d.fid_site = $1 ORDER BY d.date_decouverte ASC;
        `, [fid]);

        const vestiges = await db.any(`
            SELECT c.caracterisation, p.periode FROM public.vestiges v
            JOIN public.caracterisations c ON v.id_caracterisation = c.id
            LEFT JOIN public.datations d ON v.id = d.id_vestige
            LEFT JOIN public.periodes p ON d.id_periode = p.id
            WHERE v.fid_site = $1;
        `, [fid]);

        const bibliographies = await db.any(`
            SELECT b."Title" as title, b."Publication_Title" as publication_title,
            b."Author" as author, b."Date" as date, b."Item_Type" as item_type,
            b."Url" as url, b."Place" as place, b."Publisher" as publisher,
            b."Volume" as volume, b."Issue" as issue, b."Access_Date" as access_date, rb.pages
            FROM public.bibliography_zotero b
            JOIN public."references_biblio" rb ON b.id = rb.id_biblio
            WHERE rb.fid_site = $1;
        `, [fid]);
        
        res.json({ details, discoveries, vestiges, bibliographies });
    } catch (error) {
        next(error);
    }
});

// --- Other Routes (Unchanged) ---
router.get('/getValues/:tableName', cacheMiddleware, addOrderAliasOnSelectDistinct, async (req, res, next) => {
    const { tableName } = req.params;
    let dbquery = res.locals.selectQuery;
    switch (tableName) {
        case 'vestiges': 
            dbquery += ' FROM public.vestiges JOIN public.datations ON public.vestiges.id = public.datations.id_vestige JOIN public.caracterisations ON public.vestiges.id_caracterisation = public.caracterisations.id JOIN public.periodes ON public.datations.id_periode = public.periodes.id'; 
            break;
        case 'bibliographies': 
            dbquery += ' FROM public.bibliography_zotero'; 
            break;
        case 'periodes': 
            dbquery += ' FROM public.periodes'; 
            break;
        case 'decouvertes': 
            dbquery += ' FROM public.decouvertes JOIN public.personnes ON public.decouvertes.id_inventeur = public.personnes.id'; 
            break;
        case 'parcellesRegion':
            dbquery += ` FROM public.parcelles_region`; 
            break;
        default: 
            return res.status(404).json({ error: 'Table not found' });
    }
    dbquery += res.locals.orderQuery;
    try {
        const values = await db.any(dbquery);
        res.json(values);
    } catch (error) {
        next(error);
    }
});

router.get('/sitesFouilles/vestiges', addWhereVestiges, async (req, res, next) => {
    const dbquery = `
        SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf
        JOIN public.vestiges AS v ON v.id_site = sf.id
        JOIN public.datations AS dat ON dat.id_vestige = v.id
        JOIN public.periodes AS p ON dat.id_periode = p.id
        JOIN public.caracterisations AS c ON v.id_caracterisation = c.id
        ${res.locals.whereClause}`;
    try {
        const values = await db.any(dbquery);
        res.json(values);
    } catch (error) {
        next(error);
    }
});

router.get('/sitesFouilles/decouvertes', addWhereDecouvertes, async (req, res, next) => {
    const dbquery = `
        SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf
        JOIN public.decouvertes AS d ON sf.id = d.id_site
        JOIN public.personnes AS p ON d.id_inventeur = p.id
        ${res.locals.whereClause}`;
    try {
        const values = await db.any(dbquery);
        res.json(values);
    } catch (error) {
        next(error);
    }
});

router.get('/sitesFouilles/bibliographies', addWhereBiblio, async (req, res, next) => {
    const dbquery = `
        SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf
        JOIN public."references_biblio" AS rb ON sf.fid = rb.fid_site
        JOIN public.bibliography_zotero AS b ON b.id = rb.id_biblio
        ${res.locals.whereClause}`;
    try {
        const values = await db.any(dbquery);
        res.json(values);
    } catch (error) {
        next(error);
    }
});

router.get('/parcellesRegion/general', async (req, res, next) => {
    let whereClause = "";
    const conditions = [];
    if (req.query.nom) {
        const noms = req.query.nom.split('|').map(val => `'${val.replace(/'/g, "''")}'`).join(',');
        conditions.push(`nom IN (${noms})`);
    }
    if (req.query.numero) {
        const numeros = req.query.numero.split('|').map(val => `'${val.replace(/'/g, "''")}'`).join(',');
        conditions.push(`numero IN (${numeros})`);
    }
    if (conditions.length > 0) {
        whereClause = ' WHERE ' + conditions.join(' AND ');
    }
    const dbquery = `SELECT fid as id FROM public.parcelles_region${whereClause}`;
    try {
        const values = await db.any(dbquery);
        res.json(values);
    } catch (error) {
        next(error);
    }
});

export default router;