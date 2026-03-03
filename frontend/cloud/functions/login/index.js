// 云函数：login
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 获取用户的 OpenID
 */
exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();

  return {
    openid: OPENID,
    appid: APPID,
    unionid: UNIONID,
  };
}
