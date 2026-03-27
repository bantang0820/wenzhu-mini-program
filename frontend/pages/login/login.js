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
    privacyContractName: '《隐私政策》',
    forceLogin: false,
    privacyChecked: false,
    privacyShake: ''
  },

  onLoad(options = {}) {
    this.redirectTarget = this.ensureAbsolutePagePath(options.redirect ? decodeURIComponent(options.redirect) : '');
    this.loginSource = options.from || ''; // 记录来源页面
    this.loginScene = options.scene || '';
    this.loginInFlight = false;
    this.forceLogin = options.force === '1';

    if (this.forceLogin && typeof app.clearAuthSession === 'function') {
      app.clearAuthSession();
    }

    this.setData({
      forceLogin: this.forceLogin
    });

    if (!this.forceLogin) {
      this.redirectIfLoggedIn();
    }
    this.initPrivacySetting();
  },

  onShow() {
    if (!this.forceLogin) {
      this.redirectIfLoggedIn();
    }
  },

  ensureAbsolutePagePath(target = '') {
    if (!target) return '';
    return target.startsWith('/') ? target : `/${target}`;
  },

  redirectIfLoggedIn() {
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    if (token && openid) {
      this.navigateAfterLogin();
    }
  },

  normalizeTargetPath(target = '') {
    return this.ensureAbsolutePagePath((target || '').split('?')[0]);
  },

  openTargetPage(target, targetPath) {
    const safeTarget = this.ensureAbsolutePagePath(target);

    if (TAB_BAR_PAGES.includes(targetPath)) {
      wx.switchTab({ url: targetPath });
      return;
    }

    wx.reLaunch({
      url: safeTarget,
      fail: (error) => {
        console.warn('reLaunch 跳转失败，改用 redirectTo', error);
        wx.redirectTo({ url: safeTarget });
      }
    });
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

  onPrivacyCheckboxChange(e) {
    const checked = e.detail.value.includes('privacy');
    this.setData({ privacyChecked: checked });
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
    this.startQuickLoginFlow();
  },

  onAgreePrivacyAuthorization() {
    this.setData({ needPrivacyAuthorization: false });
    this.startQuickLoginFlow();
  },

  showPrivacyAgreementReminder() {
    wx.vibrateShort({
      type: 'heavy'
    });
    this.setData({ privacyShake: 'shake' });
    setTimeout(() => {
      this.setData({ privacyShake: '' });
    }, 500);
    wx.showModal({
      title: '请先勾选协议',
      content: '登录前需要先勾选《服务协议》和隐私政策。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  async ensureLoginPrivacyAuthorized() {
    if (!this.data.needPrivacyAuthorization) {
      return true;
    }

    if (app && typeof app.ensurePrivacyAuthorization === 'function') {
      const authorized = await app.ensurePrivacyAuthorization();
      if (authorized) {
        this.setData({ needPrivacyAuthorization: false });
        return true;
      }
    }

    wx.showToast({
      title: '请先完成隐私授权',
      icon: 'none',
      duration: 2000
    });
    return false;
  },

  async startQuickLoginFlow() {
    if (this.data.loading || this.loginInFlight) return;

    if (!this.data.privacyChecked) {
      this.showPrivacyAgreementReminder();
      return;
    }

    const privacyAuthorized = await this.ensureLoginPrivacyAuthorized();
    if (!privacyAuthorized) return;

    this.handleQuickLogin();
  },

  // 处理一键登录
  async handleQuickLogin() {
    if (this.data.loading || this.loginInFlight) return;

    this.loginInFlight = true;
    this.setData({ loading: true });
    wx.showLoading({ title: '正在登录...', mask: true });

    try {
      // 1. 获取微信登录凭证 code
      const code = await this.getWechatLoginCode();

      // 2. 调用后端登录/注册接口
      const loginRes = await api.post('/auth/wechat-login', { code }, false, true);
      const loginData = loginRes.data || {};

      if (!loginRes.success || !loginData.openid || !loginData.token) {
        throw new Error(loginRes.error || '登录失败，请重试');
      }

      const { openid, token } = loginData;
      const loginUser = (app.normalizeUserProfile && loginData.user)
        ? app.normalizeUserProfile(loginData.user)
        : (loginData.user || {});

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
        const syncRes = await api.post(
          '/auth/sync-profile',
          {
            userInfo: {
              nickname: loginUser.nickname || '正念家长',
              avatarUrl: loginUser.avatarUrl || loginUser.avatar_url || ''
            }
          },
          true,
          true
        );

        if (syncRes.success && syncRes.data && syncRes.data.user) {
          const syncedUser = typeof app.normalizeUserProfile === 'function'
            ? app.normalizeUserProfile(syncRes.data.user)
            : syncRes.data.user;

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

      let inviteResult = null;
      if (typeof app.processPendingInvite === 'function') {
        inviteResult = await app.processPendingInvite({ silent: true });
      }

      // 5. 成功跳转
      wx.showToast({
        title: inviteResult && inviteResult.rewarded ? `已获${inviteResult.rewardDays || 3}天Pro` : '欢迎回来',
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
      this.loginInFlight = false;
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  navigateAfterLogin() {
    const hasPendingRedeem = !!wx.getStorageSync(PENDING_REDEEM_CODE_KEY);
    const target = hasPendingRedeem
      ? '/pages/profile/profile'
      : (this.redirectTarget || '/pages/index/index');
    const targetPath = this.normalizeTargetPath(target);
    const pageStack = getCurrentPages();
    const previousPage = pageStack.length > 1 ? pageStack[pageStack.length - 2] : null;
    const previousPath = previousPage ? `/${previousPage.route}` : '';

    // 检查是否从card页面来登录的
    const fromCard = this.loginSource === 'card';

    if (previousPath && previousPath === targetPath) {
      // 如果是从card页面来的，使用redirectTo并带上from=login参数
      if (fromCard) {
        wx.redirectTo({
          url: `${targetPath}?from=login`,
          fail: () => {
            // 如果redirectTo失败，尝试navigateBack
            wx.navigateBack({
              delta: 1,
              fail: () => {
                this.openTargetPage(target, targetPath);
              }
            });
          }
        });
        return;
      }

      // 正常返回上一页
      wx.navigateBack({
        delta: 1,
        fail: () => {
          this.openTargetPage(target, targetPath);
        }
      });
      return;
    }

    this.openTargetPage(targetPath, targetPath);
  }
});
