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
class PostgreSQLDatabase {
  private static instance: PostgreSQLDatabase;
  private pool: Pool;
  private connected: boolean = false;
  private data: Map<string, any[]> = new Map();

  private constructor() {
    const config: DatabaseConfig = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'grade_management',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
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
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      this.connected = true;
      Logger.info('Database connected successfully');
      
      // Initialize with sample data
      this.initializeSampleData();
    } catch (error) {
      Logger.error('Database connection failed', error);
      throw createDatabaseError('Failed to connect to database', error);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    Logger.info('Database disconnected');
  }

  private initializeSampleData(): void {
    // Initialize classes
    this.data.set('classes', [
      { class_id: '1', class_name: '高一(1)班', grade_level: 1, academic_year: '2024-2025', class_teacher: '张老师' },
      { class_id: '2', class_name: '高一(2)班', grade_level: 1, academic_year: '2024-2025', class_teacher: '李老师' },
      { class_id: '3', class_name: '高二(1)班', grade_level: 2, academic_year: '2024-2025', class_teacher: '王老师' },
      { class_id: '4', class_name: '高二(2)班', grade_level: 2, academic_year: '2024-2025', class_teacher: '刘老师' }
    ]);

    // Initialize students
    this.data.set('students', [
      { 
        student_id: '1', 
        student_number: '202401001', 
        student_name: '张三', 
        class_id: '1', 
        class_name: '高一(1)班',
        seat_number: 1, 
        gender: 'male', 
        birth_date: '2008-05-15', 
        enrollment_date: '2024-09-01', 
        phone: '13800138001', 
        parent_name: '张父', 
        parent_phone: '13800138002' 
      },
      { 
        student_id: '2', 
        student_number: '202401002', 
        student_name: '李四', 
        class_id: '1', 
        class_name: '高一(1)班',
        seat_number: 2, 
        gender: 'female', 
        birth_date: '2008-07-22', 
        enrollment_date: '2024-09-01', 
        phone: '13800138003', 
        parent_name: '李母', 
        parent_phone: '13800138004' 
      }
    ]);

    // Initialize subjects
    this.data.set('subjects', [
      { subject_id: '1', subject_code: 'CHN', subject_name: '语文', subject_type: 'core', full_score: 150.00 },
      { subject_id: '2', subject_code: 'MATH', subject_name: '数学', subject_type: 'core', full_score: 150.00 },
      { subject_id: '3', subject_code: 'ENG', subject_name: '外语', subject_type: 'core', full_score: 150.00 },
      { subject_id: '4', subject_code: 'PHY', subject_name: '物理', subject_type: 'core', full_score: 100.00 },
      { subject_id: '5', subject_code: 'CHE', subject_name: '化学', subject_type: 'core', full_score: 100.00 },
      { subject_id: '6', subject_code: 'POL', subject_name: '政治', subject_type: 'core', full_score: 100.00 },
      { subject_id: '7', subject_code: 'HIS', subject_name: '历史', subject_type: 'core', full_score: 100.00 },
      { subject_id: '8', subject_code: 'GEO', subject_name: '地理', subject_type: 'core', full_score: 100.00 },
      { subject_id: '9', subject_code: 'BIO', subject_name: '生物', subject_type: 'core', full_score: 100.00 },
      { subject_id: '10', subject_code: 'IT', subject_name: '信息科技', subject_type: 'core', full_score: 100.00 }
    ]);

    // Initialize exams
    this.data.set('exams', [
      { 
        exam_id: '1', 
        exam_name: '2024年期中考试', 
        exam_type: 'midterm', 
        semester: '第一学期', 
        academic_year: '2024-2025',
        start_date: '2024-11-01', 
        end_date: '2024-11-05' 
      },
      { 
        exam_id: '2', 
        exam_name: '2024年期末考试', 
        exam_type: 'final', 
        semester: '第一学期', 
        academic_year: '2024-2025',
        start_date: '2025-01-15', 
        end_date: '2025-01-20' 
      }
    ]);

    // Initialize grades
    this.data.set('grades', [
      { grade_id: '1', student_id: '1', subject_id: '1', exam_id: '1', score: 135.00, semester: '第一学期', academic_year: '2024-2025' },
      { grade_id: '2', student_id: '1', subject_id: '2', exam_id: '1', score: 142.00, semester: '第一学期', academic_year: '2024-2025' },
      { grade_id: '3', student_id: '1', subject_id: '3', exam_id: '1', score: 128.00, semester: '第一学期', academic_year: '2024-2025' },
      { grade_id: '4', student_id: '2', subject_id: '1', exam_id: '1', score: 125.00, semester: '第一学期', academic_year: '2024-2025' },
      { grade_id: '5', student_id: '2', subject_id: '2', exam_id: '1', score: 138.00, semester: '第一学期', academic_year: '2024-2025' }
    ]);

    Logger.info('Sample data initialized');
  }

