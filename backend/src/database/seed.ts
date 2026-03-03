import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const seedData = async () => {
  try {
    console.log('🔄 开始插入种子数据...');

    // 1. 插入免费场景（001: 作业拖拉, 002: 晚上不睡）
    await pool.execute(`
      INSERT IGNORE INTO scenarios (id, title, category, modules, stabilize_text, mantras, healing_quote, is_free, is_hero, \`order\`)
      VALUES (
        '001',
        '作业拖拉',
        '焦虑',
        JSON_OBJECT(
          'module1', JSON_ARRAY('承认：看到孩子拖拉时，我内心升起的焦虑和烦躁'),
          'module2', JSON_ARRAY('抽离：这份焦虑来自我内心的恐惧，不是孩子的全部'),
          'module3', JSON_ARRAY('归位：我有能力安顿好自己的情绪，给孩子信任的空间'),
          'module4', JSON_ARRAY('滋养：孩子正在探索自己的节奏，我给予耐心和陪伴'),
          'module5', JSON_ARRAY('整合：我们在拖拉中找到了平衡，共同成长')
        ),
        '稳住：看见即疗愈的开始',
        JSON_ARRAY('慢下来，为了更好地出发', '每个孩子都有自己的节奏', '焦虑改变不了什么，爱可以'),
        '孩子的节奏值得被尊重',
        1,
        1,
        1
      )
    `);
    console.log('✅ 场景001创建成功');

    await pool.execute(`
      INSERT IGNORE INTO scenarios (id, title, category, modules, stabilize_text, mantras, healing_quote, is_free, is_hero, \`order\`)
      VALUES (
        '002',
        '晚上不睡',
        '焦虑',
        JSON_OBJECT(
          'module1', JSON_ARRAY('承认：看到孩子晚上不肯睡，我感到疲惫和无助'),
          'module2', JSON_ARRAY('抽离：我的疲惫是真实的，但不必让它支配我的反应'),
          'module3', JSON_ARRAY('归位：我可以选择用平静的方式，守护孩子的睡眠'),
          'module4', JSON_ARRAY('滋养：良好的睡眠是爱的滋养，我和孩子一起建立'),
          'module5', JSON_ARRAY('整合：在睡前时光里，我们找到了彼此的安宁')
        ),
        '稳住：疲惫中仍有温柔',
        JSON_ARRAY('睡眠是爱的延续', '平静的陪伴是最好的催眠', '孩子需要安心的感觉'),
        '安静的夜晚，最美的陪伴',
        1,
        1,
        2
      )
    `);
    console.log('✅ 场景002创建成功');

    // 2. 插入付费场景（部分示例）
    const paidScenarios = [
      { id: '003', title: '顶嘴反抗', category: '愤怒', order: 3 },
      { id: '004', title: '沉迷游戏', category: '焦虑', order: 4 },
      { id: '005', title: '磨磨蹭蹭', category: '焦虑', order: 5 },
      { id: '006', title: '哭闹不止', category: '无助', order: 6 },
      { id: '007', title: '做事三分钟热度', category: '焦虑', order: 7 },
      { id: '008', title: '容易发脾气', category: '愤怒', order: 8 },
      { id: '009', title: '不听话', category: '愤怒', order: 9 },
      { id: '010', title: '注意力不集中', category: '焦虑', order: 10 }
    ];

    for (const scenario of paidScenarios) {
      await pool.execute(`
        INSERT IGNORE INTO scenarios (id, title, category, modules, stabilize_text, mantras, healing_quote, is_free, is_hero, \`order\`)
        VALUES (?, ?, ?, JSON_OBJECT(
          'module1', JSON_ARRAY('承认：我看到当下的情绪'),
          'module2', JSON_ARRAY('抽离：这份情绪来自我的内心'),
          'module3', JSON_ARRAY('归位：我有能力安顿好自己'),
          'module4', JSON_ARRAY('滋养：爱和理解是最好的回应'),
          'module5', JSON_ARRAY('整合：我们一起成长')
        ), '稳住：此刻即是转机', JSON_ARRAY('爱是最好的答案', '理解源于接纳', '成长需要时间'), '每一个挑战都是成长的机会', 0, 0, ?)
      `, [scenario.id, scenario.title, scenario.category, scenario.order]);
    }
    console.log(`✅ 插入${paidScenarios.length}个付费场景成功`);

    // 3. 插入专辑数据
    const albums = [
      {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: '100修',
        shortDesc: '用理解和尊重建立亲子连接',
        icon: '🌿',
        colorStart: '#6BBF59',
        colorEnd: '#4A7C59',
        tag: '沟通',
        isFree: true,
        order: 1
      },
      {
        id: 'separation',
        title: '课题分离',
        subtitle: '100修',
        shortDesc: '区分责任，放下不必要的负担',
        icon: '🎯',
        colorStart: '#5EC4D8',
        colorEnd: '#3A8C9E',
        tag: '边界',
        isFree: false,
        order: 2
      },
      {
        id: 'emotion',
        title: '情绪管理',
        subtitle: '100修',
        shortDesc: '理解并疏导孩子的情绪',
        icon: '🌊',
        colorStart: '#FF9A56',
        colorEnd: '#E86A33',
        tag: '情绪',
        isFree: false,
        order: 3
      }
    ];

    for (const album of albums) {
      await pool.execute(`
        INSERT IGNORE INTO albums (id, title, subtitle, short_desc, icon, color_start, color_end, tag, is_free, \`order\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [album.id, album.title, album.subtitle, album.shortDesc, album.icon, album.colorStart, album.colorEnd, album.tag, album.isFree ? 1 : 0, album.order]);
    }
    console.log(`✅ 插入${albums.length}个专辑成功`);

    // 4. 为每个专辑插入10个章节
    for (const album of albums) {
      for (let i = 1; i <= 10; i++) {
        const isChapter1Free = i === 1;
        await pool.execute(`
          INSERT IGNORE INTO chapters (album_id, title, subtitle, completed_count, locked, \`order\`)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [album.id, `第${i}课`, `专辑章节${i}`, 0, isChapter1Free ? 0 : 1, i]);
      }
    }
    console.log('✅ 插入章节成功');

    // 5. 插入一些测试兑换码
    const testCodes = [
      'TEST20260001',
      'TEST20260002',
      'TEST20260003',
      'DEMO20260001',
      'DEMO20260002'
    ];

    for (const code of testCodes) {
      await pool.execute(`
        INSERT IGNORE INTO redeem_codes (code, status, type, duration)
        VALUES (?, 0, 'annual', 365)
      `, [code]);
    }
    console.log(`✅ 插入${testCodes.length}个测试兑换码成功`);

    console.log('🎉 所有种子数据插入成功！');
    console.log('\n📝 测试兑换码列表：');
    testCodes.forEach(code => console.log(`   - ${code}`));
  } catch (error) {
    console.error('❌ 插入种子数据失败:', error);
    throw error;
  }
};

// 运行种子数据
const runSeed = async () => {
  try {
    await pool.getConnection();
    await seedData();
    console.log('✅ 种子数据初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    process.exit(1);
  }
};

runSeed();
