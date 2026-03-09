import pool from './src/config/database';

async function fixTable() {
  try {
    console.log('正在删除旧的redeem_codes表...');
    await pool.execute('DROP TABLE IF EXISTS redeem_codes');
    console.log('✅ 旧的redeem_codes表已删除');

    console.log('正在重新创建redeem_codes表...');
    await pool.execute(`
      CREATE TABLE redeem_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE COMMENT '兑换码',
        status TINYINT DEFAULT 0 COMMENT '0=未使用, 1=已使用',
        type VARCHAR(50) DEFAULT 'annual' COMMENT '兑换类型',
        duration INT DEFAULT 365 COMMENT '天数',
        used_by VARCHAR(100) DEFAULT NULL COMMENT '使用者openid',
        used_time DATETIME DEFAULT NULL COMMENT '使用时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_code (code),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换码表'
    `);
    console.log('✅ redeem_codes表创建成功');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixTable();
