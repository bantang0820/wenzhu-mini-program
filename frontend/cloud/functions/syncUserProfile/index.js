// 云函数：syncUserProfile
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 同步/注册用户信息
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { userInfo } = event; // 包含 nickname, avatarUrl 等

  try {
    // 1. 查询用户是否已存在
    const userResult = await db.collection('users').where({
      openid: OPENID
    }).get();

    if (userResult.data.length > 0) {
      // 2. 已存在，则更新信息（仅更新传入的信息）
      const user = userResult.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          ...userInfo,
          last_login_time: db.serverDate()
        }
      });
      
      return {
        success: true,
        action: 'update',
        user: {
          ...user,
          ...userInfo
        }
      };
    } else {
      // 3. 不存在，则注册新用户
      const newUser = {
        openid: OPENID,
        nickname: userInfo.nickname || '正念家长',
        avatarUrl: userInfo.avatarUrl || '',
        is_vip: false,
        vip_expire_time: null,
        create_time: db.serverDate(),
        last_login_time: db.serverDate(),
        total_days: 0,
        total_count: 0
      };

      const addRes = await db.collection('users').add({
        data: newUser
      });

      return {
        success: true,
        action: 'register',
        user: {
          ...newUser,
          _id: addRes._id
        }
      };
    }
  } catch (e) {
    console.error('同步用户信息失败', e);
    return { success: false, msg: '同步失败' };
  }
}
