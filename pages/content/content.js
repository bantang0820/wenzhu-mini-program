// pages/content/content.js
const { quotes: quotesData } = require('./quotes-data.js');

Page({
  data: {
    albums: [
      {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: 'Micro Course',
        desc: '爱的语言，让理解自然发生',
        actionText: '点击开启沟通之旅 >',
        progress: 12,
        tag: '沟通技巧',
        isFree: true
      },
      {
        id: 'adler',
        title: '课题分离',
        subtitle: 'Micro Course',
        desc: '找回边界，获得真正的自由',
        actionText: '掌握人际关系钥匙 >',
        progress: 0,
        tag: '边界感',
        isFree: false
      },
      {
        id: 'self',
        title: '自我关怀',
        subtitle: 'Micro Course',
        desc: '接纳不完美，给自己一个拥抱',
        actionText: '开启心灵疗愈空间 >',
        progress: 0,
        tag: '情绪疗愈',
        isFree: false
      },
      {
        id: 'growth',
        title: '成长型思维',
        subtitle: 'Micro Course',
        desc: '激发潜能，看见成长的力量',
        actionText: '探索无限可能未来 >',
        progress: 0,
        tag: '能力培养',
        isFree: false
      }
    ],
    dailyQuote: '',
    dailyDate: '',
    lastReadLesson: ''
  },

  onLoad: function() {
    console.log('阅见页面加载中...');
    this.checkProStatus();
    this.setDailyDate();
    this.loadLastRead();
    this.refreshQuote(); // 初始加载一个随机金句
  },

  onShow: function() {
    this.checkProStatus();
  },

  // 检查会员状态并更新列表显示
  checkProStatus: function() {
    const isPro = getApp().globalData.isMember;
    const albums = this.data.albums.map(album => {
      return {
        ...album,
        isLocked: !album.isFree && !isPro
      };
    });
    this.setData({
      isPro,
      albums
    });
  },

  // 刷新金句逻辑
  refreshQuote: function() {
    if (quotesData && quotesData.length > 0) {
      const randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
      this.setData({
        dailyQuote: randomQuote
      });
    }
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

  onAlbumTap: function(e) {
    const { id, index } = e.currentTarget.dataset;
    const album = this.data.albums[index];
    const isPro = getApp().globalData.isMember;

    console.log('点击专辑，ID:', id, 'Pro状态:', isPro);
    wx.vibrateShort();

    // 检查权限
    if (album && !album.isFree && !isPro) {
      wx.showModal({
        title: 'Pro 专属课程',
        content: '该专题课程为 Pro 会员专属深度学习内容，开通后即可解锁全站所有主题。',
        confirmText: '去开通',
        confirmColor: '#D4AF37',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/pro/pro' });
          }
        }
      });
      return;
    }

    if (!id) {
      console.error('专辑ID为空');
      return;
    }

    // 保存最近在读记录
    this.saveLastRead('第1章 · 区分观察与评论');

    // 跳转到专辑详情页（展示10个章节列表）
    wx.navigateTo({
      url: '/pages/album/album?id=' + id,
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
    this.refreshQuote();
    wx.showToast({
      title: '金句已刷新',
      icon: 'none'
    });
  }
});
