// 云函数：保存用户信息
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { openid, userInfo } = event;

  try {
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length > 0) {
      // 用户已存在，更新信息
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        userId: userRes.data[0]._id,
        isNewUser: false
      };
    } else {
      // 新用户，创建记录
      const createRes = await db.collection('users').add({
        data: {
          openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        userId: createRes._id,
        isNewUser: true
      };
    }
  } catch (err) {
    console.error('保存用户信息失败', err);
    return {
      error: err.errMsg || '保存用户信息失败'
    };
  }
};
