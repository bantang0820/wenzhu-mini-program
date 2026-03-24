// pages/index/index.js - 呼吸之核
const app = getApp();

Page({
  data: {
    scenarios: [], // 所有场景列表
    heroScenarios: [], // Top 6 高频场景
    restScenarios: [], // 其余场景
    isPro: false, // 是否为会员
    loading: true,
    unlockedScenarios: [], // 已解锁的场景ID列表
    selectedId: null, // 当前选中的气泡ID

    // 分享解锁相关
    showShareModal: false, // 是否显示分享解锁弹窗
    pendingScenarioId: null, // 待解锁的场景ID

    // 呼吸动画
    isBreathing: true, // 是否正在呼吸
    isPressed: false, // 是否被按压
    showRipple: false, // 是否显示涟漪
    holdProgress: 0, // 长按进度（0-100）
    holdTimer: null, // 长按定时器
  },

  onLoad(options) {
    console.log('首页 onLoad 执行', options);

    if (options && options.inviter && typeof app.captureInviteFromOptions === 'function') {
      const captured = app.captureInviteFromOptions(options);
      if (captured && typeof app.processPendingInvite === 'function' && app.isLoggedIn()) {
        app.processPendingInvite({ silent: false });
      }
    }

    // 处理分享进入的新用户奖励（+1次机会）
    if (options && options.shareBonus) {
      wx.setStorageSync('hasShareBonus', true);
      wx.showToast({
        title: '好友赠送：获得1次免费朗读机会！',
        icon: 'none',
        duration: 3000
      });
    }

    this.loadUnlockedScenarios();
    this.loadScenarios();
    this.checkProStatus();
  },

  onShow() {
    // 每次显示页面时重新加载已解锁的场景和会员状态
    this.loadUnlockedScenarios();
    this.checkProStatus();
    if (typeof app.processPendingInvite === 'function' && app.isLoggedIn()) {
      app.processPendingInvite({ silent: false });
    }
    // 清除选中状态
    this.setData({
      selectedId: null
    });
    // 启动呼吸动画
    this.setData({
      isBreathing: true
    });
  },

  onReady() {
    // 页面渲染完成后，开始涟漪动画
    setTimeout(() => {
      this.setData({
        showRipple: true
      });
    }, 500);
  },

  onHide() {
    // 页面隐藏时停止呼吸动画和清理定时器
    this.setData({
      isBreathing: false
    });

    // 清理定时器
    if (this.data.holdTimer) {
      clearTimeout(this.data.holdTimer);
    }
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer);
    }
  },

  onUnload() {
    // 清理定时器
    if (this.data.holdTimer) {
      clearTimeout(this.data.holdTimer);
    }
    if (this.data.progressTimer) {
      clearInterval(this.data.progressTimer);
    }
  },

  // ========== 呼吸按钮交互 ==========

  // 点击呼吸按钮（直接进入日常修习模式）
  onBreathTap() {
    wx.vibrateShort({ type: 'heavy' });

    // 跳转到日常修习模式
    this.navigateToDaily();
  },

  // 跳转到日常修习模式
  navigateToDaily() {
    wx.navigateTo({
      url: '/pages/detail/detail?id=daily&autoStart=true',
      success: () => {
        console.log('进入日常修习模式');

        // 重置状态
        this.setData({
          isPressed: false,
          holdProgress: 0,
          isBreathing: true
        });
      },
      fail: err => {
        console.error('跳转失败', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });

        // 失败也重置状态
        this.setData({
          isPressed: false,
          holdProgress: 0,
          isBreathing: true
        });
      }
    });
  },

  // ========== 场景矩阵交互 ==========

  // 点击场景
  onScenarioTap(e) {
    const { id } = e.currentTarget.dataset;
    // 直接从全局获取最新的会员状态
    const isMember = !!app.globalData.isMember;

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    if (isMember) {
      this.goToDetail(id);
      return;
    }

    // --- 非会员拦截逻辑 ---
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const usageKey = `dailyUsage_${dateStr}`;
    const shareUnlockKey = `dailyShareUnlocks_${dateStr}`;
    
    let dailyUsage = wx.getStorageSync(usageKey) || 0;
    let dailyShareUnlocks = wx.getStorageSync(shareUnlockKey) || 0;
    
    // 检查是否有新用户分享福利(+1次)
    const hasShareBonus = wx.getStorageSync('hasShareBonus') || false;
    
    // 今日总可用次数 = 基础3次 + (是否有新用户福利? 1 : 0) + 分享解锁次数
    const baseAllowed = 3 + (hasShareBonus ? 1 : 0);
    const totalAllowed = baseAllowed + dailyShareUnlocks;

    if (dailyUsage < totalAllowed) {
      // 在额度内，直接放行并扣减次数
      wx.setStorageSync(usageKey, dailyUsage + 1);
      this.goToDetail(id);
    } else {
      // 超出额度
      if (dailyShareUnlocks < 3) {
        // 还可以通过分享解锁（最多3次）
        this.setData({
          showShareModal: true,
          pendingScenarioId: id
        });
      } else {
        // 基础3次 + 分享解锁3次 全部用尽（第7次点击），直接去会员页
        wx.navigateTo({
          url: '/pages/pro/pro'
        });
      }
    }
  },

  goToDetail(id) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&autoStart=true`
    });
  },

  // 关闭分享解锁弹窗
  closeShareModal() {
    this.setData({
      showShareModal: false,
      pendingScenarioId: null
    });
  },

  // 不想分享，直接购买会员
  goToPro() {
    this.closeShareModal();
    wx.navigateTo({
      url: '/pages/pro/pro'
    });
  },

  // 阻挡事件冒泡
  catchTouch() {},

  // 微信原生分享配置
  onShareAppMessage(res) {
    // 默认分享文案
    let title = '在觉察中找回内心的力量，送你一次温暖的陪伴。';
    let path = '/pages/index/index?shareBonus=1';

    if (res.from === 'button' && res.target.id === 'unlockShareBtn') {
      // 从弹窗解锁按钮发起的分享
      title = '今天多了一份面对生活的从容，把这份让情绪安定的力量送给你。';
      
      // 成功触发分享，发放奖励
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const shareUnlockKey = `dailyShareUnlocks_${dateStr}`;
      let dailyShareUnlocks = wx.getStorageSync(shareUnlockKey) || 0;
      
      wx.setStorageSync(shareUnlockKey, dailyShareUnlocks + 1);
      
      // 关闭弹窗
      this.setData({ showShareModal: false });
      
      // 显示成功提示
      wx.showToast({
        title: '成功解锁 1 次',
        icon: 'success',
        duration: 2000
      });
      
      const id = this.data.pendingScenarioId;
      if (id) {
        // 解锁后直接消耗一次额度并进入
        const usageKey = `dailyUsage_${dateStr}`;
        let dailyUsage = wx.getStorageSync(usageKey) || 0;
        wx.setStorageSync(usageKey, dailyUsage + 1);

        // 稍微延长一点时间，让用户看到 toast 提示，并在真实手机上无缝衔接
        setTimeout(() => {
           this.goToDetail(id);
        }, 1500);
      }
    }
    
    return {
      title: title,
      path: path
    };
  },

  // ========== 场景加载与管理 ==========

  // 加载已解锁的场景
  loadUnlockedScenarios() {
    const unlocked = wx.getStorageSync('unlockedScenarios') || [];
    this.setData({
      unlockedScenarios: unlocked
    });
    console.log('已解锁的场景:', unlocked);
  },

  // 加载场景数据
  loadScenarios() {
    // 开发阶段直接使用模拟数据
    this.loadMockScenarios();
  },

  // 模拟数据（开发阶段使用）
  loadMockScenarios() {
    console.log('开始加载场景数据');

    // Top 6 高频急救场景
    const heroList = [
      { id: "001", title: "没忍住吼了", icon: "❗", is_free: true, isHero: true },
      { id: "002", title: "作业拖拉", icon: "⏳", is_free: true, isHero: true },
      { id: "003", title: "畏难怕输", icon: "⟡", is_free: false, isHero: true },
      { id: "004", title: "早上不起床", icon: "△", is_free: false, isHero: true },
      { id: "005", title: "沉迷手机", icon: "▭", is_free: false, isHero: true },
      { id: "006", title: "磨蹭发呆", icon: "✎", is_free: false, isHero: true },
    ];

    // 其余场景（已清空）
    const restList = [];

    const allScenarios = [...heroList, ...restList];

    console.log('场景数据加载成功', allScenarios);
    this.setData({
      scenarios: allScenarios,
      heroScenarios: heroList,
      restScenarios: restList,
      loading: false
    });
    console.log('setData 完成，当前 heroScenarios:', this.data.heroScenarios);
    console.log('当前 restScenarios:', this.data.restScenarios);
  },

  // 检查会员状态
  checkProStatus() {
    this.setData({
      isPro: !!app.globalData.isMember
    });
  }
});
