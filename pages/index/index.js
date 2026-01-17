// pages/index/index.js
const app = getApp();

Page({
  data: {
    scenarios: [], // 场景列表
    isPro: false, // 是否为会员
    loading: true,
    unlockedScenarios: [], // 已解锁的场景ID列表
    selectedId: null // 当前选中的气泡ID
  },

  onLoad() {
    console.log('首页 onLoad 执行');
    this.loadUnlockedScenarios(); // 加载已解锁的场景
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
  },

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

  // 生成随机浮动偏移量
  generateRandomOffset() {
    return Math.floor(Math.random() * 20) - 10; // -10 到 10 之间的随机数
  },

  // 模拟数据（开发阶段使用）
  loadMockScenarios() {
    console.log('开始加载模拟数据');
    const mockScenarios = [
      {
        id: "001",
        title: "孩子磨蹭",
        category: "焦虑",
        is_free: true,
        icon: "◎", // 蜗牛线条 - 缓慢
      },
      {
        id: "002",
        title: "孩子大哭",
        category: "无助",
        is_free: true,
        icon: "●", // 水滴 - 眼泪
      },
      {
        id: "003",
        title: "不听话",
        category: "愤怒",
        is_free: true,
        icon: "✕", // 叉号 - 冲突
      },
      {
        id: "004",
        title: "吃饭慢",
        category: "焦虑",
        is_free: false,
        icon: "○", // 圆圈 - 等待
      },
      {
        id: "005",
        title: "顶嘴",
        category: "愤怒",
        is_free: false,
        icon: "△", // 三角 - 尖锐
      },
      {
        id: "006",
        title: "不肯睡觉",
        category: "疲惫",
        is_free: false,
        icon: "◇", // 菱形 - 疲惫
      },
      {
        id: "007",
        title: "写作业拖拉",
        category: "焦虑",
        is_free: false,
        icon: "≈", // 波浪 - 拖延
      },
      {
        id: "008",
        title: "发脾气",
        category: "愤怒",
        is_free: false,
        icon: "※", // 星号 - 爆发
      },
      {
        id: "009",
        title: "沉迷电子产品",
        category: "焦虑",
        is_free: false,
        icon: "▢", // 方块 - 屏幕
      },
      {
        id: "010",
        title: "不肯收拾玩具",
        category: "烦躁",
        is_free: false,
        icon: "◈", // 菱形 - 混乱
      },
      {
        id: "011",
        title: "撒谎",
        category: "担忧",
        is_free: false,
        icon: "≠", // 不等 - 隐瞒
      },
      {
        id: "012",
        title: "打人/咬人",
        category: "愤怒",
        is_free: false,
        icon: "⚡", // 闪电 - 攻击
      }
    ];

    console.log('模拟数据加载成功', mockScenarios);
    this.setData({
      scenarios: mockScenarios,
      loading: false
    });
    console.log('setData 完成，当前 scenarios:', this.data.scenarios);
  },

  // 检查会员状态
  checkProStatus() {
    this.setData({
      isPro: app.globalData.isPro
    });
  },

  // 点击场景气泡
  onScenarioTap(e) {
    const { id, isFree } = e.currentTarget.dataset;

    // 设置选中状态
    this.setData({
      selectedId: id
    });

    // 延迟跳转，让用户看到选中动画
    setTimeout(() => {
      // 如果不是免费场景且不是会员，提示解锁
      if (!isFree && !this.data.isPro) {
        wx.showToast({
          title: '解锁全部场景',
          icon: 'none',
          duration: 2000
        });
        // TODO: 跳转到会员订阅页
        return;
      }

      // 跳转到详情页
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`,
        success: () => {
          console.log('跳转到详情页', id);
        },
        fail: err => {
          console.error('跳转失败', err);
        }
      });
    }, 300);
  }
});
