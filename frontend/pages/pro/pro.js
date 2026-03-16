const api = require('../../utils/api.js');
const app = getApp();

const ANNUAL_PRODUCT_TYPE = 'annual';

Page({
  data: {
    isPro: false,
    loading: false
  },

  onLoad() {
    console.log('=== Pro 页面 onLoad ===');
    console.log('当前文件: frontend/pages/pro/pro.js (新版支付)');
    this.setData({
      isPro: !!app.globalData.isMember
    });
  },

  // 立即开通 - 直接调用微信支付
  async onPayTap() {
    console.log('=== onPayTap 被调用 ===');
    wx.vibrateShort({ type: 'medium' });

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
        productType: ANNUAL_PRODUCT_TYPE,
        orderNo: orderNo
      }, true);

      wx.hideLoading();

      if (!payRes.success) {
        throw new Error(payRes.error || '创建支付订单失败');
      }

      const { payParams } = payRes.data;

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

          setTimeout(() => {
            this.checkPaymentStatus(orderNo, 0);
          }, 1200);
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
  async checkPaymentStatus(orderNo, attempt = 0) {
    try {
      const res = await api.post('/payment/query', {
        orderNo: orderNo
      }, true);

      if (res.success && (res.data.trade_state === 'SUCCESS' || res.data.isPaid)) {
        const token = wx.getStorageSync('token');
        const openid = wx.getStorageSync('openid');
        const cachedUser = wx.getStorageSync('userInfo') || app.globalData.userInfo || {};
        const vipExpireTime = res.data.vipExpireTime;

        if (typeof app.setAuthSession === 'function') {
          app.setAuthSession({
            token,
            openid,
            user: {
              ...cachedUser,
              openid,
              isVip: true,
              vipExpireTime
            }
          });
        }

        if (typeof app.checkLoginStatus === 'function') {
          app.checkLoginStatus().catch((syncError) => {
            console.warn('支付成功后刷新会员状态失败', syncError);
          });
        }

        this.setData({
          isPro: true
        });

        let modalContent = '恭喜您成为稳住Pro会员！';

        if (vipExpireTime) {
          const expireDate = new Date(vipExpireTime);
          const year = expireDate.getFullYear();
          const month = String(expireDate.getMonth() + 1).padStart(2, '0');
          const day = String(expireDate.getDate()).padStart(2, '0');
          modalContent = `恭喜您成为稳住Pro会员！\n有效期至：${year}.${month}.${day}`;
        }

        wx.showModal({
          title: '开通成功',
          content: modalContent,
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        });
        return;
      }

      if (attempt < 9) {
        setTimeout(() => {
          this.checkPaymentStatus(orderNo, attempt + 1);
        }, 1800);
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);

      if (attempt < 9) {
        setTimeout(() => {
          this.checkPaymentStatus(orderNo, attempt + 1);
        }, 1800);
      } else {
        wx.showModal({
          title: '支付结果确认中',
          content: '款项已提交，如果没有自动跳转，请稍后到个人中心查看会员状态。',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        });
      }
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
