// 云函数：查询虚拟支付订单
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 查询虚拟支付订单状态
 */
exports.main = async (event, context) => {
  const { orderNo, env } = event;
  const { OPENID } = cloud.getWXContext();

  if (!orderNo) {
    return {
      success: false,
      error: '缺少订单号'
    };
  }

  try {
    const appId = 'wxc271e812faa3f43b';
    const offerId = '1450493122';
    const appKey = env === 1
      ? 'j2Nrg8CpesXNJIYQn6GXhdB3q4TP7cbf'  // 沙箱AppKey
      : 'BkB08LlSGyk00Txvqyz2LSx3PFutcLsO'; // 现网AppKey

    // 调用微信虚拟支付API查询订单
    // 首先需要获取access_token
    const appSecret = '3e098c09e000867b29ff95b12d5867f5';

    // 从缓存获取access_token（这里简化处理，实际应该有缓存机制）
    const tokenResult = await cloud.openapi.auth.getAccessToken();

    if (!tokenResult || !tokenResult.access_token) {
      throw new Error('获取access_token失败');
    }

    const accessToken = tokenResult.access_token;

    // 准备查询订单的数据
    const queryData = {
      openid: OPENID,
      env: env || 1,
      order_id: orderNo
    };

    // 计算支付签名
    const sortedKeys = Object.keys(queryData).sort();
    const signStr = sortedKeys
      .map(key => `${key}=${queryData[key]}`)
      .join('&');
    const uri = '/xpay/query_order';
    const fullStr = `${uri}&${signStr}`;
    const hmac = crypto.createHmac('sha256', appKey);
    hmac.update(fullStr, 'utf8');
    const paySig = hmac.digest('base64');

    // 调用微信API
    const url = `https://api.weixin.qq.com/xpay/query_order?access_token=${encodeURIComponent(accessToken)}&pay_sig=${encodeURIComponent(paySig)}`;

    const response = await cloud.openapi.httpclient.request(url, {
      method: 'POST',
      data: queryData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = JSON.parse(response.body);

    console.log('查询订单结果:', result);

    if (result.errcode !== 0) {
      return {
        success: false,
        error: result.errmsg,
        isPaid: false
      };
    }

    const order = result.order;
    const isPaid = order && order.status === 4; // 4-订单已发货

    return {
      success: true,
      data: {
        orderNo,
        isPaid,
        trade_state: isPaid ? 'SUCCESS' : 'NOTPAY',
        transaction_id: order?.wxpay_order_id || order?.wx_order_id || '',
        orderStatus: order?.status,
        order: order
      }
    };
  } catch (err) {
    console.error('查询虚拟支付订单失败:', err);
    return {
      success: false,
      error: err.message,
      isPaid: false
    };
  }
};
