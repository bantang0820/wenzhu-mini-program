// pages/stats/stats.js - 觉察（日历+雷达图）
const app = getApp();
const api = require('../../utils/api.js');
const {
  DEFAULT_GOOD_THING_PROMPT,
  getRandomGoodThingPrompt
} = require('../../utils/goodThingPrompts.js');
const GOOD_THINGS_STORAGE_KEY = 'goodThingsRecords';

Page({
  data: {
    // ========== 核心数据 ==========
    totalDays: 0, // 已稳住天数
    totalEnergy: 0, // 累计能量
    continuousDays: 0, // 连续练习天数（与本心页一致）

    // ========== 用户内心状态 ==========
    userInfo: {
      levelName: '初见微光',
      nextLevelName: '温柔绽放',
      remainingDays: 0,
      progress: 0
    },

    // ========== 好事发生 ==========
    goodThingSummary: {
      hasRecords: false,
      latestText: '',
      previewText: DEFAULT_GOOD_THING_PROMPT
    },
    isGoodThingUnlocked: false,

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
    this.hasShownStatsPage = false;
    this.syncGoodThingAccess();
    this.initData();
  },

  onShow() {
    this.syncGoodThingAccess();
    // 每次显示时刷新数据
    this.loadUserData();
    this.loadCalendarData();
    this.loadMedalData();
    if (this.hasShownStatsPage) {
      this.loadGoodThingSummary();
    }

    this.hasShownStatsPage = true;
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
    this.loadGoodThingSummary();
    this.setData({ loading: false });
  },

  loadGoodThingSummary() {
    const currentPreviewText = this.hasShownStatsPage
      ? this.data.goodThingSummary.previewText
      : '';

    this.setData({
      goodThingSummary: {
        hasRecords: false,
        latestText: '',
        previewText: getRandomGoodThingPrompt(currentPreviewText)
      }
    });
  },

  getGoodThingAccessState() {
    const cachedUser = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    const rawExpireTime = cachedUser.vipExpireTime || cachedUser.vip_expire_time || wx.getStorageSync('proExpireTime');

    if (rawExpireTime) {
      const expireTimestamp = typeof rawExpireTime === 'number'
        ? rawExpireTime
        : new Date(rawExpireTime).getTime();

      if (!Number.isNaN(expireTimestamp)) {
        return expireTimestamp > Date.now();
      }
    }

    return !!(
      app.globalData.isMember ||
      wx.getStorageSync('isMember') ||
      cachedUser.isVip ||
      cachedUser.is_vip
    );
  },

  syncGoodThingAccess() {
    this.setData({
      isGoodThingUnlocked: this.getGoodThingAccessState()
    });
  },

  getPracticeDateString(date = new Date()) {
    const targetDate = date instanceof Date ? date : new Date(date);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  calculateLocalContinuousDays(checkInMap = {}) {
    const today = this.getPracticeDateString();
    if (!checkInMap[today]) {
      return 0;
    }

    let streak = 0;
    const cursor = new Date(`${today}T12:00:00`);

    while (checkInMap[this.getPracticeDateString(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  },

  calculateBestContinuousDays(checkInMap = {}) {
    const validDates = Object.keys(checkInMap)
      .filter((dateStr) => !!checkInMap[dateStr])
      .sort();

    if (validDates.length === 0) {
      return 0;
    }

    let best = 1;
    let streak = 1;
    let previous = new Date(`${validDates[0]}T12:00:00`);

    for (let i = 1; i < validDates.length; i += 1) {
      const current = new Date(`${validDates[i]}T12:00:00`);
      const diffDays = Math.round((current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }

      if (streak > best) {
        best = streak;
      }

      previous = current;
    }

    return best;
  },

  getLocalPracticeStats() {
    const checkInMap = this.mergeGoodThingCheckIns(wx.getStorageSync('checkInMap') || {});
    const energyData = wx.getStorageSync('energyData') || {};
    const storedTotalDays = Number(wx.getStorageSync('totalDays') || 0);
    const totalDays = Math.max(Object.keys(checkInMap).length, storedTotalDays);
    const totalEnergy = Number(
      energyData.totalEnergy !== undefined ? energyData.totalEnergy : (wx.getStorageSync('totalEnergy') || 0)
    );
    const continuousDays = Math.max(
      this.calculateLocalContinuousDays(checkInMap),
      this.calculateBestContinuousDays(checkInMap),
      Number(wx.getStorageSync('currentStreak') || 0)
    );

    return {
      totalDays,
      totalEnergy,
      continuousDays,
      checkInMap
    };
  },

  mergeGoodThingCheckIns(baseCheckInMap = {}) {
    const mergedCheckInMap = { ...baseCheckInMap };
    const records = wx.getStorageSync(GOOD_THINGS_STORAGE_KEY) || [];

    if (!Array.isArray(records) || records.length === 0) {
      return mergedCheckInMap;
    }

    let hasPatched = false;
    records.forEach((item) => {
      if (!item || !item.createdAt) return;
      const dateStr = this.getPracticeDateString(item.createdAt);
      if (!mergedCheckInMap[dateStr]) {
        mergedCheckInMap[dateStr] = true;
        hasPatched = true;
      }
    });

    if (hasPatched) {
      wx.setStorageSync('checkInMap', mergedCheckInMap);
    }

    return mergedCheckInMap;
  },

  persistLocalPracticeStats(stats = {}) {
    wx.setStorageSync('totalDays', Number(stats.totalDays || 0));
    wx.setStorageSync('totalEnergy', Number(stats.totalEnergy || 0));
    wx.setStorageSync('currentStreak', Number(stats.continuousDays || 0));
  },

  // ========== 加载用户数据 ==========
  async loadUserData() {
    // 先读取本地数据兜底
    const localStats = this.getLocalPracticeStats();
    let finalStats = {
      totalDays: localStats.totalDays,
      totalEnergy: localStats.totalEnergy,
      continuousDays: localStats.continuousDays
    };

    this.setData({
      totalDays: finalStats.totalDays,
      totalEnergy: finalStats.totalEnergy,
      continuousDays: finalStats.continuousDays,
      checkInMap: localStats.checkInMap
    });

    // 登录状态下使用后端核心统计，保持与本心页数据一致
    try {
      const isLoggedIn = typeof app.isLoggedIn === 'function'
        ? app.isLoggedIn()
        : !!(wx.getStorageSync('token') && wx.getStorageSync('openid'));

      if (isLoggedIn) {
        const apiClient = app.globalData.api || api;
        const response = await apiClient.get('/scenarios/statistics', null, true);

        if (response.success && response.data) {
          finalStats = {
            totalDays: Math.max(localStats.totalDays, Number(response.data.totalDays || 0)),
            totalEnergy: Math.max(localStats.totalEnergy, Number(response.data.totalEnergy || 0)),
            continuousDays: Math.max(localStats.continuousDays, Number(response.data.continuousDays || 0))
          };

          this.persistLocalPracticeStats(finalStats);
          this.setData({
            totalDays: finalStats.totalDays,
            totalEnergy: finalStats.totalEnergy,
            continuousDays: finalStats.continuousDays
          });
        }
      }
    } catch (error) {
      console.error('加载连续练习天数失败，已使用本地数据:', error);
    }

    // 计算等级
    this.calculateLevel(finalStats.totalDays);
    this.loadMedalData(finalStats);
  },

  // 计算用户等级（重构为：心灵状态）
  calculateLevel(totalDays) {
    let stateInfo = {
      level: 1,
      name: '初见微光',
      nextName: '温柔绽放',
      remaining: 8 - totalDays,
      progress: (totalDays / 8) * 100
    };

    if (totalDays >= 101) {
      stateInfo = {
        level: 4,
        name: '智慧共振',
        nextName: '',
        remaining: 0,
        progress: 100
      };
    } else if (totalDays >= 31) {
      stateInfo = {
        level: 3,
        name: '心生宁静',
        nextName: '智慧共振',
        remaining: 101 - totalDays,
        progress: ((totalDays - 31) / (101 - 31)) * 100
      };
    } else if (totalDays >= 8) {
      stateInfo = {
        level: 2,
        name: '温柔绽放',
        nextName: '心生宁静',
        remaining: 31 - totalDays,
        progress: ((totalDays - 8) / (31 - 8)) * 100
      };
    }

    this.setData({
      'userInfo.levelName': stateInfo.name,
      'userInfo.nextLevelName': stateInfo.nextName,
      'userInfo.remainingDays': stateInfo.remaining,
      'userInfo.progress': stateInfo.progress
    });
  },

  // ========== 加载日历数据 ==========
  loadCalendarData() {
    const { currentYear, currentMonth } = this.data;
    const checkInMap = wx.getStorageSync('checkInMap') || {};

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

    this.setData({ calendarDays, checkInMap });
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
  loadMedalData: function(statsOverrides = {}) {
    var that = this;

    // 模拟勋章数据
    var allMedals = [
      { id: 1, name: '初见本心', icon: '🌱', desc: '完成第一次朗读', requirement: 1, type: 'days' },
      { id: 2, name: '七日守心', icon: '🌿', desc: '连续打卡7天', requirement: 7, type: 'streak' },
      { id: 3, name: '温柔成习', icon: '🪴', desc: '连续打卡30天', requirement: 30, type: 'streak' },
      { id: 4, name: '心力丰盈', icon: '✨', desc: '累计获得500能量', requirement: 500, type: 'energy' },
      { id: 5, name: '家庭灯塔', icon: '🌟', desc: '完成50次场景朗读', requirement: 50, type: 'scenarios' },
      { id: 6, name: '内核稳固', icon: '💎', desc: '累计打卡100天', requirement: 100, type: 'days' },
      { id: 7, name: '四季如磐', icon: '🏆', desc: '累计打卡365天', requirement: 365, type: 'days' },
      { id: 8, name: '家风立名', icon: '👑', desc: '完成500次场景朗读', requirement: 500, type: 'scenarios' }
    ];

    var totalDays = statsOverrides.totalDays !== undefined ? statsOverrides.totalDays : (that.data.totalDays || 0);
    var continuousDays = statsOverrides.continuousDays !== undefined ? statsOverrides.continuousDays : (that.data.continuousDays || 0);
    var totalEnergy = statsOverrides.totalEnergy !== undefined ? statsOverrides.totalEnergy : (that.data.totalEnergy || 0);
    var totalScenarios = wx.getStorageSync('totalCount') || wx.getStorageSync('totalScenarios') || 0;

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
            isUnlocked = continuousDays >= medal.requirement;
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
  },

  onGoodThingTap() {
    wx.navigateTo({
      url: '/pages/good-things/good-things'
    });
  }
});
