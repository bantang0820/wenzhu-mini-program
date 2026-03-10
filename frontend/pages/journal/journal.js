// pages/journal/journal.js - 心力觉察周报
const app = getApp();

Page({
  data: {
    isPro: false, // 是否为会员

    // 模块A: 情绪热力图
    heatmapData: [],
    peakTime: '', // 高峰时段
    peakTimeInsight: '', // 高峰时段洞察

    // 模块B: 阴影原型分析
    topTag: '', // Top 1 触发标签
    shadowArchetype: '', // 阴影原型
    shadowAnalysis: '', // 阴影分析
    isFlipped: false, // 卡片是否翻转

    // 模块C: 能量生长树
    totalCount: 0, // 总记录次数
    treeLevel: 1, // 树的等级 (1-5)
    treeImage: '', // 树的图片

    loading: true
  },

  onLoad() {
    this.checkProStatus();
    if (app.globalData.isPro) {
      this.loadAllData();
    } else {
      this.setData({ loading: false });
    }
  },

  // 检查会员状态
  checkProStatus() {
    this.setData({
      isPro: app.globalData.isPro
    });
  },

  // 加载所有数据
  loadAllData() {
    this.loadHeatmapData();
    this.loadShadowAnalysis();
    this.loadGrowthTree();
    this.setData({ loading: false });
  },

  // ========== 模块A: 情绪热力图 ==========
  loadHeatmapData() {
    // 模拟过去7天的数据（实际应从数据库读取）
    const mockData = [
      { time: '早晨', count: 2 },
      { time: '上午', count: 3 },
      { time: '中午', count: 1 },
      { time: '下午', count: 7 }, // 高峰
      { time: '傍晚', count: 4 },
      { time: '晚上', count: 5 }
    ];

    // 找出高峰时段
    const peakItem = mockData.reduce((prev, current) => {
      return (prev.count > current.count) ? prev : current;
    });

    // 生成洞察文案
    const insights = {
      '早晨': '数据发现，清晨时光最敏感。请在早起后预留5分钟呼吸时间，为一天储备耐心。',
      '上午': '数据发现，上午时段压力较大。建议在工作间隙短暂休息，避免情绪累积。',
      '中午': '数据发现，午休时段相对平稳。继续保持这个良好的节奏。',
      '下午': '数据发现，下午是情绪的高压期。当你连续工作超过8小时后，对"磨蹭"的容忍度会下降40%。这也许不是孩子的问题，是你的疲劳在报警。请给自己预留5分钟的[停顿]时间。',
      '傍晚': '数据发现，傍晚时分容易疲惫。请在这个时段降低对完美的期待，允许简单的晚餐和放松的陪伴。',
      '晚上': '数据发现，夜间情绪最不稳定。请在睡前提前放下手机，把注意力回到自己和家人身上。'
    };

    this.setData({
      heatmapData: mockData,
      peakTime: peakItem.time,
      peakTimeInsight: insights[peakItem.time] || insights['下午']
    });
  },

  // ========== 模块B: 阴影原型分析 ==========
  loadShadowAnalysis() {
    // 模拟统计数据（实际应从数据库读取）
    const mockTagStats = [
      { tag: '磨蹭', count: 8 },
      { tag: '顶嘴', count: 5 },
      { tag: '大哭', count: 3 }
    ];

    // 找出Top 1
    const topTag = mockTagStats && mockTagStats.length > 0 ? mockTagStats[0].tag : '焦虑';

    // 阴影原型映射
    const shadowMapping = {
      '磨蹭': {
        archetype: '秩序守护者',
        analysis: '你焦虑的不是时间，而是失控。你潜意识里渴望秩序和确定性，当事情偏离计划时，你会感到不安。这源于你对完美的追求和对混乱的恐惧。'
      },
      '顶嘴': {
        archetype: '被忽视的孩童',
        analysis: '你愤怒的不是声音，而是不被听见。你潜意识里觉得自己被忽视，当孩子挑战你的权威时，唤醒了你童年时期未被满足的需求。'
      },
      '大哭': {
        archetype: '情感压抑者',
        analysis: '你无法面对孩子的眼泪，是因为你无法面对自己的脆弱。你潜意识里认为"哭泣=软弱"，这是你成长过程中被植入的信念。'
      }
    };

    const shadowData = shadowMapping[topTag] || shadowMapping['磨蹭'];

    this.setData({
      topTag: topTag,
      shadowArchetype: shadowData.archetype,
      shadowAnalysis: shadowData.analysis
    });
  },

  // 翻转卡片
  onFlipCard() {
    this.setData({
      isFlipped: !this.data.isFlipped
    });
  },

  // ========== 模块C: 能量生长树 ==========
  loadGrowthTree() {
    // 模拟总记录次数（实际应从数据库读取）
    const totalCount = 23;

    // 根据次数计算树的等级 (1-5)
    let treeLevel = 1;
    if (totalCount >= 50) treeLevel = 5;
    else if (totalCount >= 30) treeLevel = 4;
    else if (totalCount >= 20) treeLevel = 3;
    else if (totalCount >= 10) treeLevel = 2;

    // 树的图片（用emoji代替，实际应该用图片）
    const treeImages = [
      '🌱', // Level 1: 幼苗
      '🌿', // Level 2: 小草
      '🪴', // Level 3: 灌木
      '🌳', // Level 4: 大树
      '🌲'  // Level 5: 参天大树
    ];

    this.setData({
      totalCount: totalCount,
      treeLevel: treeLevel,
      treeImage: treeImages[treeLevel - 1]
    });
  },

  // ========== 付费相关 ==========
  onSubscribe() {
    wx.showToast({
      title: '跳转支付页面',
      icon: 'none',
      duration: 2000
    });
    // TODO: 跳转支付页面
  }
});
