// pages/album/album.js - 专辑详情页
const api = require('../../utils/api.js');

Page({
  data: {
    albumId: '',
    album: null,
    chapters: [],
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
      const chaptersResult = await api.get(`/albums/${albumId}/chapters`, null, false);

      if (!chaptersResult.success) {
        throw new Error('获取章节列表失败');
      }

      const album = albumResult.data;
      const chapters = chaptersResult.data || [];

      this.setData({
        album: album,
        chapters: chapters,
        loading: false
      });

      console.log('专辑数据加载成功:', album);
      console.log('章节数量:', chapters.length);
    } catch (err) {
      console.error('加载专辑详情失败:', err);

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });

      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
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
    wx.navigateTo({
      url: `/pages/chapter/chapter?albumId=${this.data.albumId}&chapterId=${id}`
    });
  }
});
