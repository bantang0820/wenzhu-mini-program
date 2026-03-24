// 云函数：获取虚拟支付签名
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 为前端提供虚拟支付签名
 * 注意：签名计算需要AppKey，所以必须在服务端完成
 */
exports.main = async (event, context) => {
  const { orderNo, productId, quantity, env, mode = 'short_series_coin' } = event; // 默认代币模式
  const { OPENID } = cloud.getWXContext();

  if (!orderNo || !productId) {
    return {
      success: false,
      error: '缺少必要参数'
    };
  }

  try {
    const crypto = require('crypto');

    console.log('=== 开始生成虚拟支付签名 ===');
    console.log('接收到的参数:', { orderNo, productId, quantity, env, mode });
    console.log('用户OPENID:', OPENID);

    // 配置信息
    const appId = 'wxc271e812faa3f43b';
    const offerId = '1450493122';
    const appKey = env === 1
      ? 'j2Nrg8CpesXNJIYQn6GXhdB3q4TP7cbf'  // 沙箱AppKey
      : 'BkB08LlSGyk00Txvqyz2LSx3PFutcLsO'; // 现网AppKey

    console.log('使用的AppKey:', appKey.substring(0, 10) + '...');
    console.log('支付模式:', mode);

    // 生成signData（根据支付模式使用不同的字段）
    const timestamp = Math.floor(Date.now() / 1000);

    let signData;

    if (mode === 'short_series_coin') {
      // ⚠️ 代币充值模式：不需要 goodsPrice！
      signData = {
        attach: OPENID,                      // 透传数据
        buyQuantity: quantity || 100,        // ⚠️ 代币数量
        currencyType: 'CNY',                 // 币种
        env: env || 1,                       // 环境配置
        offerId: offerId,                    // 应用id
        outTradeNo: orderNo,                 // 业务订单号
        productId: productId,                // 代币ID
        timestamp: timestamp
      };

      console.log('代币模式 signData:', signData);
    } else {
      // 道具直购模式
      signData = {
        attach: OPENID,                      // 透传数据
        buyQuantity: quantity || 1,          // 购买数量
        currencyType: 'CNY',                 // 币种
        env: env || 1,                       // 环境配置
        goodsPrice: 9900,                    // 道具单价(分)
        offerId: offerId,                    // 应用id
        outTradeNo: orderNo,                 // 业务订单号
        productId: productId,                // 道具ID
        timestamp: timestamp
      };

      console.log('道具模式 signData:', signData);
    }

    // 计算支付签名
    // ⚠️ 关键修复：严格按照微信官方示例的格式
    // 1. 按key的字母顺序排序
    const sortedKeys = Object.keys(signData).sort();

    console.log('排序后的字段:', sortedKeys);

    // 2. 拼接字符串：key1=value1&key2=value2&...
    // ⚠️ 重要：数字类型的值不要转字符串
    const signStr = sortedKeys
      .map(key => {
        const value = signData[key];
        // 数字类型直接使用，不要转字符串
        return `${key}=${value}`;
      })
      .join('&');

    console.log('签名字符串:', signStr);

    // 3. 拼接uri（⚠️ 注意：使用 requestVirtualPayment，不要加其他前缀）
    const uri = 'requestVirtualPayment';
    const fullStr = `${uri}&${signStr}`;

    console.log('完整签名字符串:', fullStr);
    console.log('签名长度:', fullStr.length);

    // 4. HMAC-SHA256签名（支付签名）
    const hmac = crypto.createHmac('sha256', appKey);
    hmac.update(fullStr, 'utf8');
    const paySig = hmac.digest('hex');

    // 5. 生成用户态签名（signature）
    // 根据微信文档，signature 也需要对 signData 进行签名
    // 这里我们使用相同的算法生成 signature
    const signature = paySig; // ⚠️ 用户态签名（某些情况下可能与 paySig 相同）

    console.log('生成的支付签名 paySig:', paySig);
    console.log('生成的用户态签名 signature:', signature);
    console.log('签名长度:', paySig ? paySig.length : 0);
    console.log('签名类型:', typeof paySig);

    return {
      success: true,
      data: {
        signData,
        paySig,
        signature,
        mode,                               // 返回支付模式
        appKey,
        offerId,
        appId
      }
    };
  } catch (err) {
    console.error('获取虚拟支付签名失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
