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
  async onScenarioTap(e) {
    const { id, isFree } = e.currentTarget.dataset;

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 检查练习状态
    try {
      const api = require('../../utils/api.js');
      const result = await api.get('/share/check-status');

      if (result.success && result.data) {
        const status = result.data;

        // 判断是否可以练习
        if (status.canPractice) {
          // 可以直接进入，消耗次数
          await this.consumePracticeAndEnter(id);
        } else {
          // 不能练习，显示分享引导
          this.showShareGuide(status, id);
        }
      } else {
        // API调用失败，降级处理：直接进入
        wx.navigateTo({
          url: `/pages/detail/detail?id=${id}`
        });
      }
    } catch (error) {
      console.error('检查练习状态失败:', error);
      // 降级处理：直接进入
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      });
    }
  },

  // 消耗练习次数并进入详情页
  async consumePracticeAndEnter(scenarioId) {
    try {
      const api = require('../../utils/api.js');
      await api.post('/share/consume', {});

      // 跳转到详情页
      wx.navigateTo({
        url: `/pages/detail/detail?id=${scenarioId}`,
        success: () => {
          console.log('进入场景:', scenarioId);
        },
        fail: err => {
          console.error('跳转失败', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('消耗练习次数失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 显示分享引导
  showShareGuide(status, scenarioId) {
    const { remainingShareCount = 0, reason = '' } = status;

    let message = '';
    let showShare = true;

    if (reason === 'need_share') {
      message = `今日3次免费练习已用完\n分享给好友，解锁1次额外练习机会\n今日还可分享${3 - status.dailyShareCount}次`;
    } else if (reason === 'need_member') {
      message = `今日3次免费练习已用完\n分享次数也已用完\n开通会员，无限练习`;
      showShare = remainingShareCount > 0;
    } else {
      message = '今日练习次数已用完';
    }

    wx.showModal({
      title: '解锁练习机会',
      content: message,
      confirmText: showShare ? '立即分享' : '开通会员',
      cancelText: '暂不需要',
      showCancel: true,
      success: (res) => {
        if (res.confirm) {
          if (reason === 'need_member' || (reason === 'need_share' && status.dailyShareCount >= 3)) {
            // 跳转到会员页面
            wx.switchTab({
              url: '/pages/pro/pro'
            });
          } else {
            // 调起分享
            this.shareToFriend(scenarioId);
          }
        }
      }
    });
  },

  // 分享给好友
  shareToFriend(scenarioId) {
    // TODO: 实现微信分享逻辑
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });

    // 分享成功后，调用解锁接口
    // this.recordShareAndUnlock();
  },

  // 记录分享并解锁
  async recordShareAndUnlock() {
    try {
      const api = require('../../utils/api.js');
      const result = await api.post('/share/record', {});

      if (result.success) {
        wx.showToast({
          title: '解锁成功！',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '解锁失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('解锁失败:', error);
      wx.showToast({
        title: '解锁失败',
        icon: 'none'
      });
    }
  }
});
