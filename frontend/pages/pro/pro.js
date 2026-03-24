const api = require('../../utils/api.js');
const app = getApp();

const ANNUAL_PRODUCT_TYPE = 'annual';
const LOGIN_REDIRECT_PRO = '/pages/pro/pro';
const SESSION_EXPIRED_HINT = '登录态已过期';

Page({
  data: {
    isPro: false,
    loading: false
  },

  onLoad() {
    console.log('=== Pro 页面 onLoad ===');
    console.log('当前文件: frontend/pages/pro/pro.js (新版支付)');

    this.syncMembershipView();
  },

  onShow() {
    this.syncMembershipView();
  },

  syncMembershipView() {
    this.setData({
      isPro: !!app.globalData.isMember
    });
  },

  redirectToLogin(force = false) {
    if (force && typeof app.clearAuthSession === 'function') {
      app.clearAuthSession();
    }

    const forceQuery = force ? '&force=1' : '';
    wx.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(LOGIN_REDIRECT_PRO)}&scene=membership-pay${forceQuery}`
    });
  },

  // 立即开通 - 调用虚拟支付
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
        this.redirectToLogin(false);
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
      console.log('订单号:', orderNo);

      // 2. 从后端获取虚拟支付签名参数
      const signRes = await api.post(
        '/virtual-payment/create',
        {
          productType: ANNUAL_PRODUCT_TYPE,
          orderNo
        },
        true
      );

      wx.hideLoading();

      console.log('支付签名接口返回:', signRes);

      if (!signRes.success || !signRes.data) {
        throw new Error(signRes.error || '获取支付签名失败');
      }

      const { signData, paySig, signature, mode } = signRes.data;
      console.log('=== 调试信息 ===');
      console.log('解构后的 signData:', signData);
      console.log('解构后的 paySig:', paySig);
      console.log('解构后的 signature:', signature);
      console.log('支付模式:', mode);
      console.log('paySig 类型:', typeof paySig);
      console.log('paySig 长度:', paySig ? paySig.length : 'undefined');

      // 3. 调起虚拟支付
      if (!paySig || typeof paySig !== 'string') {
        console.error('❌ paySig 无效，无法调起支付');
        wx.showModal({
          title: '调试信息',
          content: `paySig: ${paySig}, 类型: ${typeof paySig}`,
          showCancel: false
        });
        return;
      }

      wx.requestVirtualPayment({
        mode: mode || 'short_series_goods',
        env: signData.env,                  // 环境配置
        signData: JSON.stringify(signData), // signData必须是JSON字符串
        paySig: paySig,
        signature: signature,
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
          console.error('虚拟支付失败:', err);
          if (err.errMsg && err.errMsg.includes('cancel')) {
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

      const errorMessage = error && error.message ? error.message : '';
      if (errorMessage.includes(SESSION_EXPIRED_HINT)) {
        wx.showModal({
          title: '请重新登录',
          content: '支付登录状态已过期，需要重新登录一次，然后会自动回到会员开通页面。',
          showCancel: false,
          success: () => {
            this.redirectToLogin(true);
          }
        });
        return;
      }

      wx.showToast({
        title: errorMessage || '支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查支付状态
  async checkPaymentStatus(orderNo, attempt = 0) {
    try {
      const res = await api.post('/virtual-payment/query', { orderNo }, true, true);
      const result = res.data || {};

      if (res.success && (result.trade_state === 'SUCCESS' || result.isPaid)) {
        const token = wx.getStorageSync('token');
        const openid = wx.getStorageSync('openid');
        const cachedUser = wx.getStorageSync('userInfo') || app.globalData.userInfo || {};
        let vipExpireTime = result.vipExpireTime;

        // 先用当前支付查询结果更新本地状态，确保界面及时切换
        app.globalData.isMember = true;
        if (cachedUser) {
          cachedUser.isVip = true;
          cachedUser.vip_expire_time = vipExpireTime;
          cachedUser.vipExpireTime = vipExpireTime;
        }

        // 再向后端同步一次，拿到数据库里最终落库后的会员信息
        try {
          const syncRes = await api.post('/auth/sync-profile', {}, true);
          const latestUser = syncRes?.data?.user;

          if (latestUser) {
            vipExpireTime = latestUser.vipExpireTime || latestUser.vip_expire_time || vipExpireTime;
          }

          if (typeof app.setAuthSession === 'function') {
            app.setAuthSession({
              token,
              openid,
              user: {
                ...cachedUser,
                ...latestUser,
                openid,
                isVip: true,
                vipExpireTime
              }
            });
          }
        } catch (syncError) {
          console.warn('支付成功后刷新会员状态失败', syncError);

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
