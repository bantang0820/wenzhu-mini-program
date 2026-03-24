// app.js
// 引入 API 工具
const api = require('./utils/api.js');
const apiConfig = require('./config/api.js');

const PENDING_INVITER_KEY = 'pendingInviteOpenid';

App({
  onLaunch() {
    // 1. 初始化云开发
    if (!wx.cloud) {
      console.error('[App] wx.cloud 未定义，请使用支持云开发的微信开发者工具');
      return;
    }

    wx.cloud.init({
      env: 'cloud1-2gn3b64i07457528', // 云开发环境ID
      traceUser: true
    });

    console.log('[App] 云开发初始化成功');

    // 2. 配置 API
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

    // 3. 检查本地登录状态
    this.checkLoginStatus();
  },

  globalData: {
    userInfo: null,
    openid: null,
    isMember: false,
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
      this.globalData.isMember = !!normalizedUser.isVip;
      wx.setStorageSync('userInfo', normalizedUser);
      wx.setStorageSync('isMember', !!normalizedUser.isVip);

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

  captureInviteFromOptions(options = {}) {
    const inviter = options.inviter || options.sharerOpenid || '';
    const currentOpenid = wx.getStorageSync('openid');

    if (!inviter || (currentOpenid && currentOpenid === inviter)) {
      return false;
    }

    wx.setStorageSync(PENDING_INVITER_KEY, inviter);
    return true;
  },

  async processPendingInvite({ silent = false } = {}) {
    const inviter = wx.getStorageSync(PENDING_INVITER_KEY);
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');

    if (!inviter || !token || !openid) {
      return null;
    }

    if (inviter === openid) {
      wx.removeStorageSync(PENDING_INVITER_KEY);
      return null;
    }

    try {
      const res = await api.post(
        '/share/handle-invite',
        { sharerOpenid: inviter },
        true,
        true
      );

      if (!res.success) {
        return null;
      }

      wx.removeStorageSync(PENDING_INVITER_KEY);

      const data = res.data || {};
      if (data.friendVipExpireTime) {
        const localUser = this.normalizeUserProfile(
          wx.getStorageSync('userInfo') || this.globalData.userInfo || {}
        );

        this.setAuthSession({
          token,
          openid,
          user: {
            ...localUser,
            openid,
            isVip: true,
            vipExpireTime: data.friendVipExpireTime
          }
        });
      }

      if (!silent && data.message) {
        wx.showToast({
          title: data.rewarded ? `已获${data.rewardDays || 3}天Pro` : data.message,
          icon: 'none',
          duration: 2500
        });
      }

      return data;
    } catch (error) {
      console.error('处理邀请奖励失败', error);
      return null;
    }
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
        await this.processPendingInvite({ silent: true });
        console.log('同步云端状态成功:', this.globalData.isMember);
        return;
      }

      const authError = res.result?.error || '';
      if (/401|未授权|用户不存在/.test(authError)) {
        this.clearAuthSession();
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
