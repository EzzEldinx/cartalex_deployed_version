# Cartalex - Archaeological Mapping Platform

## Project Overview

Cartalex is a comprehensive web-based archaeological mapping platform developed for the **Centre d'Études Alexandrines (CEALEX)**. The platform provides an interactive digital cartography system for managing and visualizing archaeological excavation sites, historical maps, and related bibliographic data from Alexandria and its surrounding regions.

The system serves as a digital cartographic library containing over 2,000 maps and plans dating from the 16th to the 21st century, including perspective views, marine charts, topographical plans, cadastral maps, geological maps, tourist maps, insurance plans, orthophotoplans, and satellite imagery.

## Features

- **Interactive Web Map**: Real-time visualization of archaeological excavation sites using MapLibre GL.
- **Historical Map Overlay**: Integration of historical maps including Adriani (1934), Tkaczow (1993), and Mahmoud bey el-Falaki (1866) plans.
- **Dedicated Bibliography Interface**: A fully searchable and filterable bibliography page integrated directly with the Zotero API, featuring APA citation formatting.
- **Advanced Filtering System**: Dynamic filtering by archaeological periods, site characteristics, and discovery dates.
- **Site Details & Popups**: Comprehensive information display including excavation details, archaeological vestiges, and bibliographic references.
- **RESTful API**: Complete backend API for data access and management.
- **Database Integration**: PostgreSQL/PostGIS spatial database for geospatial data storage.
- **Tile Services**: Multiple tile serving solutions (Tegola, pg_tileserv) for optimized map rendering.
- **Responsive Design**: Mobile-friendly interface with adaptive layouts.
- **API Documentation**: Swagger/OpenAPI documentation for developer integration.

### Fly‑to animation and deep‑linking (Google‑Earth style)

- **Click to fly and open**: Clicking any site point smoothly flies the map to that point (zoom≈16) and opens its popup.
- **Shareable deep link**: The URL updates to include `/carte/FID` on click. Opening that link flies to the same point and opens its popup automatically.
- **Back/forward supported**: Browser navigation restores or clears the focused point/popup.

**How to use:**
- Click a point to zoom to it and open its popup.
- Copy the URL (now containing `/carte/123`) and share it.
- Opening the link will restore the same focused point and popup.

**Implementation overview:**
The app listens for clicks on `sites_fouilles-points`, animates with `map.flyTo`, then opens the popup when the move ends. The URL is synchronized via the History API. On load (and on `popstate`), the app reads the ID from the URL and performs the same animation and popup logic.

## Project Structure

