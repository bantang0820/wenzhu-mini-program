// pages/stats/stats.js - 觉察（日历+雷达图）
const app = getApp();

Page({
  data: {
    // ========== 核心数据 ==========
    totalDays: 0, // 已稳住天数
    totalEnergy: 0, // 累计能量
    beatPercent: 0, // 击败百分比

    // ========== 用户等级信息 ==========
    userInfo: {
      level: 1,
      levelName: '觉察者'
    },

    // ========== 日历数据 ==========
    currentYear: 0,
    currentMonth: 0,
    calendarDays: [], // 日历日期数组
    checkInMap: {}, // 打卡记录 { "2025-01-15": true }

    // ========== 勋章数据 ==========
    medals: [], // 已获得的勋章
    lockedMedals: [], // 未获得的勋章

    loading: true
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadUserData();
  },

  // 初始化数据
  initData() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    });

    this.loadUserData();
    this.loadCalendarData();
    this.loadMedalData();
    this.setData({ loading: false });
  },

  // ========== 加载用户数据 ==========
  loadUserData() {
    // 从本地存储读取
    const totalDays = wx.getStorageSync('totalDays') || 0;
    const totalEnergy = wx.getStorageSync('totalEnergy') || 0;
    const beatPercent = Math.min(99, Math.floor(totalDays * 2 + 10)); // 简单算法

    this.setData({
      totalDays,
      totalEnergy,
      beatPercent
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

  // ========== 加载日历数据 ==========
  loadCalendarData() {
    const { currentYear, currentMonth } = this.data;

    // 获取当月天数
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 生成日历数组
    const calendarDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isCheckedIn = this.checkIsCheckedIn(dateStr);

      calendarDays.push({
        day: i,
        dateStr: dateStr,
        isCheckedIn: isCheckedIn,
        isToday: this.isToday(dateStr)
      });
    }

    this.setData({ calendarDays });
  },

  // 检查某天是否打卡
  checkIsCheckedIn(dateStr) {
    const checkInMap = wx.getStorageSync('checkInMap') || {};
    return checkInMap[dateStr] || false;
  },

  // 判断是否是今天
  isToday(dateStr) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  },

  // ========== 加载勋章数据 ==========
  loadMedalData: function() {
    var that = this;

    // 模拟勋章数据
    var allMedals = [
      { id: 1, name: '初次觉察', icon: '🌱', desc: '完成第一次朗读', requirement: 1, type: 'days' },
      { id: 2, name: '坚持一周', icon: '🌿', desc: '连续打卡7天', requirement: 7, type: 'streak' },
      { id: 3, name: '习惯养成', icon: '🪴', desc: '连续打卡30天', requirement: 30, type: 'streak' },
      { id: 4, name: '能量觉醒', icon: '✨', desc: '累计获得500能量', requirement: 500, type: 'energy' },
      { id: 5, name: '情绪导师', icon: '🌟', desc: '完成50次场景朗读', requirement: 50, type: 'scenarios' },
      { id: 6, name: '百日筑基', icon: '💎', desc: '累计打卡100天', requirement: 100, type: 'days' },
      { id: 7, name: '年度修行', icon: '🏆', desc: '累计打卡365天', requirement: 365, type: 'days' },
      { id: 8, name: '大师风范', icon: '👑', desc: '完成500次场景朗读', requirement: 500, type: 'scenarios' }
    ];

    var totalDays = that.data.totalDays || 0;
    var totalEnergy = that.data.totalEnergy || 0;
    var totalScenarios = wx.getStorageSync('totalScenarios') || 0;

    var medals = [];
    var lockedMedals = [];

    if (allMedals && Array.isArray(allMedals)) {
      allMedals.forEach(function(medal) {
        var isUnlocked = false;

        switch (medal.type) {
          case 'days':
            isUnlocked = totalDays >= medal.requirement;
            break;
          case 'streak':
            isUnlocked = totalDays >= medal.requirement;
            break;
          case 'energy':
            isUnlocked = totalEnergy >= medal.requirement;
            break;
          case 'scenarios':
            isUnlocked = totalScenarios >= medal.requirement;
            break;
        }

        if (isUnlocked) {
          medals.push(medal);
        } else {
          lockedMedals.push(medal);
        }
      });
    }

    that.setData({
      medals: medals,
      lockedMedals: lockedMedals
    });
  },

  // 点击日历日期
  onDateTap(e) {
    const { dateStr, isCheckedIn } = e.currentTarget.dataset;

    if (!isCheckedIn) {
      wx.showToast({
        title: '这天还没有打卡',
        icon: 'none'
      });
    } else {
      wx.showToast({
        title: `${dateStr} 已打卡`,
        icon: 'none'
      });
    }
  },

  // 点击勋章
  onMedalTap(e) {
    const { locked } = e.currentTarget.dataset;

    if (locked) {
      wx.showToast({
        title: '继续坚持解锁勋章',
        icon: 'none'
      });
    }
  }
});
