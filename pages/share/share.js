// pages/share/share.js
const shareCards = require('../../utils/shareCards.js');

Page({
  data: {
    cardConfig: {}, // 卡片配置
    scenarioId: '', // 场景ID
    cardId: '', // 卡片ID
    hasShared: false, // 是否已分享
    hasIllustration: false, // 是否有插画图片
    unlockedScenarios: [] // 已解锁的场景
  },

  onLoad(options) {
    const { scenarioId } = options;
    this.setData({
      scenarioId: scenarioId
    });

    // 加载已解锁的场景
    this.loadUnlockedScenarios();

    // 获取分享卡片配置
    const cardConfig = shareCards.getShareCardByScenarioId(scenarioId);

    if (cardConfig) {
      this.setData({
        cardConfig: cardConfig,
        cardId: cardConfig.id
      });

      // 检测是否有插画图片
      this.checkIllustration(cardConfig.id);
    } else {
      // 如果没有对应的卡片，使用默认卡片
      this.setData({
        cardConfig: shareCards.shareCards.procrastination,
        cardId: 'procrastination'
      });
      this.checkIllustration('procrastination');
    }
  },

  // 检测是否有插画图片
  checkIllustration(cardId) {
    const imagePath = `/images/share-cards/${cardId}.png`;

    wx.getFileInfo({
      filePath: imagePath,
      success: () => {
        // 图片存在
        this.setData({
          hasIllustration: true
        });
        console.log('插画图片存在');
      },
      fail: () => {
        // 图片不存在，使用CSS图形
        this.setData({
          hasIllustration: false
        });
        console.log('插画图片不存在，使用CSS图形');
      }
    });
  },

  // 加载已解锁的场景
  loadUnlockedScenarios() {
    const unlocked = wx.getStorageSync('unlockedScenarios') || [];
    this.setData({
      unlockedScenarios: unlocked
    });
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },

  // 分享给微信好友
  onShareToWechat() {
    const { cardConfig, scenarioId } = this.data;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 触发分享
    wx.shareAppMessage({
      title: cardConfig.title,
      path: '/pages/index/index?from=' + (scenarioId || 'share'),
      imageUrl: '', // 可以生成卡片图片
      success: (res) => {
        console.log('分享成功', res);
        this.handleShareSuccess();
      },
      fail: (err) => {
        console.log('分享失败', err);
        // 宽松策略：即使失败也给奖励
        this.handleShareSuccess();
      }
    });
  },

  // 分享到朋友圈
  onShareToMoments() {
    const { cardConfig } = this.data;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline']
    });

    wx.shareAppMessage({
      title: cardConfig.title,
      path: '/pages/index/index?from=share',
      imageUrl: '',
      success: (res) => {
        console.log('分享到朋友圈成功', res);
        this.handleShareSuccess();
      },
      fail: (err) => {
        console.log('分享到朋友圈失败', err);
        // 宽松策略：即使失败也给奖励
        this.handleShareSuccess();
      }
    });
  },

  // 处理分享成功
  handleShareSuccess() {
    const { unlockedScenarios, cardConfig } = this.data;

    // 检查是否已经解锁过
    if (unlockedScenarios.includes(cardConfig.unlockScenarioId)) {
      wx.showToast({
        title: '分享成功！',
        icon: 'success',
        duration: 2000
      });
      return;
    }

    // 解锁新场景
    this.unlockScenario(cardConfig.unlockScenarioId);
  },

  // 解锁场景
  unlockScenario(scenarioId) {
    const { unlockedScenarios } = this.data;

    // 添加到已解锁列表
    unlockedScenarios.push(scenarioId);

    // 保存到本地存储
    wx.setStorageSync('unlockedScenarios', unlockedScenarios);

    // 显示成功提示
    wx.showModal({
      title: '🎉 恭喜！',
      content: '分享成功！已解锁"吃饭慢"场景',
      showCancel: false,
      confirmText: '太好了',
      success: () => {
        // 返回首页或详情页
        setTimeout(() => {
          wx.navigateBack({
            delta: 2
          });
        }, 500);
      }
    });

    this.setData({
      unlockedScenarios: unlockedScenarios,
      hasShared: true
    });
  },

  // 分享配置（供微信调用）
  onShareAppMessage() {
    const { cardConfig } = this.data;
    return {
      title: cardConfig.title,
      path: '/pages/index/index?from=share',
      imageUrl: ''
    };
  },

  // 分享到朋友圈配置
  onShareTimeline() {
    const { cardConfig } = this.data;
    return {
      title: cardConfig.title,
      query: 'from=share',
      imageUrl: ''
    };
  }
});
