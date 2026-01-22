// app.js
App({
  onLaunch() {
    // 1. 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV, 
        traceUser: true,
      });
    }

    // 2. 检查本地登录状态
    this.checkLoginStatus();
  },

  globalData: {
    userInfo: null,
    openid: null,
    isMember: false
  },

  // 检查登录状态
  async checkLoginStatus() {
    const openid = wx.getStorageSync('openid');
    if (!openid) return;

    this.globalData.openid = openid;

    // 尝试同步云端状态
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncUserProfile',
        data: { userInfo: {} } // 仅同步，不更新
      });

      if (res.result && res.result.success) {
        this.globalData.userInfo = res.result.user;
        this.globalData.isMember = res.result.user.is_vip || false;
        console.log('同步云端状态成功:', this.globalData.isMember);
      }
    } catch (err) {
      console.error('静默状态同步失败', err);
    }
  }
});
