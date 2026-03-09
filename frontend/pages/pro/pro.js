const api = require('../../utils/api.js');

Page({
  data: {
    isPro: false,
    loading: false
  },

  onLoad() {
    console.log('=== Pro 页面 onLoad ===');
    console.log('当前文件: frontend/pages/pro/pro.js (新版支付)');
    const app = getApp();
    this.setData({
      isPro: app.globalData.isMember
    });
  },

  // 立即开通 - 直接调用微信支付
  async onPayTap() {
    console.log('=== onPayTap 被调用 ===');
    wx.vibrateShort({ type: 'medium' });

    const app = getApp();
    const openid = wx.getStorageSync('openid');
    const token = wx.getStorageSync('token');
    console.log('当前 openid:', openid);

    if (!openid || !token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 400);
      return;
    }

    this.setData({ loading: true });

    try {
      wx.showLoading({ title: '创建订单...' });

      // 1. 生成订单号
      const orderRes = await api.get('/payment/generate-order-no', null, true);
      if (!orderRes.success) {
        throw new Error('生成订单号失败');
      }

      const orderNo = orderRes.data.orderNo;

      // 2. 创建支付订单
      const payRes = await api.post('/payment/create', {
        openid: openid,
        description: '稳住Pro年卡会员',
        totalAmount: 19900, // 199元 = 19900分
        orderNo: orderNo
      }, true);

      wx.hideLoading();

      if (!payRes.success) {
        throw new Error(payRes.error || '创建支付订单失败');
      }

      const { payParams, prepayId } = payRes.data;

      // 3. 调起微信支付
      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign,
        success: () => {
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });

          // 刷新用户状态
          setTimeout(() => {
            this.checkPaymentStatus(orderNo);
          }, 1000);
        },
        fail: (err) => {
          console.error('支付失败:', err);
          if (err.errMsg.includes('cancel')) {
            wx.showToast({
              title: '已取消支付',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      });

    } catch (error) {
      wx.hideLoading();
      console.error('支付流程错误:', error);
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查支付状态
  async checkPaymentStatus(orderNo) {
    try {
      const res = await api.post('/payment/query', {
        orderNo: orderNo
      }, true);

      if (res.success && res.data.trade_state === 'SUCCESS') {
        // 支付成功，更新会员状态
        const app = getApp();
        app.globalData.isMember = true;
        wx.setStorageSync('isMember', true);

        wx.showModal({
          title: '开通成功',
          content: '恭喜您成为稳住Pro会员！',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        });
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
