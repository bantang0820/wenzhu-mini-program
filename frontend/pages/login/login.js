// pages/login/login.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 检查是否已经登录
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    if (token && openid) {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 获取微信登录 code
  getWechatLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            reject(new Error('获取微信登录凭证失败'));
            return;
          }
          resolve(res.code);
        },
        fail: () => {
          reject(new Error('微信登录失败，请重试'));
        }
      });
    });
  },

  // 处理一键登录
  async handleQuickLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    wx.showLoading({ title: '正在开启...', mask: true });

    try {
      // 1. 获取微信登录凭证 code
      const code = await this.getWechatLoginCode();

      // 2. 调用后端登录/注册接口
      const loginRes = await api.callFunction({
        name: 'login',
        data: { code }
      });

      if (!loginRes.result || !loginRes.result.success || !loginRes.result.openid || !loginRes.result.token) {
        throw new Error(loginRes.result?.error || '登录失败，请重试');
      }

      const { openid, token } = loginRes.result;
      const loginUser = (app.normalizeUserProfile && loginRes.result.user)
        ? app.normalizeUserProfile(loginRes.result.user)
        : (loginRes.result.user || {});

      // 3. 保存登录态
      if (typeof app.setAuthSession === 'function') {
        app.setAuthSession({
          token,
          openid,
          user: {
            ...loginUser,
            openid
          }
        });
      } else {
        wx.setStorageSync('token', token);
        wx.setStorageSync('openid', openid);
        app.globalData.openid = openid;
      }

      // 4. 同步用户信息（补齐昵称/头像）
      const syncRes = await api.callFunction({
        name: 'syncUserProfile',
        data: {
          userInfo: {
            nickname: loginUser.nickname || '正念家长',
            avatarUrl: loginUser.avatarUrl || loginUser.avatar_url || ''
          }
        }
      });

      if (syncRes.result && syncRes.result.success && syncRes.result.user) {
        const syncedUser = typeof app.normalizeUserProfile === 'function'
          ? app.normalizeUserProfile(syncRes.result.user)
          : syncRes.result.user;

        if (typeof app.setAuthSession === 'function') {
          app.setAuthSession({
            token,
            openid,
            user: syncedUser
          });
        } else {
          app.globalData.userInfo = syncedUser;
          app.globalData.isMember = !!(syncedUser.isVip || syncedUser.is_vip);
        }
      }
      this.setData({ loading: false });

      // 5. 成功跳转
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
      this.setData({ loading: false });
      console.error('登录流程出错', err);
      wx.showToast({
        title: err.message || '开启失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
