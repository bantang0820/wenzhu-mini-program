// app.js
// 引入 API 工具
const api = require('./utils/api.js');
const apiConfig = require('./config/api.js');

App({
  onLaunch() {
    // 1. 配置 API
    if (typeof wx === 'undefined') {
      // 开发环境，补最小化 storage 能力
      global.wx = {
        getStorageSync: (key) => global.wx_mock_storage?.[key] || '',
        setStorageSync: (key, value) => {
          if (!global.wx_mock_storage) global.wx_mock_storage = {};
          global.wx_mock_storage[key] = value;
        },
        removeStorageSync: (key) => {
          if (global.wx_mock_storage) delete global.wx_mock_storage[key];
        }
      };
    }

    console.log('[App] 使用真实后端 API');
    console.log('[App] API 地址:', apiConfig.baseURL);
    this.globalData.api = api;

    // 2. 检查本地登录状态
    this.checkLoginStatus();
  },

  globalData: {
    userInfo: null,
    openid: null,
    isMember: true, // 强制给测试号开通会员权限
    api: null
  },

  isLoggedIn() {
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    return !!(token && openid);
  },

  // 统一用户字段：兼容后端 camelCase 与旧代码 snake_case
  normalizeUserProfile(rawUser = {}) {
    const source = rawUser.user && typeof rawUser.user === 'object' ? rawUser.user : rawUser;
    const avatarUrl = source.avatarUrl || source.avatar_url || '';
    const vipExpireTime = source.vipExpireTime || source.vip_expire_time || null;
    const isVip = typeof source.isVip === 'boolean'
      ? source.isVip
      : source.is_vip === true || source.is_vip === 1;

    return {
      ...source,
      avatarUrl,
      avatar_url: avatarUrl,
      isVip,
      is_vip: isVip,
      vipExpireTime,
      vip_expire_time: vipExpireTime
    };
  },

  // 持久化并同步登录态
  setAuthSession({ token, openid, user } = {}) {
    if (token) {
      wx.setStorageSync('token', token);
    }

    if (openid) {
      wx.setStorageSync('openid', openid);
      this.globalData.openid = openid;
    }

    if (user) {
      const normalizedUser = this.normalizeUserProfile(user);
      this.globalData.userInfo = normalizedUser;
      this.globalData.isMember = normalizedUser.isVip;
      wx.setStorageSync('userInfo', normalizedUser);

      if (normalizedUser.vip_expire_time) {
        wx.setStorageSync('proExpireTime', new Date(normalizedUser.vip_expire_time).getTime());
      } else {
        wx.removeStorageSync('proExpireTime');
      }
    }
  },

  clearAuthSession() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('openid');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('proExpireTime');
    wx.removeStorageSync('isMember');

    this.globalData.openid = null;
    this.globalData.userInfo = null;
    this.globalData.isMember = false;
  },

  // 检查登录状态
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    const localUser = wx.getStorageSync('userInfo');

    if (!token || !openid) {
      this.clearAuthSession();
      return;
    }

    // 先使用本地缓存，保证离线场景也可进入
    this.setAuthSession({
      token,
      openid,
      user: localUser || { openid }
    });

    // 尝试同步云端状态
    try {
      const res = await api.callFunction({
        name: 'getUserInfo'
      });

      if (res.result && res.result.success) {
        this.setAuthSession({
          token,
          openid,
          user: res.result.user || res.result
        });
        console.log('同步云端状态成功:', this.globalData.isMember);
      }
    } catch (err) {
      console.error('静默状态同步失败', err);
    }
  },

  ensurePrivacyAuthorization() {
    return new Promise((resolve) => {
      if (typeof wx.requirePrivacyAuthorize !== 'function') {
        resolve(true);
        return;
      }

      wx.requirePrivacyAuthorize({
        success: () => resolve(true),
        fail: (error) => {
          console.warn('隐私授权未通过', error);
          resolve(false);
        }
      });
    });
  }
});
