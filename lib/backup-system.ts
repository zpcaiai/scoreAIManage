/**
 * 数据备份和恢复系统
 * 确保数据安全和业务连续性
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { SECURITY_CONFIG } from './security-config';
import { encrypt, decrypt } from './encryption';
import { AuditLogger } from './error-handler';

// 备份类型
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential'
}

// 备份状态
export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CORRUPTED = 'corrupted'
}

// 备份元数据
interface BackupMetadata {
  id: string;
  type: BackupType;
  timestamp: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compression: boolean;
  tables: string[];
  version: string;
  createdBy: string;
  description?: string;
  baseBackup?: string;
  changes?: number;
}

// 备份配置
interface BackupConfig {
  type: BackupType;
  includeTables: string[];
  excludeTables: string[];
  compress: boolean;
  encrypt: boolean;
  destination: string;
  retentionDays: number;
}

export class BackupSystem {
  private static instance: BackupSystem;
  private backupInProgress = false;
  private scheduledBackups: Map<string, NodeJS.Timeout> = new Map();
  
  static getInstance(): BackupSystem {
    if (!BackupSystem.instance) {
      BackupSystem.instance = new BackupSystem();
    }
    return BackupSystem.instance;
  }
  
  // 创建完整备份
  async createFullBackup(config: Partial<BackupConfig> = {}, userId: string = 'system'): Promise<string> {
    if (this.backupInProgress) {
      throw new Error('Backup already in progress');
    }
    
    this.backupInProgress = true;
    const backupId = this.generateBackupId();
    
    try {
      AuditLogger.logSecurity('BACKUP_STARTED', userId, {
        backupId,
        type: BackupType.FULL,
        timestamp: new Date().toISOString()
      });
      
      const backupConfig: BackupConfig = {
        type: BackupType.FULL,
        includeTables: ['users', 'students', 'classes', 'grades', 'subjects', 'exams', 'audit_logs'],
        excludeTables: [],
        compress: true,
        encrypt: true,
        destination: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION,
        retentionDays: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.RETENTION_DAYS,
        ...config
      };
      
      // 创建备份目录
      const backupDir = path.join(backupConfig.destination, backupId);
      await fs.mkdir(backupDir, { recursive: true });
      
      // 导出数据
      const dataFiles = await this.exportData(backupConfig, backupDir);
      
      // 压缩备份
      if (backupConfig.compress) {
        await this.compressBackup(backupDir, dataFiles);
      }
      
      // 加密备份
      if (backupConfig.encrypt) {
        await this.encryptBackup(backupDir);
      }
      
      // 生成元数据
      const metadata = await this.generateMetadata(backupId, backupConfig, dataFiles, userId);
      await fs.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // 验证备份完整性
      const isValid = await this.verifyBackupIntegrity(backupDir, metadata);
      
      if (!isValid) {
        throw new Error('Backup integrity verification failed');
      }
      
      AuditLogger.logSecurity('BACKUP_COMPLETED', userId, {
        backupId,
        type: BackupType.FULL,
        size: metadata.size,
        status: BackupStatus.COMPLETED
      });
      
      return backupId;
      
    } catch (error) {
      AuditLogger.logSecurity('BACKUP_FAILED', userId, {
        backupId,
        error: error instanceof Error ? error.message : String(error),
        type: BackupType.FULL
      });
      throw error;
    } finally {
      this.backupInProgress = false;
    }
  }
  
  // 创建增量备份
  async createIncrementalBackup(lastBackupId: string, config: Partial<BackupConfig> = {}, userId: string = 'system'): Promise<string> {
    const lastBackup = await this.getBackupMetadata(lastBackupId);
    if (!lastBackup) {
      throw new Error('Last backup not found');
    }
    
    this.backupInProgress = true;
    const backupId = this.generateBackupId();
    
    try {
      AuditLogger.logSecurity('BACKUP_STARTED', userId, {
        backupId,
        type: BackupType.INCREMENTAL,
        baseBackup: lastBackupId,
        timestamp: new Date().toISOString()
      });
      
      const backupConfig: BackupConfig = {
        type: BackupType.INCREMENTAL,
        includeTables: lastBackup.tables,
        excludeTables: [],
        compress: true,
        encrypt: true,
        destination: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION,
        retentionDays: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.RETENTION_DAYS,
        ...config
      };
      
      // 获取自上次备份以来的变更
      const changes = await this.getChangesSince(lastBackup.timestamp);
      
      // 创建备份目录
      const backupDir = path.join(backupConfig.destination, backupId);
      await fs.mkdir(backupDir, { recursive: true });
      
      // 导出变更数据
      const dataFiles = await this.exportChanges(backupDir, changes);
      
      // 压缩和加密
      if (backupConfig.compress) {
        await this.compressBackup(backupDir, dataFiles);
      }
      
      if (backupConfig.encrypt) {
        await this.encryptBackup(backupDir);
      }
      
      // 生成元数据
      const metadata = await this.generateMetadata(backupId, backupConfig, dataFiles, userId);
      metadata.baseBackup = lastBackupId;
      metadata.changes = changes.length;
      
      await fs.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      AuditLogger.logSecurity('BACKUP_COMPLETED', userId, {
        backupId,
        type: BackupType.INCREMENTAL,
        changes: changes.length,
        status: BackupStatus.COMPLETED
      });
      
      return backupId;
      
    } catch (error) {
      AuditLogger.logSecurity('BACKUP_FAILED', userId, {
        backupId,
        error: error instanceof Error ? error.message : String(error),
        type: BackupType.INCREMENTAL
      });
      throw error;
    } finally {
      this.backupInProgress = false;
    }
  }
  
  // 恢复数据
  async restoreData(backupId: string, targetTables?: string[], userId: string = 'system'): Promise<void> {
    const backup = await this.getBackupMetadata(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    AuditLogger.logSecurity('RESTORE_STARTED', userId, {
      backupId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const backupDir = path.join(SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION, backupId);
      
      // 验证备份完整性
      const isValid = await this.verifyBackupIntegrity(backupDir, backup);
      if (!isValid) {
        throw new Error('Backup corrupted or tampered');
      }
      
      // 解密备份
      if (backup.encrypted) {
        await this.decryptBackup(backupDir);
      }
      
      // 解压备份
      if (backup.compression) {
        await this.decompressBackup(backupDir);
      }
      
      // 恢复数据
      await this.importData(backupDir, targetTables || backup.tables);
      
      AuditLogger.logSecurity('RESTORE_COMPLETED', userId, {
        backupId,
        tables: targetTables || backup.tables,
        status: BackupStatus.COMPLETED
      });
      
    } catch (error) {
      AuditLogger.logSecurity('RESTORE_FAILED', userId, {
        backupId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  // 列出所有备份
  async listBackups(): Promise<BackupMetadata[]> {
    const backupDir = SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION;
    
    try {
      const entries = await fs.readdir(backupDir, { withFileTypes: true });
      const backups: BackupMetadata[] = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadataPath = path.join(backupDir, entry.name, 'metadata.json');
          try {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            backups.push(metadata);
          } catch (error) {
            // 忽略损坏的备份
            console.warn(`Corrupted backup metadata: ${entry.name}`);
          }
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
  
  // 清理过期备份
  async cleanupExpiredBackups(): Promise<void> {
    const backups = await this.listBackups();
    const now = Date.now();
    const retentionMs = SECURITY_CONFIG.DATA_PROTECTION.BACKUP.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    for (const backup of backups) {
      if (now - backup.timestamp > retentionMs) {
        await this.deleteBackup(backup.id);
      }
    }
  }
  
  // 删除备份
  async deleteBackup(backupId: string): Promise<void> {
    const backupDir = path.join(SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION, backupId);
    
    try {
      await fs.rm(backupDir, { recursive: true, force: true });
      
      AuditLogger.logSecurity('BACKUP_DELETED', 'system', {
        backupId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
    }
  }
  
  // 设置定期备份
  scheduleRegularBackup(cronExpression: string, config: Partial<BackupConfig> = {}): void {
    // 解析cron表达式并设置定时器
    // 这里简化实现，实际应该使用专门的cron库
    
    const interval = this.parseCronToInterval(cronExpression);
    const backupId = `scheduled_${Date.now()}`;
    
    const timer = setInterval(async () => {
      try {
        await this.createFullBackup(config, 'scheduled_system');
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, interval);
    
    this.scheduledBackups.set(backupId, timer);
    
    AuditLogger.logSecurity('SCHEDULED_BACKUP_SETUP', 'system', {
      backupId,
      cronExpression,
      interval
    });
  }
  
  // 导出数据
  private async exportData(config: BackupConfig, backupDir: string): Promise<string[]> {
    const dataFiles: string[] = [];
    
    for (const table of config.includeTables) {
      if (!config.excludeTables.includes(table)) {
        const filePath = path.join(backupDir, `${table}.json`);
        
        // 这里应该调用实际的数据访问层
        // const data = await DataAccessLayer.exportTable(table);
        // await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        dataFiles.push(filePath);
      }
    }
    
    return dataFiles;
  }
  
  // 压缩备份
  private async compressBackup(backupDir: string, files: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const archivePath = path.join(backupDir, 'data.tar.gz');
      const fileList = files.map(f => path.basename(f)).join(' ');
      
      exec(`tar -czf "${archivePath}" -C "${backupDir}" ${fileList}`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  // 加密备份
  private async encryptBackup(backupDir: string): Promise<void> {
    const archivePath = path.join(backupDir, 'data.tar.gz');
    const encryptedPath = path.join(backupDir, 'data.enc');
    
    const data = await fs.readFile(archivePath);
    const encryptedData = encrypt(data.toString('base64'));
    
    await fs.writeFile(encryptedPath, encryptedData);
    await fs.unlink(archivePath); // 删除未加密的文件
  }
  
  // 生成备份元数据
  private async generateMetadata(
    backupId: string,
    config: BackupConfig,
    files: string[],
    userId: string
  ): Promise<BackupMetadata> {
    const backupDir = path.join(config.destination, backupId);
    let totalSize = 0;
    
    for (const file of files) {
      const stats = await fs.stat(file);
      totalSize += stats.size;
    }
    
    return {
      id: backupId,
      type: config.type,
      timestamp: Date.now(),
      size: totalSize,
      checksum: await this.calculateDirectoryChecksum(backupDir),
      encrypted: config.encrypt,
      compression: config.compress,
      tables: config.includeTables,
      version: '1.0.0',
      createdBy: userId
    };
  }
  
  // 验证备份完整性
  private async verifyBackupIntegrity(backupDir: string, metadata: BackupMetadata): Promise<boolean> {
    const currentChecksum = await this.calculateDirectoryChecksum(backupDir);
    return currentChecksum === metadata.checksum;
  }
  
  // 计算目录校验和
  private async calculateDirectoryChecksum(dirPath: string): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    const files = await fs.readdir(dirPath);
    for (const file of files.sort()) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const data = await fs.readFile(filePath);
        hash.update(file + data.toString());
      }
    }
    
    return hash.digest('hex');
  }
  
  // 生成备份ID
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }
  
  // 获取备份元数据
  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const metadataPath = path.join(
      SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION,
      backupId,
      'metadata.json'
    );
    
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      return metadata;
    } catch (error) {
      return null;
    }
  }
  
  // 获取变更数据
  private async getChangesSince(timestamp: number): Promise<any[]> {
    // 这里应该实现变更检测逻辑
    // 返回自指定时间戳以来的所有变更
    return [];
  }
  
  // 导出变更
  private async exportChanges(backupDir: string, changes: any[]): Promise<string[]> {
    // 实现变更数据导出逻辑
    return [];
  }
  
  // 解密备份
  private async decryptBackup(backupDir: string): Promise<void> {
    const encryptedPath = path.join(backupDir, 'data.enc');
    const archivePath = path.join(backupDir, 'data.tar.gz');
    
    const encryptedData = await fs.readFile(encryptedPath, 'utf8');
    const decryptedData = decrypt(encryptedData);
    
    await fs.writeFile(archivePath, Buffer.from(decryptedData, 'base64'));
    await fs.unlink(encryptedPath); // 删除加密文件
  }
  
  // 解压备份
  private async decompressBackup(backupDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const archivePath = path.join(backupDir, 'data.tar.gz');
      
      exec(`tar -xzf "${archivePath}" -C "${backupDir}"`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  // 导入数据
  private async importData(backupDir: string, tables: string[]): Promise<void> {
    for (const table of tables) {
      const filePath = path.join(backupDir, `${table}.json`);
      
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        // 这里应该调用实际的数据访问层
        // await DataAccessLayer.importTable(table, data);
      } catch (error) {
        console.error(`Failed to import table ${table}:`, error);
      }
    }
  }
  
  // 解析cron表达式为间隔（简化实现）
  private parseCronToInterval(cronExpression: string): number {
    // 简化实现，实际应该使用专门的cron解析库
    if (cronExpression === '0 2 * * *') {
      return 24 * 60 * 60 * 1000; // 每天凌晨2点
    }
    return 60 * 60 * 1000; // 默认每小时
  }
}

// 备份管理器
export class BackupManager {
  private backupSystem: BackupSystem;
  
  constructor() {
    this.backupSystem = BackupSystem.getInstance();
    this.setupAutomaticCleanup();
  }
  
  // 创建手动备份
  async createManualBackup(description?: string): Promise<string> {
    return await this.backupSystem.createFullBackup({
      includeTables: ['users', 'students', 'classes', 'grades', 'subjects', 'exams', 'audit_logs'],
      excludeTables: [],
      compress: true,
      encrypt: true,
      destination: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.BACKUP_LOCATION,
      retentionDays: SECURITY_CONFIG.DATA_PROTECTION.BACKUP.RETENTION_DAYS,
      description
    }, 'manual_user');
  }
  
  // 恢复到指定备份
  async restoreToBackup(backupId: string): Promise<void> {
    await this.backupSystem.restoreData(backupId);
  }
  
  // 获取备份历史
  async getBackupHistory(): Promise<BackupMetadata[]> {
    return await this.backupSystem.listBackups();
  }
  
  // 设置自动备份
  enableAutomaticBackup(): void {
    this.backupSystem.scheduleRegularBackup('0 2 * * *', {
      type: BackupType.FULL,
      compress: true,
      encrypt: true
    });
  }
  
  // 禁用自动备份
  disableAutomaticBackup(): void {
    // 停止所有定时备份任务
    // 实现清理逻辑
  }
  
  // 设置自动清理
  private setupAutomaticCleanup(): void {
    // 每天清理过期备份
    setInterval(async () => {
      await this.backupSystem.cleanupExpiredBackups();
    }, 24 * 60 * 60 * 1000);
  }
}
