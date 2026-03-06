import pool from '../config/database';
import logger from '../utils/logger';

async function updatePracticeRecordsTable() {
  try {
    logger.info('开始更新练习记录表结构...');

    // 先检查索引是否存在
    const [indexes] = await pool.execute(`
      SHOW INDEX FROM practice_records WHERE Key_name = 'uk_user_date'
    `);

    if ((indexes as any[]).length > 0) {
      // 删除旧表的唯一约束
      await pool.execute(`
        ALTER TABLE practice_records DROP INDEX uk_user_date
      `);
      logger.info('已删除 uk_user_date 唯一约束');
    } else {
      logger.info('uk_user_date 约束不存在，跳过删除');
    }

    // 查看表结构
    const [rows] = await pool.execute('SHOW CREATE TABLE practice_records');
    console.log('\n练习记录表结构:');
    console.log((rows as any)[0]['Create Table']);

    logger.info('练习记录表更新完成！');
    process.exit(0);
  } catch (error) {
    logger.error('更新练习记录表失败:', error);
    process.exit(1);
  }
}

updatePracticeRecordsTable();
