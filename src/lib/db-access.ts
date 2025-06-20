
import fs from 'fs/promises';
import path from 'path';
import type { Product, Bill, Category, User, Store, Company, ChatMessage, Customer } from '@/types';

export const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface Database {
  companies: Company[];
  users: User[];
  products: Product[];
  bills: Bill[];
  categories: Category[];
  customers: Customer[];
  staffs: User[]; // Kept for data structure consistency, but logic should primarily use users with role 'employee'
  stores: Store[];
  messagesByStore?: Record<string, ChatMessage[]>;
}

const routeNamePrefix = "[DB_ACCESS]";

export async function readDB(): Promise<Database> {
  console.log(`${routeNamePrefix} Reading database from: ${DB_PATH}`);
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const jsonData = JSON.parse(data) as Database;
    console.log(`${routeNamePrefix} Successfully read and parsed db.json.`);
    // Ensure all expected top-level arrays exist to prevent runtime errors if db.json is malformed or incomplete
    return {
      companies: jsonData.companies || [],
      users: jsonData.users || [],
      products: jsonData.products || [],
      bills: jsonData.bills || [],
      categories: jsonData.categories || [],
      customers: jsonData.customers || [],
      staffs: jsonData.staffs || [],
      stores: jsonData.stores || [],
      messagesByStore: jsonData.messagesByStore || {},
    };
  } catch (error: any) {
    console.error(`${routeNamePrefix} Error reading DB from ${DB_PATH}. Error: ${error.message}`);
    if (error.code === 'ENOENT') {
      console.warn(`${routeNamePrefix} db.json not found. Returning default empty structure and attempting to create it.`);
      const defaultDB: Database = {
        companies: [], users: [], products: [], bills: [], categories: [], customers: [], staffs: [], stores: [], messagesByStore: {},
      };
      try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
        console.log(`${routeNamePrefix} Successfully created a new empty db.json.`);
        return defaultDB;
      } catch (writeError: any) {
        console.error(`${routeNamePrefix} FATAL: Could not create db.json after read failure. Error: ${writeError.message}`);
        // In a real production scenario, you might want to throw a more specific error or handle this critical failure differently.
        // For this context, re-throwing helps surface the problem.
        throw new Error(`Could not initialize database file at ${DB_PATH}. Please check file system permissions and ensure the 'data' directory can be created/written to. Original write error: ${writeError.message}`);
      }
    }
    // For other errors (e.g., JSON parse error), log critically.
    console.error(`${routeNamePrefix} CRITICAL: db.json appears to be malformed or unreadable. Error: ${error.message}. Returning default empty structure to prevent app crash, but data integrity is compromised.`);
    return {
      companies: [], users: [], products: [], bills: [], categories: [], customers: [], staffs: [], stores: [], messagesByStore: {},
    };
  }
}

export async function writeDB(data: Database): Promise<void> {
  console.log(`${routeNamePrefix} Attempting to write to database at: ${DB_PATH}`);
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    // Write data to db.json
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${routeNamePrefix} Successfully wrote to db.json.`);
  } catch (error: any) {
    console.error(`${routeNamePrefix} FATAL: Error writing DB to ${DB_PATH}. Error: ${error.message}`);
    // In a production environment, this error should be handled critically.
    // For example, by alerting administrators or attempting a retry/backup strategy.
    throw new Error(`Could not save data to the database at ${DB_PATH}. Error: ${error.message}. Please check file system permissions.`);
  }
}
