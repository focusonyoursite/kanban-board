require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testConnection() {
  try {
    console.log('Database URL:', process.env.POSTGRES_URL);
    const result = await sql`SELECT NOW();`;
    console.log('Database connection successful!');
    console.log('Server time:', result.rows[0].now);
  } catch (error) {
    console.error('Database connection failed:');
    console.error(error);
  }
}

testConnection();
