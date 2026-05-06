import { Pool, PoolClient } from 'pg';
import { Logger, createDatabaseError } from './error-handler';

// PostgreSQL数据库连接配置
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
  maxConnections: number;
}

// PostgreSQL数据库实现
export class PostgreSQLDatabase {
  private static instance: PostgreSQLDatabase;
  private pool: Pool;
  private connected: boolean = false;

  private constructor() {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'scoremanage',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true',
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
    };

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.connectionTimeout,
    });

    // 监听连接池事件
    this.pool.on('connect', () => {
      Logger.debug('New database connection established');
    });

    this.pool.on('error', (err) => {
      Logger.error('Database connection pool error', err);
    });
  }

  static getInstance(): PostgreSQLDatabase {
    if (!PostgreSQLDatabase.instance) {
      PostgreSQLDatabase.instance = new PostgreSQLDatabase();
    }
    return PostgreSQLDatabase.instance;
  }

  async connect(): Promise<void> {
    try {
      // 测试连接
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      this.connected = true;
      Logger.info('PostgreSQL database connected successfully', {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        currentTime: result.rows[0].current_time
      });
      
      // 初始化基础数据
      await this.initializeSampleData();
    } catch (error) {
      Logger.error('PostgreSQL database connection failed', error);
      throw createDatabaseError('Failed to connect to PostgreSQL database', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
      Logger.info('PostgreSQL database disconnected');
    } catch (error) {
      Logger.error('Failed to disconnect from PostgreSQL database', error);
      throw error;
    }
  }

  // 执行查询
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.connected) {
      throw createDatabaseError('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      Logger.debug('Query executed', { 
        query: text.substring(0, 100), 
        duration, 
        rowCount: result.rowCount 
      });
      return result;
    } catch (error) {
      Logger.error('Database query error', { query: text, error });
      throw createDatabaseError('Query execution failed', error);
    }
  }

  // 获取客户端连接（用于事务）
  async getClient(): Promise<PoolClient> {
    if (!this.connected) {
      throw createDatabaseError('Database not connected');
    }
    return await this.pool.connect();
  }

  // 执行事务
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 初始化示例数据
  private async initializeSampleData(): Promise<void> {
    try {
      // 检查是否已有数据
      const classesResult = await this.query('SELECT COUNT(*) as count FROM classes');
      if (parseInt(classesResult.rows[0].count) > 0) {
        Logger.info('Sample data already exists, skipping initialization');
        return;
      }

      // 插入示例班级数据
      await this.query(`
        INSERT INTO classes (class_name, grade_level, academic_year, class_teacher) VALUES
        ('高一(1)班', 1, '2024-2025', '张老师'),
        ('高一(2)班', 1, '2024-2025', '李老师'),
        ('高二(1)班', 2, '2024-2025', '王老师'),
        ('高二(2)班', 2, '2024-2025', '刘老师')
      `);

      // 插入示例学生数据
      await this.query(`
        INSERT INTO students (student_number, student_name, class_id, seat_number, gender, birth_date, enrollment_date, phone, parent_name, parent_phone) VALUES
        ('202401001', '张三', 1, 1, '男', '2008-05-15', '2024-09-01', '13800138001', '张父', '13800138002'),
        ('202401002', '李四', 1, 2, '女', '2008-07-22', '2024-09-01', '13800138003', '李母', '13800138004'),
        ('202401003', '王五', 2, 1, '男', '2008-03-10', '2024-09-01', '13800138005', '王父', '13800138006'),
        ('202401004', '赵六', 2, 2, '女', '2008-11-28', '2024-09-01', '13800138007', '赵母', '13800138008')
      `);

      Logger.info('Sample data initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize sample data', error);
      // 不抛出错误，允许系统继续运行
    }
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    connectionCount: number;
    idleCount: number;
    totalCount: number;
  }> {
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
      Logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        connectionCount: 0,
        idleCount: 0,
        totalCount: 0
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPool(): Pool {
    return this.pool;
  }
}

// 数据库连接管理器
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: PostgreSQLDatabase;
  private connected: boolean = false;

  private constructor() {
    this.db = PostgreSQLDatabase.getInstance();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      await this.db.connect();
      this.connected = true;
    } catch (error) {
      Logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    try {
      await this.db.disconnect();
      this.connected = false;
    } catch (error) {
      Logger.error('Failed to disconnect from database', error);
      throw error;
    }
  }

  getDatabase(): PostgreSQLDatabase {
    if (!this.connected) {
      throw createDatabaseError('Database not connected');
    }
    return this.db;
  }
}

