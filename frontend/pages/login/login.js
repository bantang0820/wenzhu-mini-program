// pages/login/login.js
const app = getApp();
const api = require('../../utils/api.js');

const PENDING_REDEEM_CODE_KEY = 'pendingRedeemCode';
const TAB_BAR_PAGES = [
  '/pages/index/index',
  '/pages/content/content',
  '/pages/stats/stats',
  '/pages/profile/profile'
];

Page({
  data: {
    loading: false,
    needPrivacyAuthorization: false,
    privacyContractName: '《隐私政策》'
  },

  onLoad(options = {}) {
    this.redirectTarget = options.redirect ? decodeURIComponent(options.redirect) : '';
    this.loginScene = options.scene || '';
    this.redirectIfLoggedIn();
    this.initPrivacySetting();
  },

  onShow() {
    this.redirectIfLoggedIn();
  },

  redirectIfLoggedIn() {
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    if (token && openid) {
      this.navigateAfterLogin();
    }
  },

  initPrivacySetting() {
    if (typeof wx.getPrivacySetting !== 'function') return;

    wx.getPrivacySetting({
      success: (res) => {
        this.setData({
          needPrivacyAuthorization: !!res.needAuthorization,
          privacyContractName: res.privacyContractName || '《隐私政策》'
        });
      },
      fail: (error) => {
        console.warn('获取隐私设置失败', error);
      }
    });
  },

  openPrivacyContract() {
    if (typeof wx.openPrivacyContract !== 'function') {
      wx.showToast({
        title: '当前微信版本过低',
        icon: 'none'
      });
      return;
    }

    wx.openPrivacyContract({
      fail: (error) => {
        console.error('打开隐私协议失败', error);
        wx.showToast({
          title: '暂时无法打开隐私协议',
          icon: 'none'
        });
      }
    });
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
        fail: (error) => {
          reject(new Error(error.errMsg || '微信登录失败，请重试'));
        }
      });
    });
  },

  onQuickLoginTap() {
    if (this.data.loading || this.data.needPrivacyAuthorization) return;
    this.handleQuickLogin();
  },

  onAgreePrivacyAuthorization() {
    this.setData({ needPrivacyAuthorization: false });
    this.handleQuickLogin();
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

      // 4. 非阻塞同步用户信息（不影响主登录流程）
      try {
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
      } catch (syncError) {
        console.warn('同步用户资料失败，但登录已成功', syncError);
      }

      // 5. 成功跳转
      wx.showToast({
        title: '欢迎回来',
        icon: 'success',
        duration: 1200
      });

      setTimeout(() => {
        this.navigateAfterLogin();
      }, 1200);

    } catch (err) {
      console.error('登录流程出错', err);
      wx.showToast({
        title: err.message || '开启失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  navigateAfterLogin() {
    const hasPendingRedeem = !!wx.getStorageSync(PENDING_REDEEM_CODE_KEY);
    const target = hasPendingRedeem
      ? '/pages/profile/profile'
      : (this.redirectTarget || '/pages/index/index');

    if (TAB_BAR_PAGES.includes(target)) {
      wx.switchTab({ url: target });
      return;
    }

    wx.reLaunch({ url: target });
  }
});
