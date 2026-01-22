// 云函数：redeemMembership
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 兑换码中心逻辑
 * 1. 验证码合法性、唯一性、使用状态
 * 2. 原子化更新码状态
 * 3. 更新用户 Pro 权益（增加 365 天）
 */
exports.main = async (event, context) => {
  const { code } = event; // 用户输入的码
  const { OPENID } = cloud.getWXContext();

  if (!code || code.length < 8) {
    return { success: false, msg: '请输入正确的兑换码' };
  }

  try {
    // 1. 查找码是否存在且未被使用
    const codeResult = await db.collection('redeem_codes').where({
      code: code.toUpperCase(), // 统一转大写
      status: 0
    }).get();

    if (codeResult.data.length === 0) {
      return { success: false, msg: '兑换码无效或已被使用' };
    }

    const codeInfo = codeResult.data[0];

    // 2. 原子操作更新码状态，防止并发冲突
    const updateCodeRes = await db.collection('redeem_codes').where({
      code: code.toUpperCase(),
      status: 0
    }).update({
      data: {
        status: 1,
        used_by: OPENID,
        used_time: db.serverDate()
      }
    });

    if (updateCodeRes.stats.updated === 0) {
      return { success: false, msg: '兑换码已被他人使用' };
    }

    // 3. 为用户添加会员权益
    // 先获取用户当前过期时间，如果没有或已过期，则从现在开始算；如果在有效期内，则在原有基础上累加
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get();

    let newExpireTime;
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    if (userResult.data.length > 0) {
      const user = userResult.data[0];
      const currentExpire = user.vip_expire_time ? new Date(user.vip_expire_time).getTime() : 0;
      
      if (currentExpire > now) {
        // 续费：在原基础上加一年
        newExpireTime = currentExpire + oneYearMs;
      } else {
        // 新开/已过期：从现在开始算一年
        newExpireTime = now + oneYearMs;
      }

      await db.collection('users').doc(user._id).update({
        data: {
          is_vip: true,
          vip_expire_time: new Date(newExpireTime)
        }
      });
    } else {
      // 用户记录不存在（首次兑换）
      newExpireTime = now + oneYearMs;
      await db.collection('users').add({
        data: {
          openid: OPENID,
          is_vip: true,
          vip_expire_time: new Date(newExpireTime),
          create_time: db.serverDate()
        }
      });
    }

    return { 
      success: true, 
      msg: '兑换成功！',
      expireDate: formatDate(new Date(newExpireTime))
    };

  } catch (e) {
    console.error('兑换出错', e);
    return { success: false, msg: '系统繁忙，请稍后再试' };
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}
