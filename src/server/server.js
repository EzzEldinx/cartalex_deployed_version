import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import compression from 'compression';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

import router from './routes.js';
import { errorHandler } from './middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root_dir = path.join(__dirname, '..', '..');
const dist_dir = path.join(root_dir, 'dist');
const public_dir = path.join(root_dir, 'public');

const app = express();

app.use(morgan('dev'));
app.use(compression());
app.use(express.json());

app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

// Set views to dist because Webpack puts the processed HTML there
app.set('views', dist_dir);

const allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Serve static files from dist (where the build lives)
app.use(express.static(dist_dir));
// Serve static assets from public
app.use(express.static(public_dir));

app.use('/', router);

const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App listening to ${port}....`);
    console.log(`Targeting dist directory: ${dist_dir}`);
});