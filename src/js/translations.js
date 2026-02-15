/**
 * Translation Manager
 * Handles switching between French and English
 */
export const translations = {
    currentLang: 'fr', // Default language

    dictionary: {
        // --- TOOLS & BUTTONS ---
        "tool-measure": { fr: "Mesure", en: "Measure" },
        "tool-measure-panel": { fr: "Mesure de distance", en: "Distance measurement" },
        "tool-measure-total": { fr: "Distance totale", en: "Total Distance" },
        "tool-measure-segments": { fr: "Segments", en: "Segments" },
        "tool-measure-hint": { fr: "Cliquez sur la carte pour ajouter des points", en: "Click on the map to add points" },
        "tool-measure-points": { fr: "Points de mesure", en: "Measurement Points" },
        
        "tool-measure-undo": { fr: "Annuler le dernier", en: "Undo Last" },
        "tool-measure-clear": { fr: "Tout effacer", en: "Clear All" },
        "tool-measure-export": { fr: "Exporter GeoJSON", en: "Export GeoJSON" },
        
        "tool-measure-instr": { fr: "Instructions", en: "Instructions" },
        "tool-measure-instr-1": { fr: "Cliquez pour ajouter des points", en: "Click to add points" },
        "tool-measure-instr-2": { fr: "Double-cliquez pour terminer", en: "Double-click to finish" },
        "tool-measure-instr-3": { fr: "Utilisez les boutons ci-dessous", en: "Use buttons below" },

        // --- GENERAL UI ---
        "ui-query-filters": { fr: "Filtres de requête ▼", en: "Filters ▼" },
        "ui-reset": { fr: "Réinitialiser", en: "Reset" },
        "ui-close-panel": { fr: "Fermer le volet", en: "Close" },
        "ui-layer-selection": { fr: "Choix des couches", en: "Select layers" },
        "ui-map-title": { fr: "Carte des découvertes archéologiques d'Alexandrie", en: "Map of Archaeological Discoveries in Alexandria" },
        "ui-project-credit": { fr: "CEAlex (UAR 3134)", en: "CEAlex (UAR 3134)" },

        // --- LEFT PANEL / LAYER LIST ---
        "layer-sites_fouilles-points": { fr: "Découvertes archéologiques", en: "Archaeological discoveries" },
        "layer-emprises-fill": { fr: "Emprises des sites de fouilles CEAlex", en: "Footprint of excavations conducted by the CEAlex" },
        "layer-littoral-line": { fr: "Littoral dans les années 1960 (données CEAlex)", en: "Coastline in the 1960s (CEAlex Data)" },
        "layer-parcelles_region-fill": { fr: "Cadastre alexandrin (Survey of Egypt, 1933-1948 / CEAlex)", en: "Cadastral plan of Alexandria (Survey of Egypt, 1933-1948 / CEAlex)" },
        "layer-Plan de Tkaczow, 1993": { fr: "Plan de Tkaczow, 1993", en: "Plan by Tkaczow, 1993" },
        "layer-Plan d'Adriani, 1934": { fr: "Plan d'Adriani, 1934", en: "Plan by Adriani, 1934" },
        "layer-Restitution de Mahmoud bey el-Falaki, 1866": { fr: "Restitution de Mahmoud bey el-Falaki, 1866", en: "Reconstruction by Mahmud bey al-Falaki, 1866" },
        "layer-satellite-background": { fr: "Google Earth", en: "Google Earth" },
        "layer-osm-background": { fr: "OpenStreetMap", en: "OpenStreetMap" },

        // --- FILTER CATEGORIES ---
        "cat-vestiges": { fr: "Vestiges", en: "Archaeological remains" },
        "cat-decouvertes": { fr: "Découvertes", en: "Discoveries" },
        "cat-bibliographies": { fr: "Bibliographie", en: "Bibliography" },

        "lbl-date-start": { fr: "Date de début", en: "Start date" },
        "lbl-date-end": { fr: "Date de fin", en: "End date" },
        "lbl-apply": { fr: "Appliquer ce filtre", en: "Apply filter" },

        // --- CATEGORY NAMES ---
        "Vestiges": { fr: "Vestiges", en: "Archaeological remains" },
        "Découvertes": { fr: "Découvertes", en: "Discoveries" },
        "Bibliographie": { fr: "Bibliographie", en: "Bibliography" },
        "Caractérisation": { fr: "Caractérisation", en: "Type" },
        "Période": { fr: "Période", en: "Period" },
        "Datation": { fr: "Datation", en: "Dating" },

        // --- MISSING SUB-FILTER TITLES (FIXED HERE) ---
        "Inventeur": { fr: "Inventeur", en: "Discoverer" },
        "Date de la découverte": { fr: "Date de la découverte", en: "Date of discovery" },
        "Titre du document": { fr: "Titre du document", en: "Title" },
        "Auteur": { fr: "Auteur", en: "Author" },

        // --- SUB-FILTERS (Internal keys just in case) ---
        "sub-caracterisation": { fr: "Caractérisation", en: "Type" },
        "sub-periode": { fr: "Période", en: "Period" },
        "sub-datation": { fr: "Datation", en: "Dating" },
        "sub-nom": { fr: "Inventeur", en: "Discoverer" },
        "sub-date_decouverte": { fr: "Date de la découverte", en: "Date of discovery" },
        "sub-Title": { fr: "Titre du document", en: "Title" },
        "sub-Author": { fr: "Auteur", en: "Author" },

        // --- POPUP LABELS ---
        "pop-site": { fr: "Site", en: "Site" },
        "pop-tkaczow": { fr: "Tkaczow", en: "Tkaczow" },
        "pop-decouvertes": { fr: "Découvertes", en: "Discoveries" },
        "pop-no-discovery": { fr: "Aucune découverte enregistrée", en: "No discovery recorded" },
        "pop-vestiges": { fr: "Vestiges", en: "Archaeological remains" },
        "pop-biblio": { fr: "Bibliographie sélective", en: "Selected bibliography" },
        "pop-unknown": { fr: "Inconnu", en: "Unknown" },
        "pop-non-specifie": { fr: "Non spécifié", en: "Not specified" },
        "pop-consulted": { fr: "consulté le", en: "accessed on" },
        "pop-at-address": { fr: "à l'adresse", en: "at" },
        "pop-thesis": { fr: "thèse", en: "thesis" },
        "pop-error-title": { fr: "Erreur", en: "Error" },
        "pop-error-msg": { fr: "Impossible de charger les détails du site", en: "Could not load details for site" },

        // --- TOAST NOTIFICATIONS ---
        "toast-copied": { fr: "Copié :", en: "Copied :" },

        // --- PERIODS ---
        "Romain (100 ; 299)": { fr: "Romain (100 ; 299)", en: "Roman (100 ; 299)" },
        "Ottoman (1518 ; 1801)": { fr: "Ottoman (1518 ; 1801)", en: "Ottoman (1518 ; 1801)" },
        "Hellénistique/Haut-Empire (-331 ; 99)": { fr: "Hellénistique/Haut-Empire (-331 ; 99)", en: "Hellenistic/Early Roman (-331 ; 99)" },
        "indéterminé": { fr: "indéterminé", en: "Undetermined" },
        "Médiéval (641 ; 1517)": { fr: "Médiéval (641 ; 1517)", en: "Medieval (641 ; 1517)" },
        "Khédivial (1802 ; 1914)": { fr: "Khédivial (1802 ; 1914)", en: "Khedivial (1802 ; 1914)" },
        "Romain tardif (300 ; 699)": { fr: "Romain tardif (300 ; 699)", en: "Late Roman (300 ; 699)" },

        // --- DISCOVERY TYPES ---
        "fouilles": { fr: "fouilles", en: "excavations" },
        "observation": { fr: "observation", en: "observation" },
        "découverte fortuite": { fr: "découverte fortuite", en: "accidental discovery" },
        "mention": { fr: "mention", en: "mention" },

        // --- CHARACTERISATIONS ---
        "ruines": { fr: "ruines", en: "ruins" },
        "bain": { fr: "bain", en: "thermae" },
        "colonnade": { fr: "colonnade", en: "colonnade" },
        "réservoir": { fr: "réservoir", en: "reservoir" },
        "mur": { fr: "mur", en: "wall" },
        "remblais": { fr: "remblais", en: "embankment" },
        "thermes": { fr: "thermes", en: "roman thermae" },
        "colonnes": { fr: "colonnes", en: "columns" },
        "fortification": { fr: "fortification", en: "fortification" },
        "puits": { fr: "puits", en: "wells" },
        "obélisques": { fr: "obélisques", en: "obelisks" },
        "boutiques": { fr: "boutiques", en: "shops" },
        "pavements": { fr: "pavements", en: "pavements" },
        "nécropole": { fr: "nécropole", en: "necropolis" },
        "atelier monétaire": { fr: "atelier monétaire", en: "mint" },
        "artisanat": { fr: "artisanat", en: "artisanry" },
        "citerne": { fr: "citerne", en: "cistern" },
        "construction": { fr: "construction", en: "construction" },
        "bâtiment": { fr: "bâtiment", en: "building" },
        "habitat": { fr: "habitat", en: "settlement" },
        "murs de la ville": { fr: "murs de la ville", en: "city walls" },
        "tunnels": { fr: "tunnels", en: "tunnels" },
        "quais": { fr: "quais", en: "quays" },
        "tour": { fr: "tour", en: "tower" },
        "aucun vestige": { fr: "aucun vestige", en: "no remains" },
        "terrasses": { fr: "terrasses", en: "retaining walls" },
        "rue": { fr: "rue", en: "street" },
        "fondations": { fr: "fondations", en: "foundations" },
        "canalisation": { fr: "canalisation", en: "piping" },
        "crypte": { fr: "crypte", en: "crypt" },
        "mosaïque": { fr: "mosaïque", en: "mosaic" },
        "démolition": { fr: "démolition", en: "demolition" },
        "chapelle": { fr: "chapelle", en: "chapel" },
        "édifice funéraire": { fr: "édifice funéraire", en: "funerary building" },
        "temple": { fr: "temple", en: "temple" },
        "stade": { fr: "stade", en: "stadium" },
        "phare": { fr: "phare", en: "lighthouse" },
        "remploi": { fr: "remploi", en: "re-use" },
        "théâtre": { fr: "théâtre", en: "theatre" },
        "sanctuaire": { fr: "sanctuaire", en: "sanctuary" },
        "épave": { fr: "épave", en: "wreck" }
    },

    toggle() {
        this.currentLang = this.currentLang === 'fr' ? 'en' : 'fr';
        this.apply();
        return this.currentLang;
    },

    apply() {
        const lang = this.currentLang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.dictionary[key] && this.dictionary[key][lang]) {
                if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                    el.setAttribute('placeholder', this.dictionary[key][lang]);
                } else {
                    el.innerHTML = this.dictionary[key][lang];
                }
            }
        });
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    get(key) {
        return (this.dictionary[key] && this.dictionary[key][this.currentLang]) || key;
    }
};