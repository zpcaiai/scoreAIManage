const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'scoreai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  console.log('[INIT] Starting database initialization...');
  
  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, '..', 'database_schema_postgresql.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('[INIT] SQL file loaded, executing...');
    
    // Execute SQL as a single transaction
    try {
      await pool.query(sql);
      console.log('[INIT] ✅ Database tables created successfully');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('[INIT] ⚠️  Some tables already exist, checking data...');
      } else {
        throw error;
      }
    }
    
    // Verify tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('[INIT] Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verify subjects data
    const subjectsResult = await pool.query('SELECT COUNT(*) as count FROM subjects');
    console.log(`[INIT] Subjects inserted: ${subjectsResult.rows[0].count}`);
    
    // Verify classes data
    const classesResult = await pool.query('SELECT COUNT(*) as count FROM classes');
    console.log(`[INIT] Classes inserted: ${classesResult.rows[0].count}`);
    
    // Verify exams data
    const examsResult = await pool.query('SELECT COUNT(*) as count FROM exams');
    console.log(`[INIT] Exams inserted: ${examsResult.rows[0].count}`);
    
    // Verify users data
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`[INIT] Users inserted: ${usersResult.rows[0].count}`);
    
  } catch (error) {
    console.error('[INIT] ❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('[INIT] Database initialization completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[INIT] Database initialization error:', error);
    process.exit(1);
  });