// 数据访问层
export class DataAccessLayer {
  private db: PostgreSQLDatabase;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
  }

  // 通用查询方法
  async query(text: string, params?: any[]): Promise<any> {
    return await this.db.query(text, params);
  }

  // 事务方法
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return await this.db.transaction(callback);
  }

  // 班级操作
  async getClasses(filters?: any): Promise<any[]> {
    let query = 'SELECT * FROM classes';
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      Object.keys(filters).forEach((key, index) => {
        conditions.push(`${key} = $${index + 1}`);
        params.push(filters[key]);
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getClassById(id: string): Promise<any | null> {
    const result = await this.db.query('SELECT * FROM classes WHERE class_id = $1', [id]);
    return result.rows[0] || null;
  }

  async createClass(data: any): Promise<any> {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO classes (${fields}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async updateClass(id: string, data: any): Promise<any | null> {
    const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    
    const query = `UPDATE classes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE class_id = $1 RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async deleteClass(id: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM classes WHERE class_id = $1', [id]);
    return result.rowCount > 0;
  }

  // 学生操作
  async getStudents(filters?: any): Promise<any[]> {
    let query = `
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id
    `;
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      Object.keys(filters).forEach((key, index) => {
        conditions.push(`s.${key} = $${index + 1}`);
        params.push(filters[key]);
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getStudentById(id: string): Promise<any | null> {
    const query = `
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      WHERE s.student_id = $1
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async createStudent(data: any): Promise<any> {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO students (${fields}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async updateStudent(id: string, data: any): Promise<any | null> {
    const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    
    const query = `UPDATE students SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1 RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async deleteStudent(id: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM students WHERE student_id = $1', [id]);
    return result.rowCount > 0;
  }

  // 科目操作
  async getSubjects(): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM subjects ORDER BY subject_code');
    return result.rows;
  }

  async getSubjectById(id: string): Promise<any | null> {
    const result = await this.db.query('SELECT * FROM subjects WHERE subject_id = $1', [id]);
    return result.rows[0] || null;
  }

  // 考试操作
  async getExams(): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM exams ORDER BY start_date DESC');
    return result.rows;
  }

  async getExamById(id: string): Promise<any | null> {
    const result = await this.db.query('SELECT * FROM exams WHERE exam_id = $1', [id]);
    return result.rows[0] || null;
  }

  // 成绩操作
  async getGrades(filters?: any): Promise<any[]> {
    let query = `
      SELECT g.*, s.student_name, sub.subject_name, c.class_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.student_id
      LEFT JOIN subjects sub ON g.subject_id = sub.subject_id
      LEFT JOIN classes c ON s.class_id = c.class_id
    `;
    const params: any[] = [];
    
    if (filters) {
      const conditions: string[] = [];
      Object.keys(filters).forEach((key, index) => {
        conditions.push(`g.${key} = $${index + 1}`);
        params.push(filters[key]);
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    query += ' ORDER BY g.exam_date DESC, s.student_name';
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getGradeById(id: string): Promise<any | null> {
    const query = `
      SELECT g.*, s.student_name, sub.subject_name, c.class_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.student_id
      LEFT JOIN subjects sub ON g.subject_id = sub.subject_id
      LEFT JOIN classes c ON s.class_id = c.class_id
      WHERE g.grade_id = $1
    `;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async createGrade(data: any): Promise<any> {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO grades (${fields}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async updateGrade(id: string, data: any): Promise<any | null> {
    const fields = Object.keys(data).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(data)];
    
    const query = `UPDATE grades SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE grade_id = $1 RETURNING *`;
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async deleteGrade(id: string): Promise<boolean> {
    const result = await this.db.query('DELETE FROM grades WHERE grade_id = $1', [id]);
    return result.rowCount > 0;
  }

  // 批量创建成绩
  async createGrades(grades: any[]): Promise<any[]> {
    return await this.db.transaction(async (client) => {
      const results = [];
      for (const grade of grades) {
        const fields = Object.keys(grade).join(', ');
        const placeholders = Object.keys(grade).map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(grade);
        
        const query = `INSERT INTO grades (${fields}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }
      return results;
    });
  }
}

// 初始化数据库连接
export async function initializeDatabase(): Promise<void> {
  await DatabaseManager.getInstance().connect();
}

// 导出默认实例
export const database = PostgreSQLDatabase.getInstance();
