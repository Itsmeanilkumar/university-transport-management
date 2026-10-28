import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';
import apiRouter from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'UniTransit - Karunya University Transport Portal',
    timestamp: new Date().toISOString(),
    primaryDatabase: process.env.DB_NAME || 'karunya_transit_db',
    secondaryDatabase: process.env.SECONDARY_DB_NAME || 'karunya_transport_archive_db',
    endpoints: {
      primary: '/api/*',
      secondaryArchive: '/api/archive/*',
      dynamicSwitcher: '/api/database/connect'
    }
  });
});

// Serve frontend client in production / integrated mode
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath, {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
}));

app.use((req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(publicPath, 'index.html'));
});

async function startServer() {
  try {
    console.log('[UniTransit] Initializing Server & MongoDB Connection...');
    await connectDB();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`================================================================`);
      console.log(` UniTransit Server is running on http://localhost:${PORT}`);
      console.log(` Complete Academic Transport Management Portal Active`);
      console.log(`================================================================`);
    });
  } catch (err) {
    console.error('[UniTransit] Critical Server Startup Failure:', err);
    process.exit(1);
  }
}

startServer();
