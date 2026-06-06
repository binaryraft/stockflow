import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || 'cloud';

// In Desktop mode, we default to local MongoDB if not specified
const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017';
const URI = APP_MODE === 'desktop'
  ? (process.env.MONGODB_URI || DEFAULT_LOCAL_URI)
  : process.env.MONGODB_URI;

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'stockflow';

/**
 * For desktop/local mode we provide a small filesystem-backed shim
 * so API routes can run without a MongoDB server. Data is stored in
 * `data/db.json` at the repo root and persisted across runs.
 */
const DB_JSON_PATH = path.join(process.cwd(), 'data', 'db.json');

function ensureDbFile() {
  const dir = path.dirname(DB_JSON_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_JSON_PATH)) fs.writeFileSync(DB_JSON_PATH, JSON.stringify({}), 'utf8');
}

function readDb(): any {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_JSON_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeDb(dbObj: any) {
  ensureDbFile();
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(dbObj, null, 2), 'utf8');
}

function matchFilter(obj: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.keys(filter).every((k) => {
    const v = (filter as any)[k];
    if (typeof v === 'object' && v !== null) {
      // support $in
      if ('$in' in v) return v.$in.includes(obj[k]);
      return false;
    }
    return obj[k] === v;
  });
}

/**
 * Lightweight collection shim implementing the minimal methods used
 * by the app: find, findOne, insertOne, insertMany, updateOne, deleteOne, toArray.
 */
function collectionShim(name: string) {
  return {
    async find(filter = {}) {
      const dbObj = readDb();
      const arr = Array.isArray(dbObj[name]) ? dbObj[name] : [];
      return {
        toArray: async () => arr.filter((item: any) => matchFilter(item, filter)),
      };
    },
    async findOne(filter = {}) {
      const dbObj = readDb();
      const arr = Array.isArray(dbObj[name]) ? dbObj[name] : [];
      return arr.find((item: any) => matchFilter(item, filter)) || null;
    },
    async insertOne(doc: any) {
      const dbObj = readDb();
      if (!Array.isArray(dbObj[name])) dbObj[name] = [];
      const toInsert = { ...doc };
      if (!toInsert.id && !toInsert._id) toInsert.id = `${name}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      dbObj[name].push(toInsert);
      writeDb(dbObj);
      return { insertedId: toInsert.id, ops: [toInsert] };
    },
    async insertMany(docs: any[]) {
      const dbObj = readDb();
      if (!Array.isArray(dbObj[name])) dbObj[name] = [];
      const inserted = docs.map((doc) => {
        const toInsert = { ...doc };
        if (!toInsert.id && !toInsert._id) toInsert.id = `${name}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        dbObj[name].push(toInsert);
        return toInsert;
      });
      writeDb(dbObj);
      return { insertedCount: inserted.length, insertedIds: inserted.map(i=>i.id) };
    },
    async updateOne(filter: any, update: any, options: any = {}) {
      const dbObj = readDb();
      if (!Array.isArray(dbObj[name])) dbObj[name] = [];
      const idx = dbObj[name].findIndex((item: any) => matchFilter(item, filter));
      if (idx === -1) {
        if (options && options.upsert) {
          const newDoc = { ...(update.$set || {}), ...filter };
          if (!newDoc.id && !newDoc._id) newDoc.id = `${name}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          dbObj[name].push(newDoc);
          writeDb(dbObj);
          return { upsertedId: newDoc.id, matchedCount: 0, modifiedCount: 0 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }
      // apply $set
      if (update.$set) {
        dbObj[name][idx] = { ...dbObj[name][idx], ...update.$set };
      } else {
        dbObj[name][idx] = { ...dbObj[name][idx], ...update };
      }
      writeDb(dbObj);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async deleteOne(filter: any) {
      const dbObj = readDb();
      if (!Array.isArray(dbObj[name])) dbObj[name] = [];
      const idx = dbObj[name].findIndex((item: any) => matchFilter(item, filter));
      if (idx === -1) return { deletedCount: 0 };
      dbObj[name].splice(idx, 1);
      writeDb(dbObj);
      return { deletedCount: 1 };
    },
  };
}

/**
 * When in desktop mode, return a shim with `db.collection(name)` compatible
 * with the parts of the codebase that expect Mongo `Db`.
 */
async function connectToDatabaseDesktop(): Promise<{ db: any }> {
  return {
    db: {
      collection: (name: string) => collectionShim(name),
    },
  };
}

async function connectToDatabaseCloud(): Promise<{ db: Db }> {
  /**
   * Production/cloud mode — use real MongoDB client as before.
   */
  let cached = (global as any).mongo;

  if (!cached) {
    cached = (global as any).mongo = { conn: null, promise: null };
  }

  if (!URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = MongoClient.connect(URI!).then((client) => {
      return {
        db: client.db(MONGODB_DB_NAME),
      };
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Export the appropriate implementation
export const connectToDatabase = APP_MODE === 'desktop' ? connectToDatabaseDesktop : connectToDatabaseCloud;
