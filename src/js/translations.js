/**
 * Translation Manager
 * Handles switching between French and English based on list.docx
 */
export const translations = {
    currentLang: 'fr', // Default language

    dictionary: {
        // --- TOOLS & BUTTONS ---
        "tool-measure": { fr: "Mesure", en: "Measure" },
        "tool-measure-panel": { fr: "Mesure de distance", en: "Distance measurement" },
        "tool-measure-total": { fr: "Distance totale :", en: "Total Distance :" },
        "tool-measure-segments": { fr: "Segments :", en: "Segments :" },
        "tool-measure-hint": { fr: "Cliquez sur la carte pour ajouter des points", en: "Click on the map to add points" },
        "tool-measure-points": { fr: "Points de mesure :", en: "Measurement Points :" },
        
        "tool-measure-undo": { fr: "Annuler le dernier", en: "Undo Last" },
        "tool-measure-clear": { fr: "Tout effacer", en: "Clear All" },
        "tool-measure-export": { fr: "Exporter GeoJSON", en: "Export GeoJSON" },
        
        "tool-measure-instr": { fr: "Instructions :", en: "Instructions :" },
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

        // --- FILTER CATEGORIES ---
        "cat-vestiges": { fr: "Vestiges", en: "Archaeological remains" },
        "cat-decouvertes": { fr: "Découvertes", en: "Discoveries" },
        "cat-bibliographies": { fr: "Bibliographies", en: "Bibliography" },

        // --- SUB-FILTERS (Broad Variations to catch mismatches) ---
        "sub-caracterisation": { fr: "Caractérisation", en: "Type" },
        "sub-periode": { fr: "Période", en: "Period" },
        
        // DATATION VARIATIONS (Added Plural/English)
        "sub-datation": { fr: "Datation", en: "Dating" },
        "sub-Datation": { fr: "Datation", en: "Dating" },
        "sub-datations": { fr: "Datation", en: "Dating" }, // Plural
        "sub-dating": { fr: "Datation", en: "Dating" },
        "sub-date_debut": { fr: "Date de début", en: "Start date" },
        
        "sub-nom": { fr: "Inventeur", en: "Discoverer" },
        "sub-date_decouverte": { fr: "Date de la découverte", en: "Date of discovery" },
        
        // TITLE VARIATIONS (Added Capitalized English)
        "sub-Titre": { fr: "Titre du document", en: "Title" },
        "sub-titre": { fr: "Titre du document", en: "Title" },
        "sub-title": { fr: "Titre du document", en: "Title" },
        "sub-Title": { fr: "Titre du document", en: "Title" }, // <--- Likely culprit
        
        // AUTHOR VARIATIONS (Added Capitalized English)
        "sub-Auteur": { fr: "Auteur", en: "Author" },
        "sub-auteur": { fr: "Auteur", en: "Author" },
        "sub-author": { fr: "Auteur", en: "Author" },
        "sub-Author": { fr: "Auteur", en: "Author" }, // <--- Likely culprit

        // --- INPUT LABELS ---
        "lbl-date-start": { fr: "Date de début :", en: "Start date :" },
        "lbl-date-end": { fr: "Date de fin :", en: "End date :" },
        "lbl-apply": { fr: "Appliquer ce filtre :", en: "Apply this filter :" },

        // --- LAYER NAMES ---
        "layer-sites_fouilles-points": { fr: "Découvertes archéologiques", en: "Archaeological discoveries" },
        "layer-emprises-fill": { fr: "Emprises des sites de fouilles CEAlex", en: "Footprint of excavations conducted by the CEAlex" },
        "layer-littoral-line": { fr: "Littoral dans les années 1960 (données CEAlex)", en: "Coastline in the 1960s (CEAlex Data)" },
        "layer-parcelles_region-fill": { fr: "Cadastre alexandrin (Survey of Egypt, 1933-1948 / CEAlex)", en: "Cadastral plan of Alexandria (Survey of Egypt, 1933-1948 / CEAlex)" },
        "layer-Plan de Tkaczow, 1993": { fr: "Plan de Tkaczow, 1993", en: "Plan by Tkaczow, 1993" },
        "layer-Plan d'Adriani, 1934": { fr: "Plan d'Adriani, 1934", en: "Plan by Adriani, 1934" },
        "layer-Restitution de Mahmoud bey el-Falaki, 1866": { fr: "Restitution de Mahmoud bey el-Falaki, 1866", en: "Reconstruction by Mahmud bey al-Falaki, 1866" },
        "layer-satellite-background": { fr: "Google Earth", en: "Google Earth" },
        "layer-osm-background": { fr: "OpenStreetMap", en: "OpenStreetMap" },

        // --- POPUP LABELS ---
        "pop-site": { fr: "Site", en: "Site" },
        "pop-tkaczow": { fr: "Tkaczow", en: "Tkaczow" },
        "pop-decouvertes": { fr: "Découvertes :", en: "Discoveries :" },
        "pop-no-discovery": { fr: "Aucune découverte enregistrée", en: "No discovery recorded" },
        "pop-vestiges": { fr: "Vestiges :", en: "Archaeological remains :" },
        "pop-biblio": { fr: "Bibliographie sélective :", en: "Selected bibliography :" },
        "pop-unknown": { fr: "Inconnu", en: "Unknown" },
        "pop-non-specifie": { fr: "Non spécifié", en: "Not specified" },
        "pop-consulted": { fr: "consulté le", en: "accessed on" },
        "pop-at-address": { fr: "à l'adresse", en: "at" },
        "pop-thesis": { fr: "thèse", en: "thesis" },
        "pop-error-title": { fr: "Erreur", en: "Error" },
        "pop-error-msg": { fr: "Impossible de charger les détails du site", en: "Could not load details for site" },

        // --- TOAST NOTIFICATIONS ---
        "toast-copied": { fr: "Copié :", en: "Copied :" }
    },

    toggle() {
        this.currentLang = this.currentLang === 'fr' ? 'en' : 'fr';
        this.apply();
        return this.currentLang;
    },

    apply() {
        const lang = this.currentLang;
        // 1. Text Content
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
        
        // 2. Titles/Tooltips
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (this.dictionary[key] && this.dictionary[key][lang]) {
                el.setAttribute('title', this.dictionary[key][lang]);
            }
        });

        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    get(key) {
        return (this.dictionary[key] && this.dictionary[key][this.currentLang]) || key;
    }
};