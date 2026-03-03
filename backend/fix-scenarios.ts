import pool from './src/config/database';

async function fixTable() {
  try {
    console.log('正在删除旧的scenarios表...');
    await pool.execute('DROP TABLE IF EXISTS scenarios');
    console.log('✅ 旧的scenarios表已删除');

    console.log('正在重新创建scenarios表...');
    await pool.execute(`
      CREATE TABLE scenarios (
        id VARCHAR(50) PRIMARY KEY COMMENT '场景ID',
        title VARCHAR(100) NOT NULL COMMENT '场景标题',
        category VARCHAR(50) DEFAULT 'other' COMMENT '分类',
        modules JSON COMMENT '模块文案',
        stabilize_text TEXT COMMENT '稳住引导语',
        mantras JSON COMMENT '金句数组',
        healing_quote TEXT COMMENT '治愈的话',
        is_free TINYINT(1) DEFAULT 0 COMMENT '是否免费',
        is_hero TINYINT(1) DEFAULT 0 COMMENT '是否高频场景',
        \`order\` INT DEFAULT 0 COMMENT '排序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_category (category),
        INDEX idx_is_free (is_free),
        INDEX idx_order (\`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场景库表'
    `);
    console.log('✅ scenarios表创建成功');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixTable();
