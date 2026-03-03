// pages/scenarios/scenarios.js - 深海矩阵
Page({
  data: {
    scenarios: []
  },

  onLoad(options) {
    this.loadScenarios();
  },

  // 加载30个场景数据
  loadScenarios() {
    const allScenarios = [
      // No.1 日常修习（固定首位）
      {
        id: "daily",
        title: "日常修习",
        icon: "🧘",
        is_free: true,
        isDaily: true
      },
      // No.2-30 高频场景
      { id: "002", title: "孩子磨蹭", icon: "🐢", is_free: true },
      { id: "003", title: "哭闹不止", icon: "😭", is_free: true },
      { id: "004", title: "孩子发脾气", icon: "🧨", is_free: true },
      { id: "005", title: "辅导作业", icon: "📝", is_free: true },
      { id: "006", title: "沉迷手机", icon: "📱", is_free: true },
      { id: "007", title: "没忍住吼了", icon: "😡", is_free: true },
      { id: "008", title: "不肯睡觉", icon: "🛌", is_free: true },
      { id: "009", title: "孩子顶嘴", icon: "👂", is_free: true },
      { id: "010", title: "对孩子冷漠", icon: "🧊", is_free: true },
      { id: "011", title: "早上兵荒马乱", icon: "🏃‍♀️", is_free: true },
      { id: "012", title: "不肯吃饭", icon: "🍱", is_free: true },
      { id: "013", title: "二胎争宠", icon: "👯‍♀️", is_free: true },
      { id: "014", title: "不想上学", icon: "🏫", is_free: true },
      { id: "015", title: "婆媳分歧", icon: "👵", is_free: true },
      { id: "016", title: "孩子撒谎", icon: "🤥", is_free: true },
      { id: "017", title: "爱发脾气", icon: "⚡", is_free: true },
      { id: "018", title: "写作业拖拉", icon: "⏳", is_free: true },
      { id: "019", title: "不听话", icon: "✕", is_free: true },
      { id: "020", title: "爱哭闹", icon: "💧", is_free: true },
      { id: "021", title: "打游戏", icon: "🎮", is_free: true },
      { id: "022", title: "不做家务", icon: "🧹", is_free: true },
      { id: "023", title: "注意力不集中", icon: "🎯", is_free: true },
      { id: "024", title: "拖延症", icon: "🐌", is_free: true },
      { id: "025", title: "沉迷动画", icon: "📺", is_free: true },
      { id: "026", title: "爱顶嘴", icon: "💬", is_free: true },
      { id: "027", title: "不肯起床", icon: "⏰", is_free: true },
      { id: "028", title: "挑食", icon: "🥗", is_free: true },
      { id: "029", title: "打人", icon: "👊", is_free: true },
      { id: "030", title: "咬人", icon: "🦷", is_free: true }
    ];

    this.setData({
      scenarios: allScenarios
    });
  },

  // 点击场景
  onScenarioTap(e) {
    const { id, isFree } = e.currentTarget.dataset;

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
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
  }
});
