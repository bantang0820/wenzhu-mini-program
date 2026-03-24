const app = getApp();
const api = require('../../utils/api.js');

const DEFAULT_FORM = {
  nickname: '',
  avatarUrl: ''
};

Page({
  data: {
    loading: true,
    saving: false,
    isLoggedIn: false,
    openid: '',
    form: { ...DEFAULT_FORM }
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.refreshFromGlobal();
    }
  },

  initPage() {
    const token = wx.getStorageSync('token');
    const openid = wx.getStorageSync('openid');
    const isLoggedIn = !!(token && openid);

    this.setData({
      isLoggedIn,
      openid: openid || '',
      loading: false
    });

    if (!isLoggedIn) {
      wx.showModal({
        title: '未登录',
        content: '请先登录后再编辑个人信息',
        confirmText: '去登录',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
      return;
    }

    this.refreshFromGlobal();
    this.fetchLatestUserInfo();
  },

  refreshFromGlobal() {
    const rawUser = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const user = typeof app.normalizeUserProfile === 'function'
      ? app.normalizeUserProfile(rawUser)
      : rawUser;

    this.setData({
      form: {
        nickname: user.nickname || '',
        avatarUrl: user.avatarUrl || user.avatar_url || ''
      }
    });
  },

  async fetchLatestUserInfo() {
    try {
      const res = await api.callFunction({
        name: 'getUserInfo'
      });

      if (!res.result || !res.result.success) {
        return;
      }

      const latestUser = res.result.user || res.result;
      const normalizedUser = typeof app.normalizeUserProfile === 'function'
        ? app.normalizeUserProfile(latestUser)
        : latestUser;

      if (typeof app.setAuthSession === 'function') {
        app.setAuthSession({
          token: wx.getStorageSync('token'),
          openid: wx.getStorageSync('openid'),
          user: normalizedUser
        });
      }

      this.setData({
        form: {
          nickname: normalizedUser.nickname || '',
          avatarUrl: normalizedUser.avatarUrl || normalizedUser.avatar_url || ''
        }
      });
    } catch (error) {
      console.error('获取最新用户信息失败:', error);
    }
  },

  onNicknameInput(e) {
    this.setData({
      'form.nickname': e.detail.value
    });
  },

  onNicknameBlur(e) {
    const nickname = (e?.detail?.value || this.data.form.nickname || '').trim();

    this.setData({
      'form.nickname': nickname
    });

    this.saveProfile(true);
  },

  onChooseAvatar(e) {
    const avatarUrl = e?.detail?.avatarUrl;
    if (!avatarUrl) return;

    this.setData({
      'form.avatarUrl': avatarUrl
    });

    this.saveProfile(true);
  },

  async saveProfile(silent = false) {
    if (!this.data.isLoggedIn || this.data.saving) return;

    const nickname = (this.data.form.nickname || '').trim() || '正念家长';
    const avatarUrl = this.data.form.avatarUrl || '';

    this.setData({ saving: true });
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    try {
      const res = await api.callFunction({
        name: 'syncUserProfile',
        data: {
          userInfo: {
            nickname,
            avatarUrl
          }
        }
      });

      if (!res.result || !res.result.success) {
        throw new Error(res.result?.error || '保存失败，请重试');
      }

      const user = res.result.user || {
        nickname,
        avatarUrl
      };
      const normalizedUser = typeof app.normalizeUserProfile === 'function'
        ? app.normalizeUserProfile(user)
        : user;

      if (typeof app.setAuthSession === 'function') {
        app.setAuthSession({
          token: wx.getStorageSync('token'),
          openid: wx.getStorageSync('openid'),
          user: normalizedUser
        });
      }

      this.setData({
        'form.nickname': normalizedUser.nickname || nickname,
        'form.avatarUrl': normalizedUser.avatarUrl || normalizedUser.avatar_url || avatarUrl
      });

      if (!silent) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  onSaveProfile() {
    this.saveProfile(false);
  },

  onLogoutTap() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#D46A6A',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  logout() {
    if (typeof app.clearAuthSession === 'function') {
      app.clearAuthSession();
    } else {
      wx.removeStorageSync('token');
      wx.removeStorageSync('openid');
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('proExpireTime');
      wx.removeStorageSync('isMember');
    }

    this.setData({
      isLoggedIn: false,
      openid: '',
      form: { ...DEFAULT_FORM }
    });

    wx.showToast({
      title: '已退出登录',
      icon: 'none'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    }, 300);
  },

  onGoLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
});
