// pages/content/content.js
const { quotes: quotesData } = require('./quotes-data.js');
const {
  hasCustomCourse,
  getCustomCourseChapterMeta
} = require('../../data/adler-course.js');

const ALBUM_PROGRESS_KEY = 'albumProgress';
const LAST_READ_POSITION_KEY = 'last_read_position';
const LAST_READ_LESSON_KEY = 'last_read_lesson';
const LESSONS_PER_ALBUM = 100;

Page({
  data: {
    albums: [
      {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: 'Micro Course',
        desc: '爱的语言，让理解自然发生',
        actionText: '点击开启沟通之旅 >',
        progress: 0,
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
    lastReadLesson: '',
    lastReadPosition: null
  },

  onLoad: function() {
    console.log('阅见页面加载中...');
    this.checkProStatus();
    this.setDailyDate();
    this.loadLastRead();
    this.loadAlbumProgress(); // 加载实际学习进度
    this.refreshQuote(); // 初始加载一个随机金句
  },

  onShow: function() {
    this.checkProStatus();
    this.loadLastRead();
    this.loadAlbumProgress(); // 每次显示时更新进度
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
      const lastReadPosition = wx.getStorageSync(LAST_READ_POSITION_KEY) || null;
      const lastReadLesson = wx.getStorageSync(LAST_READ_LESSON_KEY) || '';
      if (lastReadPosition || lastReadLesson) {
        this.setData({
          lastReadPosition,
          lastReadLesson: (lastReadPosition && lastReadPosition.display) || lastReadLesson
        });
      }
    } catch (e) {
      console.log('读取最近在读失败', e);
    }
  },

  // 加载专辑学习进度
  loadAlbumProgress: function() {
    try {
      const albumProgress = wx.getStorageSync(ALBUM_PROGRESS_KEY) || {};
      const albums = this.data.albums.map(album => {
        const progressData = albumProgress[album.id];
        if (!progressData) return album;

        const chapterMap = progressData.completedLessonsByChapter || {};
        const chapterKeys = Object.keys(chapterMap);
        const chapterLessonCount = chapterKeys.reduce((sum, key) => {
          const ids = this.normalizeIdList(chapterMap[key]);
          return sum + new Set(ids).size;
        }, 0);
        const visitedMap = progressData.visitedLessonsByChapter || {};
        const visitedKeys = Object.keys(visitedMap);
        const visitedLessonCountFromMap = visitedKeys.reduce((sum, key) => {
          const ids = this.normalizeIdList(visitedMap[key]);
          return sum + new Set(ids).size;
        }, 0);
        const fallbackChapterCount = Array.isArray(progressData.completedChapters)
          ? progressData.completedChapters.length
          : 0;
        const completedLessonCount = progressData.completedLessonCount || chapterLessonCount || (fallbackChapterCount * 10);
        const visitedLessonCount = progressData.visitedLessonCount || visitedLessonCountFromMap;
        const learnedLessonCount = Math.max(completedLessonCount, visitedLessonCount);
        const totalLessons = progressData.totalLessons || LESSONS_PER_ALBUM;
        const progress = Math.max(0, Math.min(100, Math.round((learnedLessonCount / totalLessons) * 100)));

        return {
          ...album,
          progress
        };
      });

      this.setData({
        albums
      });

      console.log('专辑进度更新:', albums.map(a => `${a.id}: ${a.progress}%`));
    } catch (e) {
      console.log('读取专辑进度失败', e);
    }
  },

  normalizeIdList(rawValue) {
    if (Array.isArray(rawValue)) {
      return rawValue.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
    }

    if (rawValue === null || rawValue === undefined) {
      return [];
    }

    if (typeof rawValue === 'number') {
      return Number.isNaN(rawValue) ? [] : [rawValue];
    }

    if (typeof rawValue === 'string') {
      return rawValue
        .split(',')
        .map((item) => Number(String(item).trim()))
        .filter((id) => !Number.isNaN(id));
    }

    if (typeof rawValue === 'object') {
      return Object.values(rawValue)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
    }

    return [];
  },

  onAlbumTap: function(e) {
    const { id, index } = e.currentTarget.dataset;
    const album = this.data.albums[index];
    const isPro = getApp().globalData.isMember;

    console.log('点击专辑，ID:', id, 'Pro状态:', isPro);
    wx.vibrateShort();

    // 检查权限
    if (album && !album.isFree && !isPro) {
      this.safeNavigate('/pages/pro/pro');
      return;
    }

    if (!id) {
      console.error('专辑ID为空');
      return;
    }

    // 仅在首次进入时设置默认“最近在读”，避免覆盖真实阅读位置
    const lastReadPosition = wx.getStorageSync(LAST_READ_POSITION_KEY);
    const lastReadLesson = wx.getStorageSync(LAST_READ_LESSON_KEY);
    if (!lastReadPosition && !lastReadLesson) {
      this.saveLastRead(this.getDefaultLastReadLabel(id));
    }

    // 跳转到专辑详情页（展示10个章节列表）
    this.openAlbumPage(id);
  },

  openAlbumPage: function(id) {
    const url = `/pages/album/album?id=${encodeURIComponent(id)}`;
    this.safeNavigate(url);
  },

  onContinueRead: function() {
    wx.vibrateShort();
    const lastReadPosition = this.data.lastReadPosition || wx.getStorageSync(LAST_READ_POSITION_KEY);

    if (!lastReadPosition || !lastReadPosition.albumId || !lastReadPosition.chapterId || !lastReadPosition.lessonId) {
      this.openAlbumPage('nvc');
      return;
    }

    const album = this.data.albums.find((item) => item.id === lastReadPosition.albumId);
    if (album && album.isLocked) {
      this.safeNavigate('/pages/pro/pro');
      return;
    }

    const url = `/pages/lesson/lesson?id=${encodeURIComponent(lastReadPosition.lessonId)}&albumId=${encodeURIComponent(lastReadPosition.albumId)}&chapterId=${encodeURIComponent(lastReadPosition.chapterId)}`;
    this.safeNavigate(url);
  },

  getDefaultLastReadLabel: function(albumId) {
    if (hasCustomCourse(albumId)) {
      const chapterMeta = getCustomCourseChapterMeta(albumId, 1);
      return `第1章 · ${chapterMeta.title}`;
    }

    return '第1章 · 区分观察与评论';
  },

  safeNavigate: function(url) {
    const pageStack = getCurrentPages();
    const preferRedirect = pageStack.length >= 10;
    const primaryMethod = preferRedirect ? 'redirectTo' : 'navigateTo';
    const fallbackMethod = preferRedirect ? 'navigateTo' : 'redirectTo';

    wx[primaryMethod]({
      url,
      fail: (err) => {
        const errMsg = (err && err.errMsg) || '';
        console.error(`页面跳转失败(${primaryMethod}):`, err);

        // 页面栈过深时，自动切换为 redirectTo 再试一次
        if (!preferRedirect && /limit exceed|page stack|webview count limit/i.test(errMsg)) {
          wx[fallbackMethod]({
            url,
            fail: (redirectErr) => {
              console.error(`页面跳转失败(${fallbackMethod}):`, redirectErr);
              wx.showToast({
                title: '跳转失败',
                icon: 'none'
              });
            }
          });
          return;
        }

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
      wx.setStorageSync(LAST_READ_LESSON_KEY, lessonTitle);
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
