
import fs from 'fs/promises';
import path from 'path';
import type { Product, Bill, Category, User, Store, Company, ChatMessage } from '@/types';

export const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface Database {
  companies: Company[];
  users: User[];
  products: Product[];
  bills: Bill[];
  categories: Category[];
  staffs: User[]; // Note: 'staffs' might be merged with 'users' if structure is consolidated
  stores: Store[];
  messagesByStore?: Record<string, ChatMessage[]>;
}

export async function readDB(): Promise<Database> {
  console.log(`[DB_ACCESS] Reading database from: ${DB_PATH}`);
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const jsonData = JSON.parse(data) as Database;
    console.log("[DB_ACCESS] Successfully read and parsed db.json.");
    // Ensure all expected top-level arrays exist to prevent runtime errors if db.json is malformed or incomplete
    return {
      companies: jsonData.companies || [],
      users: jsonData.users || [],
      products: jsonData.products || [],
      bills: jsonData.bills || [],
      categories: jsonData.categories || [],
      staffs: jsonData.staffs || [], // Kept for now, but consider consolidating with 'users'
      stores: jsonData.stores || [],
      messagesByStore: jsonData.messagesByStore || {},
    };
  } catch (error: any) {
    console.error(`[DB_ACCESS] Error reading DB from ${DB_PATH}. Error: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.warn("[DB_ACCESS] db.json not found. Returning default empty structure and attempting to create it.");
      const defaultDB: Database = {
        companies: [], users: [], products: [], bills: [], categories: [], staffs: [], stores: [], messagesByStore: {},
      };
      try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
        console.log("[DB_ACCESS] Successfully created a new empty db.json.");
        return defaultDB;
      } catch (writeError: any) {
        console.error(`[DB_ACCESS] FATAL: Could not create db.json after read failure. Error: ${writeError.message}`);
        throw new Error(`Could not initialize database file at ${DB_PATH}. Please check file system permissions and ensure the 'data' directory can be created/written to.`);
      }
    }
    // For other errors (e.g., JSON parse error), log critically and return a default structure to prevent app crash.
    console.error("[DB_ACCESS] Returning default empty structure due to a read error (e.g., JSON malformed). Check db.json integrity.");
    return {
      companies: [], users: [], products: [], bills: [], categories: [], staffs: [], stores: [], messagesByStore: {},
    };
  }
}

export async function writeDB(data: Database): Promise<void> {
  console.log(`[DB_ACCESS] Attempting to write to database at: ${DB_PATH}`);
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log("[DB_ACCESS] Successfully wrote to db.json.");
  } catch (error: any) {
    console.error(`[DB_ACCESS] Error writing DB to ${DB_PATH}. Error: ${error.message}`);
    throw new Error(`Could not save data to the database at ${DB_PATH}. Error: ${error.message}. Please check file system permissions.`);
  }
}
