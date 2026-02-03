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

// --- PAGE ROUTES ---
// These names correspond to the files in src/html/
router.get('/', (req, res) => res.render('index'));
router.get('/bibliographie', (req, res) => res.render('zotero'));
router.get('/carte', (req, res) => res.render('map'));
router.get('/carte/:fid(\\d+)', (req, res) => res.render('map'));

const ZOTERO_GROUP_ID = 6259582;

// =======================================================================
//  HELPER: CUSTOM SORT (Author -> Date)
// =======================================================================
function sortZoteroItems(items) {
    return items.sort((a, b) => {
        // 1. Extract Author (Creator)
        const getAuthor = (item) => {
            const c = item.data.creators;
            // Handle organizations (name) or individuals (lastName)
            if (c && c.length > 0) {
                return (c[0].lastName || c[0].name || "").toLowerCase();
            }
            return "zzz"; // No author? Put at the end
        };

        const authorA = getAuthor(a);
        const authorB = getAuthor(b);

        // Sort by Author A-Z
        if (authorA < authorB) return -1;
        if (authorA > authorB) return 1;

        // 2. If Authors Match -> Sort by Date (Oldest to Newest)
        const dateA = a.data.date || "0000";
        const dateB = b.data.date || "0000";

        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        return 0;
    });
}

// =======================================================================
//  HYBRID ZOTERO CACHE SYSTEM
// =======================================================================

const CACHE = {
    items: [],       
    collections: [], 
    lastUpdated: null,
    isUpdating: false
};

// 1. Load Cache on Startup
function loadCacheFromDisk() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (data.items && data.items.length > 0) {
                CACHE.items = data.items;
                CACHE.collections = data.collections || [];
                CACHE.lastUpdated = data.lastUpdated;
                console.log(`📂 Loaded Cache: ${CACHE.items.length} items.`);
            }
        }
    } catch (err) {
        console.error("⚠️ Disk cache empty or invalid.");
    }
}

