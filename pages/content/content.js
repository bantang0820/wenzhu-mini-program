// pages/content/content.js
Page({
  data: {
    albums: [],
    dailyQuote: '我观察到你不高兴，而不是你在闹脾气。',
    dailyDate: '',
    lastReadLesson: ''
  },

  onLoad: function() {
    console.log('阅见页面加载中...');
    this.loadAlbums();
    this.setDailyDate();
    this.loadLastRead();
  },

  // 设置每日日期
  setDailyDate: function() {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];

    this.setData({
      dailyDate: `${month}月${day}日 · 星期${weekDay}`
    });
  },

  // 加载最近在读
  loadLastRead: function() {
    try {
      const lastRead = wx.getStorageSync('last_read_lesson');
      if (lastRead) {
        this.setData({
          lastReadLesson: lastRead
        });
      }
    } catch (e) {
      console.log('读取最近在读失败', e);
    }
  },

  loadAlbums: function() {
    var albums = [
      {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: '100句',
        desc: '马歇尔博士的爱的语言',
        progress: 12,
        tag: '沟通技巧',
        locked: false
      },
      {
        id: 'adler',
        title: '课题分离',
        subtitle: '100句',
        desc: '阿德勒心理学边界指南',
        progress: 0,
        tag: '边界感',
        locked: true
      },
      {
        id: 'self',
        title: '自我关怀',
        subtitle: '100句',
        desc: '接纳不完美的自己',
        progress: 0,
        tag: '情绪疗愈',
        locked: true
      },
      {
        id: 'growth',
        title: '成长型思维',
        subtitle: '100句',
        desc: '鼓励孩子激发内在动力',
        progress: 0,
        tag: '能力培养',
        locked: true
      }
    ];

    this.setData({ albums: albums });
  },

  onAlbumTap: function(e) {
    var id = e.currentTarget.dataset.id;
    var locked = e.currentTarget.dataset.locked;
    console.log('点击专辑，ID:', id, '锁定状态:', locked);
    wx.vibrateShort();

    if (!id) {
      console.error('专辑ID为空');
      return;
    }

    if (locked) {
      wx.showToast({
        title: 'Coming Soon',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 保存最近在读记录
    this.saveLastRead('第1章 · 区分观察与评论');

    // 跳转到章节列表页（chapter页面）
    wx.navigateTo({
      url: '/pages/chapter/chapter?albumId=' + id + '&chapterId=1',
      fail: function(err) {
        console.error('页面跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 保存最近在读
  saveLastRead: function(lessonTitle) {
    try {
      wx.setStorageSync('last_read_lesson', lessonTitle);
      this.setData({
        lastReadLesson: lessonTitle
      });
    } catch (e) {
      console.log('保存最近在读失败', e);
    }
  },

  onDailyTap: function() {
    wx.vibrateShort();

    // 随机切换金句
    const quotes = [
      '我观察到你不高兴，而不是你在闹脾气。',
      '感受没有对错，只有存在。',
      '需要是普遍的，我们都渴望被理解。',
      '倾听本身就是疗愈。',
      '愤怒是受伤的呐喊，需要未被满足。',
      '感激是关系的燃料，让爱流动。',
      '先照顾好自己，才能照顾好孩子。',
      '温和而坚定，是边界最美的样子。',
      '请求是邀请，命令是控制。',
      '热情不是直线，是循环。'
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    this.setData({
      dailyQuote: randomQuote
    });

    wx.showToast({
      title: '金句已刷新',
      icon: 'none'
    });
  }
});
