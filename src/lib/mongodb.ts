import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || 'cloud';

// In Desktop mode, we default to local MongoDB if not specified
const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017';
const URI = APP_MODE === 'desktop'
  ? (process.env.MONGODB_URI || DEFAULT_LOCAL_URI)
  : process.env.MONGODB_URI;

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'stockflow';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This is not user-facing code.
 */
let cached = (global as any).mongo;

if (!cached) {
  cached = (global as any).mongo = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<{ db: Db }> {
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
