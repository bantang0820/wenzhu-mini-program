// 云函数：检查用户会员状态
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { openid } = event;

  try {
    // 查询用户
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      return { isMember: false };
    }

    const userId = userRes.data[0]._id;

    // 查询有效的会员记录
    const now = new Date();
    const membershipRes = await db.collection('memberships')
      .where({
        userId: userId,
        status: 'active',
        endDate: db.command.gte(now)
      })
      .orderBy('endDate', 'desc')
      .get();

    return {
      isMember: membershipRes.data.length > 0,
      membership: membershipRes.data.length > 0 ? membershipRes.data[0] : null
    };
  } catch (err) {
    console.error('检查会员状态失败', err);
    return {
      isMember: false,
      error: err.errMsg
    };
  }
};
