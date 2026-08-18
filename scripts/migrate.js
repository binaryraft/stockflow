const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'db.vhqeqwqdaxdhmomghbwd.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'kB8)&E#$2C:Tx$$',
  ssl: { rejectUnauthorized: false }
};

async function migrate() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    const sql = fs.readFileSync(
      path.join(__dirname, 'supabase', 'migrations', '001_initial_schema.sql'),
      'utf8'
    );

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        console.log(`Statement ${i + 1}/${statements.length} OK`);
      } catch (err) {
        // Ignore "already exists" errors
        if (err.code === '42710' || err.code === '42P07' || err.code === '42P16') {
          console.log(`Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          console.error(`Statement ${i + 1}/${statements.length} FAILED:`, err.message);
        }
      }
    }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
