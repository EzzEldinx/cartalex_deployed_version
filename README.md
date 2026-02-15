# CartAlex - WebSIG for Centre d'Études Alexandrines (CEAlex)

## 📖 Project Overview
**CartAlex** is an advanced Web Geographic Information System (WebSIG) engineered specifically for the **Centre d'Études Alexandrines (CEAlex)**. It serves as a central digital platform for visualizing, analyzing, and managing the rich archaeological and historical data of Alexandria, Egypt.

The system is designed to handle multi-layered spatial data, integrating high-density vector datasets (excavation sites) with historical raster maps (1866, 1934, 1993) in a seamless, interactive interface.

## ✨ Key Features

### 🗺️ Interactive Mapping
* **Engine:** Powered by **MapLibre GL JS** for high-performance vector rendering.
* **Hybrid Visualization:** Concurrent display of modern satellite imagery, OpenStreetMap, and historical georeferenced plans.
* **Vector Tiles:** Utilizes MVT (Mapbox Vector Tiles) for smooth rendering of thousands of archaeological points.

### 🔍 Advanced Filtering & Search
* **Dynamic Querying:** Filter excavation sites by:
    * **Period** (e.g., Roman, Hellenistic).
    * **Vestige Type** (e.g., Cistern, Mosaic).
    * **Discovery Details** (Date, Discoverer).
    * **Bibliographic References**.
* **Numeric Ranges:** Filter sites by specific year ranges.
* **Contextual Search:** Dropdown menus populated dynamically from the database.

### 📱 Responsive User Interface (v2.0)
The application features a completely separated logic for Desktop and Mobile to ensure maximum stability:
* **Desktop Mode:**
    * Collapsible side panels (`volet_haut`, `volet_gauche`).
    * Accordion-style filters with multi-select checkboxes.
* **Mobile Mode:**
    * **Touch-Optimized:** Bottom-sheet interface with swipe gestures.
    * **Grid Layout:** Custom CSS Grid implementation for optimal screen usage.
    * **Scoped Events:** Isolated event listeners to prevent conflicts with desktop logic.

### 🛠️ Tools
* **Measurement:** Interactive tool to measure distances and areas on the map.
* **Language Support:** Instant toggle between **French (FR)** and **English (EN)** without page reload.
* **Deep Linking:** URL state management allowing users to share links to specific sites (`/carte/:id`).

---

## 🏗️ System Architecture

The project adopts a containerized microservices architecture:

| Service | Technology | Description | Port |
| :--- | :--- | :--- | :--- |
| **Frontend/API** | Node.js (Express) | Serves the UI and acts as an API Gateway for DB queries. | `3000` |
| **Database** | PostgreSQL + PostGIS | Stores spatial data (EPSG:3857) and attributes. | `5432` |
| **Tile Server 1** | Tegola | Golang-based server optimized for high-speed Point geometry serving. | `8080` |
| **Tile Server 2** | pg_tileserv | Serves complex Polygons (Parcels, Littoral) directly from DB functions. | `7800` |

---

## 📂 Project Structure

```text
cartalex/
├── docker-compose.yml      # Orchestration of all services
├── tegola/                 # Configuration for Tegola Tile Server
│   └── tegola.toml
├── src/                    # Application Source Code
│   ├── css/
│   │   ├── map.css         # Core styles & Desktop layout
│   │   └── mobile.css      # Mobile-specific overrides & Bottom Sheet
│   ├── js/
│   │   ├── app.js          # Entry Point & Main Controller
│   │   ├── ui.js           # Desktop UI Logic (Panels, Accordions)
│   │   ├── mobile_ui.js    # Mobile UI Logic (Scoped Listeners, Grid)
│   │   ├── FilterCollection.js # Core Filtering Logic
│   │   ├── server_api.js   # API Communication Layer
│   │   └── translations.js # i18n Dictionary
│   ├── html/
│   │   └── index.html      # Main HTML Template
│   └── server/             # Express Backend
│       ├── server.js       # Server Entry Point
│       ├── routes.js       # API Routes (/getValues, /details)
│       └── db.js           # Database Connection Pool
└── .env                    # Environment Variables

🚀 Installation & Deployment

Prerequisites

• Docker (v20.10+)
• Docker Compose (v2.0+)

1. Clone the Repository

git clone [https://github.com/ezzeldinx/cartalex_deployed_version.git](https://github.com/ezzeldinx/cartalex_deployed_version.git)
cd cartalex_deployed_version

2. Environment Configuration
Create a .env file in the root directory based on .env.example. Ensure the database credentials match your PostGIS container settings.

Example .env:

# Application
PORT=3000
NODE_ENV=production

# Database
DB_HOST=cartalex_db
DB_PORT=5432
DB_NAME=cartalex_basileia_3_857
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Tile Servers
TEGOLA_PORT=8080
PG_TILESERV_PORT=7800


3. Build and Run (Docker)
This command will build the Node.js image, pull the database and tile server images, and start the network.

docker-compose up --build -d


4. Verification

• Web Interface: Visit http://localhost:3000
• Tegola UI: Visit http://localhost:8080
• pg_tileserv: Visit http://localhost:7800


🔧 Development Notes
Mobile vs Desktop Logic (Crucial)
To prevent UI conflicts, the application uses a Guard Clause pattern:

app.js: Checks for the existence of #mobile-unified-toggle. If present, it initializes mobile_ui.js.

mobile_ui.js: Contains a guard at the top of every function to ensure it DOES NOT run if the mobile DOM elements are missing.

ui.js: Contains a guard to ensure it DOES NOT run if the mobile toggle is present.

Adding New Layers
Database: Import the Shapefile/GeoJSON into PostGIS.

Tile Server:

If Point: Update tegola.toml to map the new table.

If Polygon: pg_tileserv will automatically detect the new table.

Frontend: Update src/js/app.js (and mobile_ui.js) to add the layer ID to the style definition and the layer list builder.


📜 Credits
Developed by: Ezz Eldin Ahmed
Organization: Centre d'Études Alexandrines (CEAlex)
License: Proprietary - All Rights Reserved