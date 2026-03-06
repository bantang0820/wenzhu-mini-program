import pool from '../config/database';
import logger from '../utils/logger';

async function updateShareTables() {
  try {
    logger.info('开始更新分享和解锁相关表结构...');

    // 1. 给 users 表添加新字段
    logger.info('1. 更新 users 表...');

    // 检查并添加字段
    const [columns] = await pool.execute('SHOW COLUMNS FROM users LIKE "daily_free_count"');
    if ((columns as any[]).length === 0) {
      await pool.execute(`
        ALTER TABLE users
        ADD COLUMN daily_free_count INT DEFAULT 0 COMMENT '今日已用免费次数',
        ADD COLUMN daily_free_date DATE DEFAULT NULL COMMENT '免费次数日期',
        ADD COLUMN daily_share_count INT DEFAULT 0 COMMENT '今日已分享次数',
        ADD COLUMN daily_share_date DATE DEFAULT NULL COMMENT '分享次数日期'
      `);
      logger.info('✓ users 表添加字段成功');
    } else {
      logger.info('✓ users 表字段已存在，跳过');
    }

    // 2. 创建分享记录表
    logger.info('2. 创建 share_records 表...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS share_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sharer_id INT NOT NULL COMMENT '分享者用户ID',
        sharer_openid VARCHAR(100) NOT NULL COMMENT '分享者OpenID',
        share_date DATE NOT NULL COMMENT '分享日期',
        share_count INT DEFAULT 1 COMMENT '分享次数',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_sharer_id (sharer_id),
        INDEX idx_sharer_openid (sharer_openid),
        INDEX idx_share_date (share_date),
        UNIQUE KEY uk_sharer_date (sharer_id, share_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分享记录表';
    `);
    logger.info('✓ share_records 表创建成功');

    // 3. 创建解锁记录表
    logger.info('3. 创建 unlock_records 表...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS unlock_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        user_openid VARCHAR(100) NOT NULL COMMENT '用户OpenID',
        unlock_type ENUM('share', 'invite') DEFAULT 'share' COMMENT '解锁类型：share=分享者,invite=被邀请的好友',
        share_record_id INT DEFAULT NULL COMMENT '分享记录ID',
        is_used TINYINT DEFAULT 0 COMMENT '是否已使用 0-未使用 1-已使用',
        used_at DATETIME DEFAULT NULL COMMENT '使用时间',
        expire_date DATE NOT NULL COMMENT '过期日期',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_user_id (user_id),
        INDEX idx_user_openid (user_openid),
        INDEX idx_expire_date (expire_date),
        INDEX idx_is_used (is_used),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解锁记录表';
    `);
    logger.info('✓ unlock_records 表创建成功');

    // 查看表结构
    console.log('\nusers 表结构（新增字段）:');
    const [userCols] = await pool.execute('SHOW COLUMNS FROM users WHERE Field LIKE "daily_%"');
    console.table(userCols);

    console.log('\nshare_records 表结构:');
    const [shareStruct] = await pool.execute('SHOW CREATE TABLE share_records');
    console.log((shareStruct as any)[0]['Create Table']);

    console.log('\nunlock_records 表结构:');
    const [unlockStruct] = await pool.execute('SHOW CREATE TABLE unlock_records');
    console.log((unlockStruct as any)[0]['Create Table']);

    logger.info('分享和解锁相关表更新完成！');
    process.exit(0);
  } catch (error) {
    logger.error('更新表结构失败:', error);
    process.exit(1);
  }
}

updateShareTables();
