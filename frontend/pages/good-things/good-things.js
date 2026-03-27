const app = getApp();
const GOOD_THINGS_STORAGE_KEY = 'goodThingsRecords';
const {
  DEFAULT_GOOD_THING_PROMPT,
  getRandomGoodThingPrompt
} = require('../../utils/goodThingPrompts.js');

Page({
  data: {
    draft: '',
    promptText: DEFAULT_GOOD_THING_PROMPT,
    records: [],
    hasRecords: false,
    saving: false,
    showComposer: false,
    inputFocus: false,
    showRecordStar: false
  },

  getPracticeDateString(date = new Date()) {
    const targetDate = date instanceof Date ? date : new Date(date);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  calculateConsecutiveDays(checkInMap = {}) {
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

  markPracticeCheckIn(practiceTime = new Date()) {
    const dateStr = this.getPracticeDateString(practiceTime);
    const checkInMap = wx.getStorageSync('checkInMap') || {};

    if (!checkInMap[dateStr]) {
      checkInMap[dateStr] = true;
      wx.setStorageSync('checkInMap', checkInMap);
    }

    const totalDays = Object.keys(checkInMap).length;
    const currentStreak = this.calculateConsecutiveDays(checkInMap);
    wx.setStorageSync('totalDays', totalDays);
    wx.setStorageSync('currentStreak', currentStreak);

    const energyData = wx.getStorageSync('energyData') || {};
    energyData.consecutiveDays = currentStreak;
    energyData.lastCheckInDate = dateStr;
    energyData.lastEnergyResetDate = energyData.lastEnergyResetDate || dateStr;
    wx.setStorageSync('energyData', energyData);
  },

  onLoad() {
    this.refreshPromptText();
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  hasMembershipAccess() {
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

  redirectToProPage() {
    wx.navigateTo({
      url: '/pages/pro/pro'
    });
  },

  getStoredRecords() {
    const records = wx.getStorageSync(GOOD_THINGS_STORAGE_KEY) || [];

    if (!Array.isArray(records)) {
      return [];
    }

    return records
      .filter(item => item && item.content && item.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  saveStoredRecords(records = []) {
    wx.setStorageSync(GOOD_THINGS_STORAGE_KEY, records);
  },

  formatRecord(record = {}) {
    const date = new Date(record.createdAt);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return Object.assign({}, record, {
      displayDay: `${month}.${day}`
    });
  },

  loadRecords() {
    const records = this.getStoredRecords().map(item => this.formatRecord(item));

    this.setData({
      records,
      hasRecords: records.length > 0
    });
  },

  refreshPromptText(avoidCurrentPrompt = false) {
    this.setData({
      promptText: getRandomGoodThingPrompt(avoidCurrentPrompt ? this.data.promptText : '')
    });
  },

  onDraftInput(e) {
    this.setData({
      draft: e.detail.value
    });
  },

  onOpenComposer() {
    if (!this.hasMembershipAccess()) {
      this.redirectToProPage();
      return;
    }

    this.refreshPromptText(true);
    this.preventKeyboardClose = false;
    this.setData({
      showComposer: true,
      inputFocus: false,
      draft: ''
    }, () => {
      setTimeout(() => {
        if (this.data.showComposer) {
          this.setData({
            inputFocus: true
          });
        }
      }, 80);
    });
  },

  onCloseComposer() {
    if (this.data.saving) {
      return;
    }

    this.preventKeyboardClose = false;
    this.setData({
      showComposer: false,
      inputFocus: false,
      draft: ''
    });
  },

  noop() {},

  onKeyboardHeightChange(e) {
    const keyboardHeight = Number((e && e.detail && e.detail.height) || 0);

    if (!this.data.showComposer || this.data.saving) {
      return;
    }

    // 仅记录键盘变化，不再在键盘收起时自动关闭编辑面板。
    // 避免用户点击“记下来了”时，先触发键盘收起导致内容丢失。
    this.lastKeyboardHeight = keyboardHeight;
  },

  triggerTimelineStar() {
    this.setData({
      showRecordStar: false
    });

    setTimeout(() => {
      this.setData({
        showRecordStar: true
      });
    }, 40);

    setTimeout(() => {
      this.setData({
        showRecordStar: false
      });
    }, 860);
  },

  onSaveTap() {
    if (!this.hasMembershipAccess()) {
      this.onCloseComposer();
      this.redirectToProPage();
      return;
    }

    const content = (this.data.draft || '').trim();

    if (!content) {
      wx.showToast({
        title: '先写下一件小好事吧',
        icon: 'none'
      });
      setTimeout(() => {
        if (this.data.showComposer) {
          this.setData({
            inputFocus: true
          });
        }
      }, 120);
      return;
    }

    if (this.data.saving) {
      return;
    }

    this.preventKeyboardClose = true;
    this.setData({
      saving: true,
      inputFocus: false
    });

    wx.hideKeyboard({
      complete: () => {}
    });

    const newRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      createdAt: new Date().toISOString()
    };

    const records = [newRecord].concat(this.getStoredRecords())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);
    this.saveStoredRecords(records);
    const formattedRecords = records.map(item => this.formatRecord(item));
    this.markPracticeCheckIn(new Date());

    this.setData({
      records: formattedRecords,
      hasRecords: formattedRecords.length > 0,
      draft: '',
      saving: false,
      showComposer: false,
      inputFocus: false
    }, () => {
      this.preventKeyboardClose = false;
      this.triggerTimelineStar();
      wx.showToast({
        title: '已记录到时间轴',
        icon: 'success'
      });
    });
  }
});
