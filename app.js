// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: 'your-env-id', // TODO: 替换为你的云开发环境ID
          traceUser: true,
        });
        console.log('云开发初始化成功');

        // 【临时禁用】等待云开发开通后再启用
        // 检查登录状态
        // this.checkLoginStatus();
      } catch (e) {
        console.log('云开发初始化失败', e);
      }
    } else {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    isMember: false,
    showPaywall: false // 是否显示付费墙
  },

  // 检查登录状态
  checkLoginStatus() {
    const openid = wx.getStorageSync('openid');

    if (!openid) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    // 已登录，保存openid到globalData
    this.globalData.openid = openid;

    // 检查会员状态
    this.checkMembershipStatus();
  },

  // 检查会员状态
  async checkMembershipStatus() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkMembership',
        data: {
          openid: this.globalData.openid
        }
      });

      this.globalData.isMember = res.result.isMember || false;
      console.log('会员状态:', this.globalData.isMember);
    } catch (err) {
      console.error('检查会员状态失败', err);
      this.globalData.isMember = false;
    }
  }
});
