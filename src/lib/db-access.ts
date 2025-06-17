
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
  // Removed userProfile from top-level DB, it's part of User or handled client-side
  messagesByStore?: Record<string, ChatMessage[]>; // Optional, might be part of store or separate
}

export async function readDB(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const jsonData = JSON.parse(data) as Database;
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
  } catch (error) {
    console.error("Error reading DB, returning default structure:", error);
    // If the file doesn't exist or is invalid, return a default structure
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
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing DB:", error);
    throw new Error("Could not save data to the database.");
  }
}
