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

    loading: true
  },

  onLoad() {
    this.initData();
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
    const isPro = app.globalData.isPro || false;
    const proExpireTime = wx.getStorageSync('proExpireTime') || 0;

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
    if (this.data.isPro) {
      wx.showToast({
        title: '您已是会员',
        icon: 'none'
      });
    } else {
      wx.showModal({
        title: '升级会员',
        content: '解锁全部场景和专属功能',
        confirmText: '立即升级',
        success: (res) => {
          if (res.confirm) {
            // TODO: 跳转到支付页面
            wx.showToast({
              title: '跳转支付页面',
              icon: 'none'
            });
          }
        }
      });
    }
  },

  // 点击菜单项
  onMenuTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.vibrateShort({ type: 'light' });

    switch (id) {
      case 'redeem':
        wx.showModal({
          title: '兑换中心',
          content: '请输入兑换码（开发中）',
          editable: true,
          placeholderText: '请输入兑换码',
          success: (res) => {
            if (res.confirm && res.content) {
              wx.showToast({
                title: '兑换成功！',
                icon: 'success'
              });
            }
          }
        });
        break;

      case 'settings':
        wx.showToast({
          title: '打开朗读设置',
          icon: 'none'
        });
        // TODO: 跳转到设置页面
        break;

      case 'reminder':
        wx.showToast({
          title: '打开提醒设置',
          icon: 'none'
        });
        // TODO: 跳转到提醒设置页面
        break;

      case 'feedback':
        wx.showToast({
          title: '打开意见反馈',
          icon: 'none'
        });
        // TODO: 跳转到反馈页面
        break;

      case 'about':
        wx.showModal({
          title: '关于稳住',
          content: '正念育儿，先稳住自己，再拥抱孩子。基于非暴力沟通、课题分离和NLP理念，帮助家长觉察情绪，建立更好的亲子关系。',
          showCancel: false
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
