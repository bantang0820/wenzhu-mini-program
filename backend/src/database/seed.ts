import pool from '../config/database';
import dotenv from 'dotenv';
import { syncScenariosToDatabase } from './sync-scenarios';

dotenv.config();

const seedData = async () => {
  try {
    console.log('🔄 开始插入种子数据...');

    // 1. 同步当前前端场景数据到数据库，避免列表页与详情页标题不一致
    const syncedScenarioCount = await syncScenariosToDatabase();
    console.log(`✅ 已同步${syncedScenarioCount}个场景到数据库`);

    // 2. 插入专辑数据
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

    // 3. 为每个专辑插入10个章节
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

    // 4. 插入一些测试兑换码
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
