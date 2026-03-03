import pool from '../config/database';
import logger from '../utils/logger';

async function fixFeedbacksTable() {
  try {
    logger.info('开始修复 feedbacks 表...');

    // 删除旧表
    await pool.execute('DROP TABLE IF EXISTS feedbacks');
    logger.info('已删除旧的 feedbacks 表');

    // 创建新表
    const createTableSQL = `
      CREATE TABLE feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '反馈ID',
        user_id INT DEFAULT NULL COMMENT '用户ID（外键）',
        openid VARCHAR(100) NOT NULL COMMENT '用户OpenID',
        content TEXT NOT NULL COMMENT '反馈内容',
        contact VARCHAR(100) DEFAULT '' COMMENT '联系方式',
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_user_id (user_id),
        INDEX idx_openid (openid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户反馈表';
    `;

    await pool.execute(createTableSQL);
    logger.info('成功创建 feedbacks 表');

    // 查看表结构
    const [rows] = await pool.execute('DESCRIBE feedbacks');
    console.log('\n反馈表结构:');
    console.table(rows);

    logger.info('feedbacks 表修复完成！');
    process.exit(0);
  } catch (error) {
    logger.error('修复 feedbacks 表失败:', error);
    process.exit(1);
  }
}

fixFeedbacksTable();