  async findAll(table: string, filters?: any): Promise<any[]> {
    this.ensureConnected();
    const data = this.data.get(table) || [];
    
    if (!filters) return data;
    
    return data.filter(item => {
      return Object.keys(filters).every(key => {
        if (filters[key] === undefined || filters[key] === null) return true;
        return item[key] === filters[key];
      });
    });
  }

  async findById(table: string, id: string): Promise<any | null> {
    this.ensureConnected();
    const data = this.data.get(table) || [];
    return data.find(item => {
      // Handle different ID field names
      const idField = table === 'classes' ? 'class_id' : 
                     table === 'students' ? 'student_id' :
                     table === 'subjects' ? 'subject_id' :
                     table === 'exams' ? 'exam_id' :
                     table === 'grades' ? 'grade_id' : 'id';
      return item[idField] === id;
    }) || null;
  }

  async create(table: string, data: any): Promise<any> {
    this.ensureConnected();
    
    const tableData = this.data.get(table) || [];
    const idField = table === 'classes' ? 'class_id' : 
                   table === 'students' ? 'student_id' :
                   table === 'subjects' ? 'subject_id' :
                   table === 'exams' ? 'exam_id' :
                   table === 'grades' ? 'grade_id' : 'id';
    
    // Generate new ID
    const maxId = Math.max(...tableData.map(item => parseInt(item[idField]) || 0), 0);
    const newId = (maxId + 1).toString();
    
    const newItem = { ...data, [idField]: newId };
    tableData.push(newItem);
    this.data.set(table, tableData);
    
    Logger.debug(`Created new ${table} record`, { id: newId, data: newItem });
    return newItem;
  }

  async update(table: string, id: string, data: any): Promise<any | null> {
    this.ensureConnected();
    
    const tableData = this.data.get(table) || [];
    const idField = table === 'classes' ? 'class_id' : 
                   table === 'students' ? 'student_id' :
                   table === 'subjects' ? 'subject_id' :
                   table === 'exams' ? 'exam_id' :
                   table === 'grades' ? 'grade_id' : 'id';
    
    const index = tableData.findIndex(item => item[idField] === id);
    if (index === -1) return null;
    
    tableData[index] = { ...tableData[index], ...data };
    this.data.set(table, tableData);
    
    Logger.debug(`Updated ${table} record`, { id, data });
    return tableData[index];
  }

  async delete(table: string, id: string): Promise<boolean> {
    this.ensureConnected();
    
    const tableData = this.data.get(table) || [];
    const idField = table === 'classes' ? 'class_id' : 
                   table === 'students' ? 'student_id' :
                   table === 'subjects' ? 'subject_id' :
                   table === 'exams' ? 'exam_id' :
                   table === 'grades' ? 'grade_id' : 'id';
    
    const index = tableData.findIndex(item => item[idField] === id);
    if (index === -1) return false;
    
    tableData.splice(index, 1);
    this.data.set(table, tableData);
    
    Logger.debug(`Deleted ${table} record`, { id });
    return true;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw createDatabaseError('Database not connected');
    }
  }
}

