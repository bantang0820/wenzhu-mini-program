// pages/scenarios/scenarios.js - 深海矩阵
const api = require('../../utils/api.js');

Page({
  data: {
    scenarios: [],
    loading: true
  },

  onLoad(options) {
    this.loadScenarios();
  },

  // 加载场景数据
  async loadScenarios() {
    try {
      // 显示加载提示
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      // 从后端 API 获取场景列表
      const result = await api.get('/scenarios');

      if (result.success && result.data) {
        // 添加日常修习（固定首位）
        const dailyScenario = {
          id: "daily",
          title: "日常修习",
          icon: "🧘",
          is_free: true,
          isDaily: true
        };

        // 处理后端返回的数据
        const scenarios = result.data.map(item => ({
          id: item.id,
          title: item.title,
          icon: this._getIconForScenario(item.category),
          is_free: item.is_free === 1
        }));

        this.setData({
          scenarios: [dailyScenario, ...scenarios],
          loading: false
        });

        console.log('场景数据加载成功:', scenarios.length);
      } else {
        throw new Error('获取场景数据失败');
      }
    } catch (err) {
      console.error('加载场景失败:', err);

      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });

      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  // 根据分类获取图标
  _getIconForScenario(category) {
    const iconMap = {
      '焦虑': '😰',
      '愤怒': '😡',
      '无助': '😞',
      'other': '💭'
    };
    return iconMap[category] || '💭';
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
