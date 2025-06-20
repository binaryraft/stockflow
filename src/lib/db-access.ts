
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
  console.log(`${routeNamePrefix} Attempting to read database from: ${DB_PATH}`);
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const jsonData = JSON.parse(data) as Database;
    console.log(`${routeNamePrefix} Successfully read and parsed db.json. Companies found: ${jsonData.companies?.length || 0}, Users: ${jsonData.users?.length || 0}`);
    return {
      companies: jsonData.companies || [],
      users: jsonData.users || [],
      products: jsonData.products || [],
      bills: jsonData.bills || [],
      categories: jsonData.categories || [],
      customers: jsonData.customers || [],
      staffs: jsonData.staffs || [], // Maintained for potential legacy data or structure consistency
      stores: jsonData.stores || [],
      messagesByStore: jsonData.messagesByStore || {},
    };
  } catch (error: any) {
    console.error(`${routeNamePrefix} Error reading DB from ${DB_PATH}. Error: ${error.message}, Code: ${error.code}`);
    if (error.code === 'ENOENT') {
      console.warn(`${routeNamePrefix} db.json not found at ${DB_PATH}. Attempting to create a new default database file.`);
      const defaultDB: Database = {
        companies: [], users: [], products: [], bills: [], categories: [], customers: [], staffs: [], stores: [], messagesByStore: {},
      };
      try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.writeFile(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
        console.log(`${routeNamePrefix} Successfully created a new empty db.json at ${DB_PATH}.`);
        return defaultDB;
      } catch (writeError: any) {
        console.error(`${routeNamePrefix} FATAL: Could not create db.json after read failure (ENOENT). Error: ${writeError.message}`);
        throw new Error(`Could not initialize database file at ${DB_PATH}. Original write error: ${writeError.message}`);
      }
    }
    console.error(`${routeNamePrefix} CRITICAL: db.json at ${DB_PATH} appears to be unreadable or malformed. Returning default empty structure to prevent app crash, but data integrity is compromised. Error: ${error.message}`);
    return {
      companies: [], users: [], products: [], bills: [], categories: [], customers: [], staffs: [], stores: [], messagesByStore: {},
    };
  }
}

export async function writeDB(data: Database): Promise<void> {
  console.log(`${routeNamePrefix} Attempting to write to database at: ${DB_PATH}. Companies: ${data.companies?.length || 0}, Users: ${data.users?.length || 0}`);
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${routeNamePrefix} Successfully wrote to db.json.`);
  } catch (error: any) {
    console.error(`${routeNamePrefix} FATAL: Error writing DB to ${DB_PATH}. Error: ${error.message}`);
    throw new Error(`Could not save data to the database at ${DB_PATH}. Error: ${error.message}. Please check file system permissions.`);
  }
}
