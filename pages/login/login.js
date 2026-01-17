// pages/login/login.js
Page({
  data: {
    canIUseGetUserProfile: false
  },

  onLoad() {
    // 检查是否支持 getUserProfile
    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true });
    }

    // 检查是否已登录
    const openid = wx.getStorageSync('openid');
    if (openid) {
      // 已登录，直接跳转首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 获取用户信息并登录
  async onGetUserInfo(e) {
    // 用户拒绝授权
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '登录中...', mask: true });

    try {
      // 1. 获取微信登录code
      const loginRes = await wx.login();

      // 2. 调用云函数进行登录
      const cloudRes = await wx.cloud.callFunction({
        name: 'login',
        data: {
          code: loginRes.code
        }
      });

      if (cloudRes.result.error) {
        throw new Error(cloudRes.result.error);
      }

      const { openid } = cloudRes.result;

      // 3. 保存openid
      wx.setStorageSync('openid', openid);

      // 4. 保存用户信息到数据库
      const saveRes = await wx.cloud.callFunction({
        name: 'saveUserInfo',
        data: {
          openid,
          userInfo: e.detail.userInfo
        }
      });

      if (saveRes.result.error) {
        throw new Error(saveRes.result.error);
      }

      wx.hideLoading();

      // 5. 登录成功，跳转首页
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (err) {
      console.error('登录失败', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
});
