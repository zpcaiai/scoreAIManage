const { Pool } = require('pg');

// PostgreSQL database connection
class PostgreSQLDatabase {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'scoreai',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    });

    this.connected = false;

    this.pool.on('connect', () => {
      console.log('[DB] New database connection established');
    });

    this.pool.on('error', (err) => {
      console.error('[DB] Database connection pool error:', err);
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      this.connected = true;
      console.log('[DB] PostgreSQL database connected successfully', {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        currentTime: result.rows[0].current_time
      });
    } catch (error) {
      console.error('[DB] PostgreSQL database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      this.connected = false;
      console.log('[DB] PostgreSQL database disconnected');
    } catch (error) {
      console.error('[DB] Failed to disconnect from PostgreSQL database:', error);
      throw error;
    }
  }

  async query(text, params) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('[DB] Query executed', { 
        query: text.substring(0, 100), 
        duration, 
        rowCount: result.rowCount 
      });
      return result;
    } catch (error) {
      console.error('[DB] Database query error:', { query: text, error });
      throw error;
    }
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as timestamp');
      return {
        status: 'healthy',
        timestamp: result.rows[0].timestamp,
        connectionCount: this.pool.totalCount - this.pool.idleCount,
        idleCount: this.pool.idleCount,
        totalCount: this.pool.totalCount
      };
    } catch (error) {
      console.error('[DB] Database health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        connectionCount: 0,
        idleCount: 0,
        totalCount: 0
      };
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Singleton instance
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new PostgreSQLDatabase();
  }
  return dbInstance;
}

module.exports = {
  PostgreSQLDatabase,
  getDatabase
};
