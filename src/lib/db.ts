import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAndDeploySchema() {
  const client = await pool.connect();
  try {
    // Check if the users table exists (as a proxy for checking if our schema is deployed)
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    const schemaExists = rows[0].exists;

    if (!schemaExists) {
      console.log('Schema not found. Deploying schema...');
      
      // Read the schema file
      const schemaPath = path.join(process.cwd(), 'scripts', 'deploy_schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // Deploy the schema
      await client.query(schemaSql);
      
      console.log('Schema deployed successfully.');
    } else {
      console.log('Schema already exists.');
    }
  } catch (error) {
    console.error('Error checking or deploying schema:', error);
    // You might want to throw the error here or handle it in some way
    // throw error;
  } finally {
    client.release();
  }
}

// Run the schema check and deployment when this module is imported - Disabled in production.
// checkAndDeploySchema().catch(console.error);

export default pool;
