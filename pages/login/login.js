// pages/login/login.js
const app = getApp();

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 检查是否已经登录
    const openid = wx.getStorageSync('openid');
    if (openid) {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 处理一键登录
  async handleQuickLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    wx.showLoading({ title: '正在开启...', mask: true });

    try {
      // 1. 调用云函数获取 OpenID (静默登录)
      const loginRes = await wx.cloud.callFunction({
        name: 'login'
      });

      if (!loginRes.result || !loginRes.result.openid) {
        throw new Error('登录失败，请重试');
      }

      const { openid } = loginRes.result;

      // 2. 将 OpenID 存入本地缓存
      wx.setStorageSync('openid', openid);
      app.globalData.openid = openid;

      // 3. 同步用户信息 (由于目前 getUserProfile 限制，先注册静默账号)
      const syncRes = await wx.cloud.callFunction({
        name: 'syncUserProfile',
        data: {
          userInfo: {
            nickname: '正念家长',
            avatarUrl: ''
          }
        }
      });

      if (syncRes.result && syncRes.result.success) {
        app.globalData.userInfo = syncRes.result.user;
        app.globalData.isMember = syncRes.result.user.is_vip || false;
      }

      wx.hideLoading();
      this.setData({ loading: false });

      // 4. 成功跳转
      wx.showToast({
        title: '欢迎回来',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('登录流程出错', err);
      wx.showToast({
        title: err.message || '开启失败，请重试',
        icon: 'none'
      });
    }
  }
});
