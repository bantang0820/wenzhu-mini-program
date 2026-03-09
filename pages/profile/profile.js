// pages/profile/profile.js - 本心（个人中心）
const app = getApp();

Page({
  data: {
    // ========== 用户信息 ==========
    userInfo: {
      avatar: '',
      nickname: '正念家长',
      level: 1,
      levelName: '觉察者'
    },

    // ========== 等级系统 ==========
    levelSystem: [
      { level: 1, name: '觉察者', minDays: 0, desc: '刚开始觉察自己的情绪' },
      { level: 2, name: '实践者', minDays: 8, desc: '坚持一周以上' },
      { level: 3, name: '引导者', minDays: 31, desc: '坚持一个月以上' },
      { level: 4, name: '协助者', minDays: 101, desc: '持续修习100天以上' }
    ],

    // ========== 统计数据 ==========
    stats: {
      totalDays: 0,
      totalEnergy: 0,
      totalScenarios: 0,
      currentStreak: 0
    },

    // ========== 功能列表 ==========
    menuList: [
      {
        id: 'redeem',
        icon: '🎁',
        title: '兑换中心',
        desc: '输入兑换码，领取权益',
        arrow: true
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: '朗读设置',
        desc: '背景音量、人声大小',
        arrow: true
      },
      {
        id: 'reminder',
        icon: '🔔',
        title: '提醒设置',
        desc: '每天提醒我稳住',
        arrow: true
      },
      {
        id: 'feedback',
        icon: '💌',
        title: '意见反馈',
        desc: '告诉开发者',
        arrow: true
      },
      {
        id: 'about',
        icon: '📜',
        title: '关于稳住',
        desc: '初心故事',
        arrow: true
      }
    ],

    // ========== Pro 状态 ==========
    isPro: false,
    proExpireDays: 0,
    expireDate: '', // 过期日期（格式：2026.05.20）
    isExpiring: false, // 是否即将过期（小于7天）

    loading: true,

    // ========== 基础设置数据 ==========
    audioSettings: {
      bgVolume: 50,
      voiceVolume: 80
    },
    reminderSettings: {
      enabled: false,
      time: '08:00'
    },
    feedbackContent: '',
    contactInfo: ''
  },

  onLoad() {
    this.initData();
    this.loadSettings();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadUserData();
  },

  initData() {
    this.loadUserData();
    this.loadUserInfo();
    this.checkProStatus();
    this.setData({ loading: false });
  },

  // 加载本地保存的设置
  loadSettings() {
    const audioSettings = wx.getStorageSync('audioSettings') || { bgVolume: 50, voiceVolume: 80 };
    const reminderSettings = wx.getStorageSync('reminderSettings') || { enabled: false, time: '08:00' };
    this.setData({ audioSettings, reminderSettings });
  },

  // ========== 加载用户数据 ==========
  loadUserData() {
    const totalDays = wx.getStorageSync('totalDays') || 0;
    const totalEnergy = wx.getStorageSync('totalEnergy') || 0;
    const totalScenarios = wx.getStorageSync('totalScenarios') || 0;
    const currentStreak = wx.getStorageSync('currentStreak') || 0;

    this.setData({
      stats: {
        totalDays,
        totalEnergy,
        totalScenarios,
        currentStreak
      }
    });

    // 计算等级
    this.calculateLevel(totalDays);
  },

  // 计算用户等级
  calculateLevel(totalDays) {
    let userLevel = 1;
    let levelName = '觉察者';

    if (totalDays >= 101) {
      userLevel = 4;
      levelName = '协助者';
    } else if (totalDays >= 31) {
      userLevel = 3;
      levelName = '引导者';
    } else if (totalDays >= 8) {
      userLevel = 2;
      levelName = '实践者';
    }

    this.setData({
      'userInfo.level': userLevel,
      'userInfo.levelName': levelName
    });
  },

  // ========== 加载用户信息 ==========
  loadUserInfo() {
    // 从本地存储读取用户信息
    const userInfo = wx.getStorageSync('userInfo');

    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  // ========== 检查 Pro 状态 ==========
  checkProStatus() {
    const isPro = app.globalData.isMember || false;
    const proExpireTime = (app.globalData.userInfo && app.globalData.userInfo.vip_expire_time) 
      ? new Date(app.globalData.userInfo.vip_expire_time).getTime() 
      : (wx.getStorageSync('proExpireTime') || 0);

    let proExpireDays = 0;
    let expireDate = '';
    let isExpiring = false;

    if (isPro && proExpireTime > 0) {
      const now = Date.now();
      const remaining = proExpireTime - now;
      proExpireDays = Math.ceil(remaining / (1000 * 60 * 60 * 24));

      // 计算是否即将过期（小于7天）
      isExpiring = proExpireDays <= 7 && proExpireDays > 0;

      // 格式化过期日期
      const expireDateObj = new Date(proExpireTime);
      const year = expireDateObj.getFullYear();
      const month = String(expireDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(expireDateObj.getDate()).padStart(2, '0');
      expireDate = `${year}.${month}.${day}`;
    }

    this.setData({
      isPro,
      proExpireDays,
      expireDate,
      isExpiring
    });
  },

  // ========== 交互事件 ==========

  // 点击会员卡
  onMemberCardTap() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateTo({
      url: '/pages/pro/pro'
    });
  },

  // 点击菜单项
  onMenuTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.vibrateShort({ type: 'light' });

    switch (id) {
      case 'redeem':
        wx.showModal({
          title: '兑换中心',
          placeholderText: '请输入 12 位兑换码',
          editable: true,
          confirmText: '立即兑换',
          confirmColor: '#D4AF37',
          success: (res) => {
            if (res.confirm && res.content) {
              this.handleRedeem(res.content.trim());
            }
          }
        });
        break;
      // ... 其他 case 保持不变 ...

      case 'settings':
        this.setData({
          showSettings: true,
          modalType: 'settings',
          modalTitle: '朗读设置'
        });
        break;

      case 'reminder':
        this.setData({
          showSettings: true,
          modalType: 'reminder',
          modalTitle: '提醒设置'
        });
        break;

      case 'feedback':
        this.setData({
          showSettings: true,
          modalType: 'feedback',
          modalTitle: '意见反馈',
          feedbackContent: '',
          contactInfo: ''
        });
        break;

      case 'about':
        this.setData({
          showSettings: true,
          modalType: 'about',
          modalTitle: '关于稳住'
        });
        break;
    }
  },

  // 点击等级说明
  onLevelInfo() {
    const { levelName } = this.data.userInfo;
    wx.showModal({
      title: '等级说明',
      content: `当前等级：${levelName}\n\n坚持修习，提升等级，解锁更多权益。`,
      showCancel: false
    });
  },

  // 点击邀请有礼
  onShareInvite() {
    wx.vibrateShort({ type: 'light' });

    // 生成分享内容
    const shareContent = {
      title: '带娃崩溃时，我用这个小程序稳住了自己',
      path: '/pages/index/index',
      imageUrl: '' // TODO: 分享海报图片
    };

    // 唤起微信分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    wx.showToast({
      title: '点击右上角分享给好友',
      icon: 'none',
      duration: 2000
    });

    // 保存分享内容供分享时使用
    this.setData({
      shareContent
    });
  },

  // 执行兑换逻辑
  async handleRedeem(code) {
    if (!code) return;

    wx.showLoading({ title: '正在兑换...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'redeemMembership',
        data: { code }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        // 更新全局会员状态
        app.globalData.isMember = true;
        if (app.globalData.userInfo) {
          app.globalData.userInfo.is_vip = true;
          // 这里的过期时间建议从接口返回的 expireDate 处理，或者直接刷新登录状态
        }
        
        // 尝试重新同步一次云端状态以确保全量数据更新
        app.checkLoginStatus();

        wx.showModal({
          title: '兑换成功',
          content: `一年的 Pro 会员已生效\n有效期至：${res.result.expireDate}`,
          showCancel: false,
          confirmText: '太棒了',
          confirmColor: '#D4AF37',
          success: () => {
            // 刷新当前页面状态
            this.checkProStatus();
          }
        });
      } else {
        wx.showToast({
          title: res.result.msg || '兑换失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('兑换接口调用失败', err);
      wx.showToast({
        title: '系统繁忙，请稍后再试',
        icon: 'none'
      });
    }
  },

  // ========== 设置相关逻辑 ==========
  closeSettings() {
    this.setData({ showSettings: false });
  },

  stopBubble() {
    // 阻止点击弹窗内容时关闭弹窗
  },

  onBgVolumeChange(e) {
    this.setData({ 'audioSettings.bgVolume': e.detail.value });
  },

  onVoiceVolumeChange(e) {
    this.setData({ 'audioSettings.voiceVolume': e.detail.value });
  },

  onReminderToggle(e) {
    const enabled = e.detail.value;
    if (enabled) {
      // 尝试请求订阅消息权限
      this.requestSubscribe();
    }
    this.setData({ 'reminderSettings.enabled': enabled });
  },

  onReminderTimeChange(e) {
    this.setData({ 'reminderSettings.time': e.detail.value });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contactInfo: e.detail.value });
  },

  async submitFeedback() {
    const { feedbackContent, contactInfo } = this.data;
    if (!feedbackContent.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      const db = wx.cloud.database();
      await db.collection('feedbacks').add({
        data: {
          content: feedbackContent,
          contact: contactInfo,
          create_time: db.serverDate(),
          userInfo: this.data.userInfo || {}
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '感谢您的反馈', icon: 'success' });
      this.closeSettings();
    } catch (err) {
      wx.hideLoading();
      console.error('提交反馈失败', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  },

  async requestSubscribe() {
    // 这里放订阅消息 ID，暂时仅做演示
    const TEMPLATE_ID = 'your-template-id'; 
    try {
      await wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID]
      });
    } catch (err) {
      console.log('订阅消息授权失败', err);
    }
  },

  saveAndClose() {
    wx.setStorageSync('audioSettings', this.data.audioSettings);
    wx.setStorageSync('reminderSettings', this.data.reminderSettings);
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
    
    this.closeSettings();
  },

  // 处理用户区域点击（登录/同步）
  handleUserClick() {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    } else {
      // 已经登录了，可以提示同步信息或查看详情
      wx.showToast({
        title: '个人信息已同步',
        icon: 'none'
      });
    }
  },

  // 分享给好友
  onShareAppMessage() {
    const { shareContent } = this.data;
    return {
      title: shareContent.title || '传递稳住的力量',
      path: shareContent.path || '/pages/index/index',
      imageUrl: shareContent.imageUrl || ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { shareContent } = this.data;
    return {
      title: shareContent.title || '传递稳住的力量',
      query: '',
      imageUrl: shareContent.imageUrl || ''
    };
  }
});
