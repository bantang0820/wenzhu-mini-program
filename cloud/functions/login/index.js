// 云函数：处理用户登录
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { code } = event;

  try {
    // 调用微信接口获取openid
    const result = await cloud.openapi.auth.code2Session({
      appId: cloud.getEnvContext().APPID,
      secret: cloud.getEnvContext().SECRET,
      jsCode: code
    });

    return {
      openid: result.openid,
      sessionKey: result.sessionKey,
      unionid: result.unionid || null
    };
  } catch (err) {
    console.error('登录失败', err);
    return {
      error: err.errMsg || '登录失败'
    };
  }
};
