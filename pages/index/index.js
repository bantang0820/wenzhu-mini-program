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

    // 呼吸动画
    isBreathing: true, // 是否正在呼吸
    isPressed: false, // 是否被按压
    showRipple: false, // 是否显示涟漪
    holdProgress: 0, // 长按进度（0-100）
    holdTimer: null, // 长按定时器
  },

  onLoad() {
    console.log('首页 onLoad 执行');
    this.loadUnlockedScenarios();
    this.loadScenarios();
    this.checkProStatus();
  },

  onShow() {
    // 每次显示页面时重新加载已解锁的场景
    this.loadUnlockedScenarios();
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

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 跳转到详情页，直接进入朗读模式（跳过长按止颤）
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&autoStart=true`,
      success: () => {
        console.log('进入场景:', id);
      },
      fail: err => {
        console.error('跳转失败', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
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
      { id: "003", title: "遇难题就放弃", icon: "⟡", is_free: true, isHero: true },
      { id: "004", title: "早上不起床", icon: "△", is_free: true, isHero: true },
      { id: "005", title: "沉迷手机", icon: "▭", is_free: true, isHero: true },
      { id: "006", title: "磨蹭发呆", icon: "✎", is_free: true, isHero: true },
    ];

    // 其余场景
    const restList = [
      { id: "007", title: "不肯尝试", is_free: true },
      { id: "008", title: "孩子顶嘴", is_free: true },
      { id: "009", title: "孩子冷漠", is_free: true },
      { id: "010", title: "孩子怕输", is_free: true },
      { id: "011", title: "吃饭挑食", is_free: true },
      { id: "012", title: "俩娃争宠", is_free: true },
      { id: "013", title: "不想上学", is_free: true },
      { id: "014", title: "沉迷看电视", is_free: true },
      { id: "015", title: "孩子撒谎", is_free: true },
      { id: "016", title: "爱发脾气", is_free: true },
      { id: "017", title: "和人打架", is_free: true },
      { id: "018", title: "不听话", is_free: true },
      { id: "019", title: "被打不还手", is_free: true },
      { id: "020", title: "玻璃心", is_free: true },
      { id: "021", title: "孩子躺平", is_free: true },
    ];

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
      isPro: app.globalData.isPro
    });
  }
});
