/**
 * 微信虚拟支付前端工具函数
 * 注意：虚拟支付的签名计算需要在云函数中完成，因为需要使用AppKey
 */

const api = require('./api.js');

/**
 * 调起虚拟支付
 * @param {Object} options 支付选项
 * @param {string} options.orderNo 订单号
 * @param {string} options.productId 道具ID
 * @param {number} options.quantity 数量
 * @param {number} options.env 环境 0-正式 1-沙箱
 * @param {string} options.offerId OfferId
 * @param {Function} onSuccess 支付成功回调
 * @param {Function} onFail 支付失败回调
 */
function requestVirtualPayment(options) {
  const {
    orderNo,
    productId,
    quantity = 1,
    env = 1,
    offerId,
    onSuccess,
    onFail
  } = options;

  try {
    // 生成signData（前端只需要提供基本数据，签名由后端计算）
    const signData = {
      appid: 'wxc271e812faa3f43b',
      offer_id: offerId,
      product_id: productId,
      quantity: quantity,
      out_trade_no: orderNo,
      env: env,
      timestamp: Math.floor(Date.now() / 1000)
    };

    console.log('虚拟支付参数:', signData);

    // 调起虚拟支付
    wx.requestVirtualPayment({
      buyQuantity: quantity,
      outTradeNo: orderNo,
      productId: productId,
      env: env,
      signData: signData,
      success: (res) => {
        console.log('虚拟支付成功:', res);
        if (onSuccess) {
          onSuccess(res);
        }
      },
      fail: (err) => {
        console.error('虚拟支付失败:', err);
        if (onFail) {
          onFail(err);
        }
      }
    });
  } catch (error) {
    console.error('调起虚拟支付异常:', error);
    if (onFail) {
      onFail(error);
    }
  }
}

module.exports = {
  requestVirtualPayment
};
