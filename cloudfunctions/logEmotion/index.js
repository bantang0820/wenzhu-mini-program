// cloudfunctions/logEmotion/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  // 获取传入的数据
  const { scenario_id, scenario_title, duration, timestamp } = event;

  try {
    // 记录情绪日志
    const logResult = await db.collection('emotion_logs').add({
      data: {
        user_id: wxContext.OPENID, // 使用用户的 OPENID
        scenario_id: scenario_id,
        scenario_title: scenario_title || '',
        duration: duration || 0,
        timestamp: timestamp || db.serverDate(),
        weekday: new Date().getDay(),
        created_at: db.serverDate()
      }
    });

    // 返回结果
    return {
      success: true,
      log_id: logResult._id,
      message: '情绪记录成功'
    };

  } catch (error) {
    console.error('记录情绪日志失败', error);

    return {
      success: false,
      error: error.message,
      message: '情绪记录失败'
    };
  }
};