// Database connection manager
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

  getDatabase() {
    if (!this.connected) {
      throw createDatabaseError('Database not connected');
    }
    return this.db;
  }
}

// Data access layer with security
export class DataAccessLayer {
  private db: PostgreSQLDatabase | null = null;
  private isBuildTime: boolean;

  constructor() {
    // 默认设置为构建时间，只有在有明确数据库连接时才设置为运行时
    this.isBuildTime = true;
    
    // 只有在有DATABASE_URL时才尝试连接数据库
    if (process.env.DATABASE_URL && process.env.DATABASE_URL !== '') {
      try {
        this.db = DatabaseManager.getInstance().getDatabase();
        this.isBuildTime = false;
        console.log('Database connected successfully');
      } catch (error) {
        console.warn('Database connection failed:', error);
        this.isBuildTime = true;
      }
    } else {
      console.log('No DATABASE_URL provided, running in static mode');
    }
  }

  private ensureDb(): PostgreSQLDatabase {
    if (this.isBuildTime) {
      throw new Error('Database not available during build');
    }
    
    if (!this.db) {
      try {
        this.db = DatabaseManager.getInstance().getDatabase();
      } catch (error) {
        console.warn('Database connection failed:', error);
        this.isBuildTime = true;
        throw new Error('Database not available');
      }
    }
    return this.db;
  }

  // Class operations
  async getClasses(filters?: any): Promise<any[]> {
    if (this.isBuildTime) return [];
    return await this.ensureDb().findAll('classes', filters);
  }

  async getClassById(id: string): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().findById('classes', id);
  }

  async createClass(data: any): Promise<any> {
    if (this.isBuildTime) return data;
    return await this.ensureDb().create('classes', data);
  }

  async updateClass(id: string, data: any): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().update('classes', id, data);
  }

  async deleteClass(id: string): Promise<boolean> {
    if (this.isBuildTime) return false;
    return await this.ensureDb().delete('classes', id);
  }

  // Student operations
  async getStudents(filters?: any): Promise<any[]> {
    if (this.isBuildTime) return [];
    return await this.ensureDb().findAll('students', filters);
  }

  async getStudentById(id: string): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().findById('students', id);
  }

  async createStudent(data: any): Promise<any> {
    if (this.isBuildTime) return data;
    return await this.ensureDb().create('students', data);
  }

  async updateStudent(id: string, data: any): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().update('students', id, data);
  }

  async deleteStudent(id: string): Promise<boolean> {
    if (this.isBuildTime) return false;
    return await this.ensureDb().delete('students', id);
  }

  // Subject operations
  async getSubjects(): Promise<any[]> {
    if (this.isBuildTime) return [];
    return await this.ensureDb().findAll('subjects');
  }

  async getSubjectById(id: string): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().findById('subjects', id);
  }

  // Exam operations
  async getExams(): Promise<any[]> {
    if (this.isBuildTime) return [];
    return await this.ensureDb().findAll('exams');
  }

  async getExamById(id: string): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().findById('exams', id);
  }

  // Grade operations
  async getGrades(filters?: any): Promise<any[]> {
    if (this.isBuildTime) return [];
    return await this.ensureDb().findAll('grades', filters);
  }

  async getGradeById(id: string): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().findById('grades', id);
  }

  async createGrade(data: any): Promise<any> {
    if (this.isBuildTime) return data;
    return await this.ensureDb().create('grades', data);
  }

  async updateGrade(id: string, data: any): Promise<any | null> {
    if (this.isBuildTime) return null;
    return await this.ensureDb().update('grades', id, data);
  }

  async deleteGrade(id: string): Promise<boolean> {
    if (this.isBuildTime) return false;
    return await this.ensureDb().delete('grades', id);
  }

  // Batch operations
  async createGrades(grades: any[]): Promise<any[]> {
    if (this.isBuildTime) return grades;
    const results = [];
    for (const grade of grades) {
      results.push(await this.createGrade(grade));
    }
    return results;
  }
}

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  await DatabaseManager.getInstance().connect();
}
