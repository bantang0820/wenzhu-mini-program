// app.js
// 引入 API 工具
const api = require('./utils/api.js');
const apiConfig = require('./config/api.js');

App({
  onLaunch() {
    // 1. 配置 API
    if (typeof wx === 'undefined') {
      // 开发环境，使用模拟 wx 对象
      global.wx = {
        cloud: api, // 使用 API 工具替换 wx.cloud
        getStorageSync: (key) => global.wx_mock_storage?.[key] || '',
        setStorageSync: (key, value) => {
          if (!global.wx_mock_storage) global.wx_mock_storage = {};
          global.wx_mock_storage[key] = value;
        },
        removeStorageSync: (key) => {
          if (global.wx_mock_storage) delete global.wx_mock_storage[key];
        }
      };
    } else {
      // 小程序环境，替换 wx.cloud 为 API 工具
      wx.cloud = api;
    }

    // 初始化云开发（API 模式）
    wx.cloud.init && wx.cloud.init({
      env: 'production',
      traceUser: true,
    });

    console.log('[App] 使用真实后端 API');
    console.log('[App] API 地址:', apiConfig.baseURL);

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
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');

    if (!token || !openid) return;

    this.globalData.openid = openid;

    // 尝试同步云端状态
    try {
      const res = await wx.cloud.callFunction({
        name: 'syncUserProfile',
        data: { userInfo: {} } // 仅同步，不更新
      });

      if (res.result && res.result.success) {
        this.globalData.userInfo = res.result.user;
        this.globalData.isMember = res.result.user.isVip || false;
        console.log('同步云端状态成功:', this.globalData.isMember);
      }
    } catch (err) {
      console.error('静默状态同步失败', err);
    }
  }
});
