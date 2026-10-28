import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

let client = null;
let mongod = null;
let currentURI = null;

// Multi-database instances
let primaryDb = null;
let secondaryDb = null;

export async function connectDB() {
  if (primaryDb) return { primaryDb, secondaryDb };

  let uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('[Database] Initializing embedded high-performance MongoDB instance...');
    try {
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log(`[Database] Embedded MongoDB instance started at: ${uri}`);
    } catch (err) {
      console.error('[Database] Embedded MongoDB initialization fallback:', err.message);
      uri = 'mongodb://127.0.0.1:27017';
    }
  }

  currentURI = uri;
  client = new MongoClient(uri);
  await client.connect();

  // Primary Database: Karunya Campus Transit
  const primaryName = process.env.DB_NAME || 'karunya_transit_db';
  primaryDb = client.db(primaryName);

  // Secondary Database: Central University Analytics & Audit Archive
  const secondaryName = process.env.SECONDARY_DB_NAME || 'karunya_transport_archive_db';
  secondaryDb = client.db(secondaryName);

  console.log(`[Database] Primary Database Connected: ${primaryName}`);
  console.log(`[Database] Secondary Database Connected: ${secondaryName}`);

  return { primaryDb, secondaryDb };
}

export function getDB() {
  if (!primaryDb) {
    throw new Error('Database not initialized! Call connectDB() first.');
  }
  return primaryDb;
}

export function getSecondaryDB() {
  if (!secondaryDb) {
    throw new Error('Secondary Database not initialized! Call connectDB() first.');
  }
  return secondaryDb;
}

export function getMongoClient() {
  return client;
}

export function getCurrentMongoURI() {
  return currentURI;
}

export async function closeDB() {
  if (client) {
    await client.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}