```text
CARTALEX
|-- db-init/                     # Database initialization scripts
|   |-- 01-cartalex.sql          # Initial database dump
|-- src/                         # Source code directory  
|   |-- server/                  # Backend server implementation
|   |   |-- server.js            # Main Express server configuration
|   |   |-- routes.js            # API route definitions
|   |   |-- middleware.js        # Custom middleware and error handlers
|   |   |-- db.js                # Database connection and queries
|   |-- js/                      # Frontend JavaScript modules
|   |   |-- app.js               # Main application controller
|   |   |-- FilterCollection.js  # Filter management system
|   |   |-- LayerCollection.js   # Map layer management
|   |   |-- ui.js                # User interface components
|   |   |-- server_config.js     # API configuration
|   |-- html/                    # HTML templates
|   |   |-- index.html           # Main landing page
|   |   |-- map.html             # Interactive map page
|   |   |-- zotero.html          # Bibliography page
|   |-- css/                     # Stylesheets
|   |   |-- map.css              # Map-specific styles
|   |-- img/                     # Static images and assets
|-- public/                      # Public assets (32,000+ map images)
|-- tegola/                      # Tegola tile server configuration
|   |-- tegola.toml              # Tile server settings
|-- docker-compose.yml           # Multi-service Docker orchestration
|-- Dockerfile                   # Application container definition
|-- swagger.yaml                 # API documentation specification
|-- package.json                 # Node.js dependencies and scripts
|-- webpack.config.js            # Frontend build configuration
|-- webpack.server.config.js     # Server build configuration


## Key Files Explanation 

docker-compose.yml: Orchestrates four services: PostgreSQL database, Tegola tile server, pg_tileserv, and the main application.

src/server/server.js: Express.js server with CORS, compression, and static file serving.

src/js/app.js: Main frontend application managing map interactions and filters.

tegola/tegola.toml: Configuration for vector tile generation from PostGIS data.

## Technologies Used

-Backend
Node.js 18: Runtime environment.
Express.js: Web application framework.
PostgreSQL 13: Primary database with PostGIS spatial extensions.
pg & pg-promise: PostgreSQL database drivers.
Zotero Web API: Integration for bibliography management.
CORS: Cross-origin resource sharing.
Morgan: HTTP request logging.
Compression: Response compression middleware.

-Frontend
MapLibre GL JS: WebGL-based mapping library.
Webpack: Module bundler and build tool.
Babel: JavaScript transpiler.
CSS3: Modern styling with responsive design.
Mapping & Tiles
Tegola v0.21.2: Vector tile server.
pg_tileserv: PostGIS-native tile server.
PostGIS: Spatial database extensions.

-Development & Deployment
Docker & Docker Compose: Containerization and orchestration.
Swagger/OpenAPI: API documentation.
EJS: Template engine.
Nodemon: Development server with hot reloading.

## Installation & Setup
Prerequisites
Docker and Docker Compose
Node.js 18+ (for local development)
Git
Quick Start with Docker
Clone the repository

Bash

git clone [https://github.com/EzzEldinx/Cartalex-tiles](https://github.com/EzzEldinx/Cartalex-tiles)
cd CARTALEX
Start all services

Bash

docker-compose up -d
Wait for services to initialize

Bash

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
Access the application

Main application: http://localhost:3000

Interactive map: http://localhost:3000/carte

Bibliography: http://localhost:3000/bibliographie

API documentation: http://localhost:3000/api-docs

Vector tiles: http://localhost:8080

Raster tiles: http://localhost:7800

Local Development Setup
Install dependencies

Bash

npm install
Start the database

Bash

docker-compose up -d db
Build and run the application

Bash

npm run build
npm start
Environment Configuration
Create a .env file in the project root:

Code snippet

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
DB_NAME=cartalex
CORS_ORIGIN=http://localhost:3000
PORT=3000
How to Run
Development Mode
Bash

# Start all services
docker-compose up -d

# For development with hot reloading
npm run build
npm start

# Monitor logs
docker-compose logs -f
Production Mode
Bash

# Build optimized containers
# (Ensure you have a docker-compose.prod.yml or configure production env vars)
docker-compose -f docker-compose.prod.yml up -d

# Or build manually
npm run build
NODE_ENV=production npm start
Individual Services
Bash

# Database only
docker-compose up -d db

# Tile servers only
docker-compose up -d tegola pgtileserv

# Application only (requires database)
docker-compose up -d app
How to Add/Contribute
Adding New Features
Frontend Development

Bash

# Add new JavaScript modules in src/js/
# Update webpack configuration if needed
npm run build
Backend API Development

Bash

# Add routes in src/server/routes.js
# Update swagger.yaml for API documentation
# Add database queries in src/server/db.js
Database Schema Changes

Bash

# Create migration scripts
# Test with Docker database
Code Contribution Guidelines
Fork the repository and create a feature branch.

Follow the existing code structure and naming conventions.

Update documentation for any API changes.

Test thoroughly with the Docker environment.

Submit a pull request with a clear description.

Adding New Map Layers
Update Tegola configuration (tegola/tegola.toml).

Add layer definitions in frontend (src/js/LayerCollection.js).

Configure filters if needed (src/js/filters_config.js).

Update API endpoints for layer data.

Testing
Manual Testing
Bash

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/getValues/vestiges?field=periode

# Test tile services
curl http://localhost:8080/maps/cartalex/1/0/0.pbf
curl http://localhost:7800/index.html
Database Testing
Bash

# Connect to database
docker exec -it cartalex_db psql -U postgres -d cartalex

# Run test queries
SELECT COUNT(*) FROM sites_fouilles;
SELECT * FROM bibliography_zotero LIMIT 5;

# ⚠️ CRITICAL: Verify FID mapping integrity
# Checks that sites are correctly linked to bibliographies via the references table
SELECT sf.fid, sf.num_tkaczow, COUNT(rb.id_biblio) as ref_count 
FROM sites_fouilles sf 
LEFT JOIN "references_biblio" rb ON sf.fid = rb.fid_site 
GROUP BY sf.fid, sf.num_tkaczow 
ORDER BY sf.fid;
Frontend Testing
Bash

# Test build process
npm run build

# Verify static assets
ls -la dist/
Deployment
Docker Production Deployment
Configure production environment

Bash

# Update docker-compose.yml with production settings
# Set environment variables
# Configure reverse proxy (nginx)
Deploy with Docker Compose

Bash

docker-compose -f docker-compose.prod.yml up -d
Set up SSL/TLS

Bash

# Configure nginx with Let's Encrypt
# Update CORS settings for production domain
Traditional Server Deployment
Install dependencies

Bash

npm install --production
Build the application

Bash

npm run build
Set up PostgreSQL with PostGIS

Bash

# Install PostgreSQL 13+ with PostGIS
# Import database schema and data
# Configure connection settings
Configure reverse proxy

Bash

# Set up nginx or Apache
# Configure SSL certificates
# Set up process management (PM2)


License
This project is licensed under the CE-Alex - see the package.json file for details.

Contact & Support
Centre d'Études Alexandrines (CEALEX): https://www.cealex.org/

Email: topo@cea.com.eg

Acknowledgments
CEALEX Team: For providing the archaeological data and domain expertise Kamal Mohsen - Mustafa Morsi - Ezz ElDin Ahmed --- Last updated: 2025-12