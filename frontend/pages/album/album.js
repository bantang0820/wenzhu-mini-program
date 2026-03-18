// pages/album/album.js - 专辑详情页
const api = require('../../utils/api.js');

Page({
  data: {
    albumId: '',
    album: null,
    chapters: [],
    completedCount: 0,
    totalCount: 0,
    loading: true
  },

  onLoad: function(options) {
    const id = options.id;
    this.setData({ albumId: id });
    this.loadAlbumDetail(id);
  },

  onShow: function() {
    if (this.data.albumId) {
      this.loadAlbumDetail(this.data.albumId);
    }
  },

  // 加载专辑详情
  async loadAlbumDetail(albumId) {
    try {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      // 获取专辑详情
      const albumResult = await api.get(`/albums/${albumId}`);

      if (!albumResult.success || !albumResult.data) {
        throw new Error('获取专辑信息失败');
      }

      // 获取章节列表
      const chaptersResult = await api.get(`/albums/${albumId}/chapters`, null, true);

      if (!chaptersResult.success) {
        throw new Error('获取章节列表失败');
      }

      const album = this.normalizeAlbum(albumResult.data, albumId);
      const chapters = (chaptersResult.data || []).slice(0, 10).map((item) => this.normalizeChapter(item));
      this.applyAlbumData(album, chapters);

      console.log('专辑数据加载成功:', album.id);
      console.log('章节数量:', chapters.length);
    } catch (err) {
      console.error('加载专辑详情失败:', err);
      const fallback = this.getFallbackAlbumData(albumId);
      this.applyAlbumData(fallback.album, fallback.chapters);
      wx.showToast({
        title: '已加载离线章节',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  applyAlbumData(album, chapters) {
    const safeAlbum = album || this.getFallbackAlbumData(this.data.albumId || 'nvc').album;
    const safeChapters = Array.isArray(chapters) && chapters.length > 0
      ? chapters
      : this.getFallbackAlbumData(this.data.albumId || 'nvc').chapters;

    const completedCount = safeChapters.filter((item) => {
      const completed = item.completedCount || item.completed_count || 0;
      return Number(completed) > 0;
    }).length;

    this.setData({
      album: safeAlbum,
      chapters: safeChapters,
      completedCount,
      totalCount: safeChapters.length,
      loading: false
    });
  },

  normalizeAlbum(rawAlbum, fallbackId) {
    if (!rawAlbum) return this.getFallbackAlbumData(fallbackId || 'nvc').album;
    const albumId = rawAlbum.id || fallbackId || 'nvc';
    const theme = this.getAlbumTheme(albumId);

    return {
      id: albumId,
      title: rawAlbum.title || '',
      subtitle: rawAlbum.subtitle || '',
      shortDesc: rawAlbum.shortDesc || rawAlbum.short_desc || '',
      icon: rawAlbum.icon || '📘',
      progress: Number(rawAlbum.progress || 0),
      // 为已知专题固定为阅见页同款莫兰迪配色，避免接口色值导致 UI 突变
      colorStart: (theme && theme.colorStart) || rawAlbum.colorStart || rawAlbum.color_start || '#C7B9A8',
      colorEnd: (theme && theme.colorEnd) || rawAlbum.colorEnd || rawAlbum.color_end || '#B6AA9B',
      tag: rawAlbum.tag || '专题',
      isFree: !!(rawAlbum.isFree || rawAlbum.is_free)
    };
  },

  getAlbumTheme(albumId) {
    const themes = {
      nvc: { colorStart: '#A2B59F', colorEnd: '#8E9E8B' },
      adler: { colorStart: '#B0C1D1', colorEnd: '#9DAABF' },
      self: { colorStart: '#D9BDBD', colorEnd: '#C6A4A4' },
      growth: { colorStart: '#BDB2C9', colorEnd: '#A99DB5' }
    };
    return themes[albumId] || null;
  },

  normalizeChapter(rawChapter) {
    if (!rawChapter) return null;

    // 确保章节ID在1-10范围内
    const chapterId = Number(rawChapter.id) || 1;
    const safeId = chapterId > 10 ? 10 : (chapterId < 1 ? 1 : chapterId);

    return {
      id: safeId,
      title: rawChapter.title || '',
      subtitle: rawChapter.subtitle || '',
      locked: !!(rawChapter.locked === true || rawChapter.locked === 1 || rawChapter.locked === '1'),
      completedCount: Number(rawChapter.completedCount || rawChapter.completed_count || 0)
    };
  },

  getFallbackAlbumData(albumId) {
    const fallbackAlbums = {
      nvc: {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: 'Micro Course',
        shortDesc: '爱的语言，让理解自然发生',
        icon: '🌿',
        progress: 12,
        colorStart: '#A2B59F',
        colorEnd: '#8E9E8B',
        tag: '沟通技巧',
        isFree: true
      },
      adler: {
        id: 'adler',
        title: '课题分离',
        subtitle: 'Micro Course',
        shortDesc: '找回边界，获得真正的自由',
        icon: '🎯',
        progress: 0,
        colorStart: '#B0C1D1',
        colorEnd: '#9DAABF',
        tag: '边界感',
        isFree: false
      },
      self: {
        id: 'self',
        title: '自我关怀',
        subtitle: 'Micro Course',
        shortDesc: '接纳不完美，给自己一个拥抱',
        icon: '💛',
        progress: 0,
        colorStart: '#D9BDBD',
        colorEnd: '#C6A4A4',
        tag: '情绪疗愈',
        isFree: false
      },
      growth: {
        id: 'growth',
        title: '成长型思维',
        subtitle: 'Micro Course',
        shortDesc: '激发潜能，看见成长的力量',
        icon: '🚀',
        progress: 0,
        colorStart: '#BDB2C9',
        colorEnd: '#A99DB5',
        tag: '能力培养',
        isFree: false
      }
    };

    const baseAlbum = fallbackAlbums[albumId] || fallbackAlbums.nvc;
    const isMember = !!(getApp().globalData.isMember);

    const chapterTitles = [
      '区分观察与评论',
      '体会感受的力量',
      '看见内在的需要',
      '提出具体的请求',
      '全身心地倾听',
      '爱自己的语言',
      '表达愤怒',
      '表达感激',
      '学会说"不"',
      '重获生活热情'
    ];

    const chapterSubtitles = [
      '我看见在那，而不是我认为',
      '因为在乎，所以有情绪',
      '情绪背后，匮乏了什么',
      '我要什么，而不是不要什么',
      '先不急着建议，先听',
      '对自己也要非暴力',
      '愤怒是受伤的呐喊',
      '具体的赞美更有力量',
      '温和而坚定地拒绝',
      '让爱在家庭流动'
    ];

    const chapters = chapterTitles.slice(0, 10).map((title, index) => ({
      id: index + 1,
      title,
      subtitle: chapterSubtitles[index],
      locked: !isMember && index > 0,
      completedCount: 0
    }));

    return {
      album: baseAlbum,
      chapters
    };
  },

  // 点击章节
  onChapterTap: function(e) {
    const { id, locked } = e.currentTarget.dataset;
    const isMember = getApp().globalData.isMember || false;

    console.log('章节点击:', id, '锁定:', locked, '会员:', isMember);

    // 检查是否需要会员权限
    const isActuallyLocked = locked === true || String(locked) === 'true';

    if (isActuallyLocked && !isMember) {
      wx.navigateTo({
        url: '/pages/pro/pro',
        success: () => console.log('跳转 Pro 成功'),
        fail: (err) => console.error('跳转 Pro 失败', err)
      });
      return;
    }

    // 进入章节详情页
    this.safeNavigate(`/pages/chapter/chapter?albumId=${encodeURIComponent(this.data.albumId)}&chapterId=${encodeURIComponent(id)}`);
  },

  safeNavigate(url) {
    const pageStack = getCurrentPages();
    const preferRedirect = pageStack.length >= 10;
    const primaryMethod = preferRedirect ? 'redirectTo' : 'navigateTo';
    const fallbackMethod = preferRedirect ? 'navigateTo' : 'redirectTo';

    wx[primaryMethod]({
      url,
      fail: (err) => {
        const errMsg = (err && err.errMsg) || '';
        console.error(`页面跳转失败(${primaryMethod}):`, err);

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
  }
});
