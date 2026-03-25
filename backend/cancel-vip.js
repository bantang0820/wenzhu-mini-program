const mysql = require('mysql2/promise');

/**
 * 临时脚本：取消用户会员
 * 用法：node cancel-vip.js <用户ID>
 */

async function cancelMembership(userId) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'mindful_parenting'
  });

  try {
    console.log(`正在取消用户 ${userId} 的会员...`);

    // 查询用户当前状态
    const [users] = await connection.execute(
      'SELECT id, openid, nickname, is_vip, vip_expire_time FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.log('❌ 用户不存在');
      process.exit(1);
    }

    const user = users[0];
    console.log('用户信息：');
    console.log('- ID:', user.id);
    console.log('- 昵称:', user.nickname || '未设置');
    console.log('- openid:', user.openid);
    console.log('- 当前会员状态:', user.is_vip ? '是会员' : '不是会员');
    console.log('- 到期时间:', user.vip_expire_time || '无');

    if (!user.is_vip) {
      console.log('ℹ️ 该用户本来就不是会员');
      process.exit(0);
    }

    // 取消会员
    await connection.execute(
      'UPDATE users SET is_vip = 0, vip_expire_time = NULL WHERE id = ?',
      [userId]
    );

    console.log('✅ 会员已成功取消！');

    // 验证
    const [updated] = await connection.execute(
      'SELECT is_vip, vip_expire_time FROM users WHERE id = ?',
      [userId]
    );

    console.log('新的会员状态：');
    console.log('- 会员:', updated[0].is_vip ? '是' : '否');
    console.log('- 到期时间:', updated[0].vip_expire_time || '无');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 列出所有会员用户
async function listAllMembers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'mindful_parenting'
  });

  try {
    console.log('正在查询所有会员用户...\n');

    const [users] = await connection.execute(
      'SELECT id, openid, nickname, is_vip, vip_expire_time FROM users WHERE is_vip = 1 ORDER BY id DESC'
    );

    if (users.length === 0) {
      console.log('ℹ️ 当前没有会员用户');
      return;
    }

    console.log(`找到 ${users.length} 个会员用户：\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户ID: ${user.id}`);
      console.log(`   昵称: ${user.nickname || '未设置'}`);
      console.log(`   openid: ${user.openid}`);
      console.log(`   到期时间: ${user.vip_expire_time}`);
      console.log('');
    });

    console.log('使用方法：');
    console.log('  node cancel-vip.js <用户ID>');
    console.log('');
    console.log('例如：取消第一个用户');
    console.log(`  node cancel-vip.js ${users[0].id}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 没有参数，列出所有会员
    await listAllMembers();
  } else {
    // 有参数，取消指定用户的会员
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
      console.log('❌ 用户ID必须是数字');
      console.log('');
      console.log('使用方法：');
      console.log('  node cancel-vip.js <用户ID>');
      console.log('');
      console.log('或者不输入参数，查看所有会员：');
      console.log('  node cancel-vip.js');
      process.exit(1);
    }
    await cancelMembership(userId);
  }
}

main();