// 2. Save Cache
function saveCacheToDisk() {
    try {
        const data = JSON.stringify({
            items: CACHE.items,
            collections: CACHE.collections,
            lastUpdated: new Date()
        });
        fs.writeFileSync(CACHE_FILE, data);
        console.log("💾 Cache saved to disk.");
    } catch (err) {
        console.error("❌ Failed to save cache:", err.message);
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 3. Background Update (Gentle Mode)
async function updateZoteroCache() {
    if (CACHE.isUpdating) return;
    CACHE.isUpdating = true;
    console.log('🔄 Starting Background Cache Update...');

    let fetchedItems = [];
    
    try {
        const headers = { 'User-Agent': 'Cartalex-App/1.0' };
        
        // A. Fetch Collections (Internal use)
        try {
            const colRes = await fetch(`https://api.zotero.org/groups/${ZOTERO_GROUP_ID}/collections?limit=100`, { headers });
            if (colRes.ok) {
                const rawCols = await colRes.json();
                CACHE.collections = rawCols.map(c => ({
                    key: c.key, name: c.data.name, numItems: c.meta.numItems, parent: c.data.parentCollection
                })).sort((a, b) => a.name.localeCompare(b.name));
            }
        } catch (e) { console.warn("⚠️ Failed to update collections:", e.message); }

        // B. Fetch Items (Pagination)
        let start = 0;
        const limit = 50; 
        let hasMore = true;
        const baseUrl = `https://api.zotero.org/groups/${ZOTERO_GROUP_ID}/items`; 

        while (hasMore) {
            const url = `${baseUrl}?format=json&include=bib,data&limit=${limit}&start=${start}&sort=creator&direction=asc`;
            
            console.log(`   -> Fetching batch ${start}...`);
            const res = await fetch(url, { headers });

            if (!res.ok) {
                console.error(`   ❌ Batch failed (${res.status}). Stopping update.`);
                break; 
            }

            const batch = await res.json();
            fetchedItems = fetchedItems.concat(batch);

            if (batch.length < limit) {
                hasMore = false;
            } else {
                start += limit;
                await sleep(1500); 
            }
        }

        // C. Update Cache
        if (fetchedItems.length > 0) {
            // APPLY SORTING BEFORE SAVING
            CACHE.items = sortZoteroItems(fetchedItems);
            
            CACHE.lastUpdated = new Date();
            console.log(`✅ Cache Updated: ${CACHE.items.length} items (Sorted).`);
            saveCacheToDisk(); 
        }

    } catch (err) {
        console.error("❌ Cache Update Error:", err.message);
    } finally {
        CACHE.isUpdating = false;
    }
}

// Start Cache Logic
loadCacheFromDisk(); 
updateZoteroCache(); 
setInterval(updateZoteroCache, 3600000); 

// =======================================================================
//  HYBRID ROUTES
// =======================================================================

router.get('/zotero-collections', (req, res) => {
    res.json(CACHE.collections || []);
});

router.get('/zotero-api', async (req, res) => {
    const { collectionKey } = req.query;

    // STRATEGY 1: CACHE HIT (Fast)
    if (CACHE.items && CACHE.items.length > 0) {
        let results = CACHE.items;
        
        // Filter in memory
        if (collectionKey && collectionKey !== 'all') {
            if (collectionKey === 'top') {
                results = results.filter(item => item.bib);
            } else {
                results = results.filter(item => item.data.collections && item.data.collections.includes(collectionKey));
            }
        }
        return res.json(results);
    }

    // STRATEGY 2: CACHE MISS -> LIVE FALLBACK
    console.log("⚠️ Cache empty. Fallback to Live Zotero Request...");
    
    try {
        let url = `https://api.zotero.org/groups/${ZOTERO_GROUP_ID}`;
        if (!collectionKey || collectionKey === 'top') url += `/items/top`;
        else if (collectionKey === 'all') url += `/items`;
        else url += `/collections/${collectionKey}/items`;

        url += `?format=json&include=bib,data&limit=50&sort=creator&direction=asc`;

        const response = await fetch(url);
        if (!response.ok) return res.status(response.status).send(await response.text());
        
        const items = await response.json();
        
        // APPLY SORTING TO FALLBACK DATA TOO
        const sortedItems = sortZoteroItems(items);
        
        res.json(sortedItems);

    } catch (err) {
        console.error("Fallback Error:", err);
        res.status(500).json({ error: "Unable to load bibliography (Live Fetch Failed)." });
    }
});

// --- Map & DB Routes ---

router.get('/sitesFouilles/:fid/details', async (req, res, next) => {
    const { fid } = req.params;
    try {
        const details = await db.oneOrNone('SELECT sf.id, sf.num_tkaczow, sf.commentaire, sf."labelFr" FROM public.sites_fouilles AS sf WHERE sf.fid = $1;', [fid]);
        if (!details) return res.status(404).json({ error: 'Site not found' });

        const discoveries = await db.any('SELECT p.nom AS inventeur, d.date_decouverte, dt."labelFr" as type_decouverte FROM public.decouvertes AS d LEFT JOIN public.personnes AS p ON d.id_inventeur = p.id LEFT JOIN public.discovery_types AS dt ON d.type = dt.id WHERE d.fid_site = $1 ORDER BY d.date_decouverte ASC;', [fid]);
        
        // Updated query to include labelEn for dynamic translation support
        const vestiges = await db.any('SELECT v.id, c.caracterisation, c."labelEn", p.periode FROM public.vestiges v JOIN public.caracterisations c ON v.id_caracterisation = c.id LEFT JOIN public.datations d ON v.id = d.id_vestige LEFT JOIN public.periodes p ON d.id_periode = p.id WHERE v.fid_site = $1;', [fid]);
        
        const bibliographies = await db.any('SELECT b."Title" as title, b."Publication_Title" as publication_title, b."Author" as author, b."Date" as date, b."Item_Type" as item_type, b."Url" as url, b."Place" as place, b."Publisher" as publisher, b."Volume" as volume, b."Issue" as issue, b."Access_Date" as access_date, rb.pages FROM public.bibliography_zotero b JOIN public."references_biblio" rb ON b.id = rb.id_biblio WHERE rb.fid_site = $1;', [fid]);
        
        res.json({ details, discoveries, vestiges, bibliographies });
    } catch (error) { next(error); }
});

router.get('/getValues/:tableName', cacheMiddleware, addOrderAliasOnSelectDistinct, async (req, res, next) => {
    const { tableName } = req.params;
    let dbquery = res.locals.selectQuery;

    // Ensure labelEn is included when fetching from vestiges/caracterisations
    if (tableName === 'vestiges') {
        dbquery = dbquery.replace('SELECT DISTINCT', 'SELECT DISTINCT public.caracterisations."labelEn",');
    }

    switch (tableName) {
        case 'vestiges': dbquery += ' FROM public.vestiges JOIN public.datations ON public.vestiges.id = public.datations.id_vestige JOIN public.caracterisations ON public.vestiges.id_caracterisation = public.caracterisations.id JOIN public.periodes ON public.datations.id_periode = public.periodes.id'; break;
        case 'bibliographies': dbquery += ' FROM public.bibliography_zotero'; break;
        case 'periodes': dbquery += ' FROM public.periodes'; break;
        case 'decouvertes': dbquery += ' FROM public.decouvertes JOIN public.personnes ON public.decouvertes.id_inventeur = public.personnes.id'; break;
        case 'parcellesRegion': dbquery += ` FROM public.parcelles_region`; break;
        default: return res.status(404).json({ error: 'Table not found' });
    }
    dbquery += res.locals.orderQuery;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

router.get('/sitesFouilles/vestiges', addWhereVestiges, async (req, res, next) => {
    const dbquery = `SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf JOIN public.vestiges AS v ON v.id_site = sf.id JOIN public.datations AS dat ON dat.id_vestige = v.id JOIN public.periodes AS p ON dat.id_periode = p.id JOIN public.caracterisations AS c ON v.id_caracterisation = c.id ${res.locals.whereClause}`;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

router.get('/sitesFouilles/decouvertes', addWhereDecouvertes, async (req, res, next) => {
    const dbquery = `SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf JOIN public.decouvertes AS d ON sf.id = d.id_site JOIN public.personnes AS p ON d.id_inventeur = p.id ${res.locals.whereClause}`;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

router.get('/sitesFouilles/bibliographies', addWhereBiblio, async (req, res, next) => {
    const dbquery = `SELECT DISTINCT sf.fid as id FROM public.sites_fouilles AS sf JOIN public."references_biblio" AS rb ON sf.fid = rb.fid_site JOIN public.bibliography_zotero AS b ON b.id = rb.id_biblio ${res.locals.whereClause}`;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

router.get('/parcellesRegion/general', async (req, res, next) => {
    let whereClause = "";
    const conditions = [];
    if (req.query.nom) { const noms = req.query.nom.split('|').map(val => `'${val.replace(/'/g, "''")}'`).join(','); conditions.push(`nom IN (${noms})`); }
    if (req.query.numero) { const numeros = req.query.numero.split('|').map(val => `'${val.replace(/'/g, "''")}'`).join(','); conditions.push(`numero IN (${numeros})`); }
    if (conditions.length > 0) { whereClause = ' WHERE ' + conditions.join(' AND '); }
    const dbquery = `SELECT fid as id FROM public.parcelles_region${whereClause}`;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

export default router;