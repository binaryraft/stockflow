
import fs from 'fs/promises';
import path from 'path';
import type { Product, Bill, Category, User, Store, Company, UserProfile, ChatMessage } from '@/types';

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
  console.log(`[DB_ACCESS] Attempting to read database from: ${DB_PATH}`);
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const jsonData = JSON.parse(data) as Database;
    console.log("[DB_ACCESS] Successfully read and parsed db.json.");
    // Ensure all expected top-level arrays exist
    return {
      companies: jsonData.companies || [],
      users: jsonData.users || [],
      products: jsonData.products || [],
      bills: jsonData.bills || [],
      categories: jsonData.categories || [],
      staffs: jsonData.staffs || [],
      stores: jsonData.stores || [],
      messagesByStore: jsonData.messagesByStore || {},
    };
  } catch (error: any) {
    console.error(`[DB_ACCESS] Error reading DB from ${DB_PATH}. Error: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.log("[DB_ACCESS] db.json not found. Returning default empty structure and attempting to create.");
      const defaultDB: Database = {
        companies: [], users: [], products: [], bills: [], categories: [], staffs: [], stores: [], messagesByStore: {},
      };
      try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true }); // Ensure 'data' directory exists
        await fs.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
        console.log("[DB_ACCESS] Successfully created a new empty db.json.");
        return defaultDB;
      } catch (writeError: any) {
        console.error(`[DB_ACCESS] FATAL: Could not create db.json after read failure. Error: ${writeError.message}`);
        // If we can't even create it, throw to prevent app from running in a broken state.
        throw new Error(`Could not initialize database file at ${DB_PATH}. Please check file system permissions and ensure the 'data' directory can be created/written to.`);
      }
    }
    // For other errors (e.g., JSON parse error), return a default structure but log critically
    console.error("[DB_ACCESS] Returning default empty structure due to read error (excluding ENOENT).");
    return {
      companies: [],
      users: [],
      products: [],
      bills: [],
      categories: [],
      staffs: [],
      stores: [],
      messagesByStore: {},
    };
  }
}

export async function writeDB(data: Database): Promise<void> {
  console.log(`[DB_ACCESS] Attempting to write to database at: ${DB_PATH}`);
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true }); // Ensure 'data' directory exists
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log("[DB_ACCESS] Successfully wrote to db.json.");
  } catch (error: any) {
    console.error(`[DB_ACCESS] Error writing DB to ${DB_PATH}. Error: ${error.message}`);
    // Depending on severity, you might want to re-throw or handle more gracefully
    // For a file-based DB, a write failure is critical for data persistence.
    throw new Error(`Could not save data to the database at ${DB_PATH}. Error: ${error.message}. Please check file system permissions.`);
  }
}

