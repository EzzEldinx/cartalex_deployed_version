import express from 'express';
import db from './db.js';
import { addWhereVestiges, addWhereDecouvertes, addWhereBiblio, addOrderAliasOnSelectDistinct, cacheMiddleware } from './middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, 'zotero_cache.json');

// --- PAGE ROUTES ---
router.get('/', (req, res) => res.render('index.html'));
router.get('/bibliography', (req, res) => res.render('zotero.html'));

const ZOTERO_GROUP_ID = 6259582;

function sortZoteroItems(items) {
    return items.sort((a, b) => {
        const getAuthor = (item) => {
            const c = item.data.creators;
            if (c && c.length > 0) return (c[0].lastName || c[0].name || "").toLowerCase();
            return "zzz"; 
        };
        const authorA = getAuthor(a), authorB = getAuthor(b);
        if (authorA < authorB) return -1;
        if (authorA > authorB) return 1;
        const dateA = a.data.date || "0000", dateB = b.data.date || "0000";
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
    });
}

const CACHE = { items: [], collections: [], lastUpdated: null, isUpdating: false };

function loadCacheFromDisk() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (data.items) { CACHE.items = data.items; CACHE.collections = data.collections || []; CACHE.lastUpdated = data.lastUpdated; }
        }
    } catch (err) { console.error("⚠️ Disk cache empty."); }
}

function saveCacheToDisk() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ items: CACHE.items, collections: CACHE.collections, lastUpdated: new Date() }));
    } catch (err) { console.error("❌ Failed to save cache."); }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function updateZoteroCache() {
    if (CACHE.isUpdating) return;
    CACHE.isUpdating = true;
    let fetchedItems = [];
    try {
        const headers = { 'User-Agent': 'Cartalex-App/1.0' };
        let start = 0, limit = 50, hasMore = true;
        while (hasMore) {
            const res = await fetch(`https://api.zotero.org/groups/${ZOTERO_GROUP_ID}/items?format=json&include=bib,data&limit=${limit}&start=${start}&sort=creator&direction=asc`, { headers });
            if (!res.ok) break; 
            const batch = await res.json();
            fetchedItems = fetchedItems.concat(batch);
            if (batch.length < limit) hasMore = false;
            else { start += limit; await sleep(1500); }
        }
        if (fetchedItems.length > 0) { CACHE.items = sortZoteroItems(fetchedItems); saveCacheToDisk(); }
    } catch (err) { console.error("❌ Cache Error:", err.message); } finally { CACHE.isUpdating = false; }
}

loadCacheFromDisk(); 
updateZoteroCache(); 
setInterval(updateZoteroCache, 3600000); 

router.get('/zotero-collections', (req, res) => res.json(CACHE.collections || []));
router.get('/zotero-api', async (req, res) => {
    const { collectionKey } = req.query;
    if (CACHE.items.length > 0) {
        let resItems = CACHE.items;
        if (collectionKey && collectionKey !== 'all') {
            resItems = (collectionKey === 'top') ? resItems.filter(i => i.bib) : resItems.filter(i => i.data.collections && i.data.collections.includes(collectionKey));
        }
        return res.json(resItems);
    }
    res.status(500).json({ error: "Cache empty." });
});

router.get('/carte/:fid(\\d+)', (req, res) => res.render('map.html'));
router.get('/carte', (req, res) => res.render('map.html'));

// --- SITE DETAILS (FIXED: Underscores for Bibliography + Label Safe Mode) ---
router.get('/sitesFouilles/:fid/details', async (req, res, next) => {
    const { fid } = req.params;
    
    try {
        // Safe Mode: Forces labelFr since labelEn is missing in local DB
        const details = await db.oneOrNone(`
            SELECT sf.id, sf.num_tkaczow, sf.commentaire, 
            sf."labelFr" as label 
            FROM public.sites_fouilles AS sf 
            WHERE sf.fid = $1;
        `, [fid]);

        if (!details) return res.status(404).json({ error: 'Site not found' });
        
        // Sub-tables: defaulting to labelFr where applicable
        const discoveries = await db.any(`SELECT p.nom AS inventeur, d.date_decouverte, dt."labelFr" as type_decouverte FROM public.decouvertes AS d LEFT JOIN public.personnes AS p ON d.id_inventeur = p.id LEFT JOIN public.discovery_types AS dt ON d.type = dt.id WHERE d.fid_site = $1 ORDER BY d.date_decouverte ASC;`, [fid]);
        const vestiges = await db.any(`SELECT c."labelFr" as caracterisation, p."labelFr" as periode FROM public.vestiges v JOIN public.caracterisations c ON v.id_caracterisation = c.id LEFT JOIN public.datations d ON v.id = d.id_vestige LEFT JOIN public.periodes p ON d.id_periode = p.id WHERE v.fid_site = $1;`, [fid]);
        
        // FIX: Replaced "Publication Title" with "Publication_Title" (and others) to match DB schema
        const bibliographies = await db.any(`
            SELECT b."Title" as title, b."Author" as author, b."Date" as date, 
            b."Publication_Title" as publication_title, 
            b."Volume" as volume, b."Issue" as issue, b."Pages" as pages, 
            b."Place" as place, b."Publisher" as publisher, b."Url" as url, 
            b."Access_Date" as access_date, b."Item_Type" as item_type 
            FROM public.bibliography_zotero b 
            JOIN public."references_biblio" rb ON b.id = rb.id_biblio 
            WHERE rb.fid_site = $1;
        `, [fid]);
        
        res.json({ details, discoveries, vestiges, bibliographies });
    } catch (error) { next(error); }
});

// --- DYNAMIC FILTERS ---
router.get('/getValues/:tableName', cacheMiddleware, addOrderAliasOnSelectDistinct, async (req, res, next) => {
    const { tableName } = req.params;
    const field = req.query.field;
    let dbquery = "";

    // Defaulting to labelFr for safety
    if (tableName === 'vestiges') {
        if (field === 'caracterisation') {
            dbquery = `SELECT DISTINCT c.caracterisation, c."labelFr" AS label FROM public.vestiges v JOIN public.caracterisations c ON v.id_caracterisation = c.id ORDER BY label`;
        } else if (field === 'periode') {
            dbquery = `SELECT DISTINCT p.periode, p."labelFr" AS label, p.date_debut FROM public.periodes p JOIN public.datations d ON p.id = d.id_periode JOIN public.vestiges v ON d.id_vestige = v.id ORDER BY p.date_debut`;
        }
    } else if (tableName === 'periodes') {
        dbquery = `SELECT DISTINCT periode, "labelFr" AS label, date_debut FROM public.periodes ORDER BY date_debut`;
    } else if (tableName === 'discovery_types') {
        dbquery = `SELECT DISTINCT id, "labelFr" AS label FROM public.discovery_types ORDER BY label`;
    } else {
        dbquery = res.locals.selectQuery;
        switch (tableName) {
            case 'bibliographies': dbquery += ' FROM public.bibliography_zotero'; break;
            case 'decouvertes': dbquery += ' FROM public.decouvertes JOIN public.personnes ON public.decouvertes.id_inventeur = public.personnes.id'; break;
            case 'parcellesRegion': dbquery += ` FROM public.parcelles_region`; break;
            default: return res.status(404).json({ error: 'Table not found' });
        }
        dbquery += res.locals.orderQuery;
    }

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
    if (conditions.length > 0) whereClause = ' WHERE ' + conditions.join(' AND ');
    const dbquery = `SELECT fid as id FROM public.parcelles_region${whereClause}`;
    try { const values = await db.any(dbquery); res.json(values); } catch (error) { next(error); }
});

export default router;