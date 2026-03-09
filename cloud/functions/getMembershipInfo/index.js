// 云函数：获取用户会员信息
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { openid } = event;

  try {
    // 查询用户
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      return { membership: null };
    }

    const userId = userRes.data[0]._id;

    // 查询会员记录（包括已过期的，按时间倒序）
    const membershipRes = await db.collection('memberships')
      .where({ userId })
      .orderBy('endDate', 'desc')
      .limit(1)
      .get();

    if (membershipRes.data.length === 0) {
      return { membership: null };
    }

    const membership = membershipRes.data[0];
    const now = new Date();
    const endDate = new Date(membership.endDate);

    // 判断会员是否有效
    const isActive = membership.status === 'active' && endDate >= now;

    // 计算剩余天数
    const remainingDays = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));

    return {
      membership: {
        ...membership,
        isActive,
        remainingDays: Math.max(0, remainingDays)
      }
    };
  } catch (err) {
    console.error('获取会员信息失败', err);
    return {
      membership: null,
      error: err.errMsg
    };
  }
};
