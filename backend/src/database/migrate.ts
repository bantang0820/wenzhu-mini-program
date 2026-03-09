import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  try {
    console.log('🔄 开始创建数据库表...');

    // 1. 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(100) NOT NULL UNIQUE COMMENT '微信OpenID',
        nickname VARCHAR(100) DEFAULT '' COMMENT '用户昵称',
        avatar_url VARCHAR(500) DEFAULT '' COMMENT '头像URL',
        is_vip TINYINT(1) DEFAULT 0 COMMENT '是否为会员',
        vip_expire_time DATETIME DEFAULT NULL COMMENT '会员过期时间',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
        last_login_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后登录时间',
        total_days INT DEFAULT 0 COMMENT '累计打卡天数',
        total_count INT DEFAULT 0 COMMENT '累计打卡次数',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_openid (openid),
        INDEX idx_vip (is_vip, vip_expire_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
    `);
    console.log('✅ 用户表创建成功');

    // 2. 创建会员记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '会员状态',
        type VARCHAR(50) DEFAULT 'annual' COMMENT '会员类型',
        start_date DATETIME NOT NULL COMMENT '开始时间',
        end_date DATETIME NOT NULL COMMENT '过期时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_end_date (end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员记录表';
    `);
    console.log('✅ 会员记录表创建成功');

    // 3. 创建兑换码表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS redeem_codes (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换码表';
    `);
    console.log('✅ 兑换码表创建成功');

    // 4. 创建反馈表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL COMMENT '用户ID',
        openid VARCHAR(100) DEFAULT '' COMMENT '用户OpenID',
        content TEXT NOT NULL COMMENT '反馈内容',
        contact VARCHAR(100) DEFAULT '' COMMENT '联系方式',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='反馈表';
    `);
    console.log('✅ 反馈表创建成功');

    // 5. 创建场景表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS scenarios (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场景库表';
    `);
    console.log('✅ 场景表创建成功');

    // 6. 创建练习记录表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS practice_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        scenario_id VARCHAR(50) NOT NULL COMMENT '场景ID',
        practice_date DATE NOT NULL COMMENT '练习日期',
        energy INT DEFAULT 0 COMMENT '获得能量',
        mood_before INT DEFAULT 3 COMMENT '练习前心情',
        mood_after INT DEFAULT 3 COMMENT '练习后心情',
        duration INT DEFAULT 0 COMMENT '停留时长(毫秒)',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_date (user_id, practice_date),
        INDEX idx_user_id (user_id),
        INDEX idx_practice_date (practice_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习记录表';
    `);
    console.log('✅ 练习记录表创建成功');

    // 7. 创建情绪日志表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS emotion_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        scenario_id VARCHAR(50) NOT NULL COMMENT '场景ID',
        scenario_title VARCHAR(100) COMMENT '场景标题',
        \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',
        weekday TINYINT DEFAULT 0 COMMENT '星期几(0-6)',
        duration INT DEFAULT 0 COMMENT '停留时长(毫秒)',
        mood_before TINYINT DEFAULT 3 COMMENT '练习前心情(1-5)',
        mood_after TINYINT DEFAULT 3 COMMENT '练习后心情(1-5)',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_timestamp (\`timestamp\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情绪日志表';
    `);
    console.log('✅ 情绪日志表创建成功');

    // 8. 创建专辑表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS albums (
        id VARCHAR(50) PRIMARY KEY COMMENT '专辑ID',
        title VARCHAR(100) NOT NULL COMMENT '专辑标题',
        subtitle VARCHAR(100) DEFAULT '' COMMENT '副标题',
        short_desc TEXT COMMENT '简短描述',
        icon VARCHAR(50) DEFAULT '' COMMENT '图标emoji',
        progress INT DEFAULT 0 COMMENT '进度(0-100)',
        color_start VARCHAR(20) DEFAULT '' COMMENT '渐变起始色',
        color_end VARCHAR(20) DEFAULT '' COMMENT '渐变结束色',
        tag VARCHAR(50) DEFAULT '' COMMENT '标签',
        is_free TINYINT(1) DEFAULT 0 COMMENT '是否免费',
        \`order\` INT DEFAULT 0 COMMENT '排序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专辑表';
    `);
    console.log('✅ 专辑表创建成功');

    // 9. 创建章节表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        album_id VARCHAR(50) NOT NULL COMMENT '专辑ID',
        title VARCHAR(100) NOT NULL COMMENT '章节标题',
        subtitle VARCHAR(200) DEFAULT '' COMMENT '副标题',
        content TEXT COMMENT '章节内容',
        completed_count INT DEFAULT 0 COMMENT '已完成微课数',
        locked TINYINT(1) DEFAULT 1 COMMENT '是否锁定',
        \`order\` INT DEFAULT 0 COMMENT '排序',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        INDEX idx_album_id (album_id),
        INDEX idx_order (\`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节表';
    `);
    console.log('✅ 答案表创建成功');

    // 10. 创建学习进度表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        chapter_id INT NOT NULL COMMENT '章节ID',
        completed TINYINT(1) DEFAULT 0 COMMENT '是否完成',
        completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_chapter (user_id, chapter_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习进度表';
    `);
    console.log('✅ 学习进度表创建成功');

    console.log('🎉 所有数据库表创建成功！');
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
    throw error;
  }
};

// 运行迁移
const runMigration = async () => {
  try {
    await createTables();
    console.log('✅ 数据库迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
};

runMigration();
