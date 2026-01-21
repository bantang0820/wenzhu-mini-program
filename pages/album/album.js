// pages/album/album.js - 专辑详情页
Page({
  data: {
    albumId: '',
    album: null,
    completedCount: 0,
    totalCount: 100
  },

  onLoad: function(options) {
    var id = options.id;
    this.setData({ albumId: id });
    this.loadAlbumDetail(id);
  },

  loadAlbumDetail: function(albumId) {
    var albumData = {
      nvc: {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: '100修',
        shortDesc: '找回连结',
        icon: '🦒',
        progress: 12,
        colorStart: 'rgba(143, 169, 152, 0.85)',
        colorEnd: 'rgba(117, 138, 126, 0.75)',
        tag: '沟通技巧',
        chapters: this.generateNVCChapters()
      },
      adler: {
        id: 'adler',
        title: '课题分离',
        subtitle: '100修',
        shortDesc: '建立边界',
        icon: '🏔️',
        progress: 0,
        colorStart: 'rgba(136, 157, 168, 0.85)',
        colorEnd: 'rgba(114, 133, 148, 0.75)',
        tag: '边界感',
        chapters: []
      },
      self: {
        id: 'self',
        title: '自我关怀',
        subtitle: '100修',
        shortDesc: '接纳自己',
        icon: '🤗',
        progress: 0,
        colorStart: 'rgba(198, 163, 165, 0.75)',
        colorEnd: 'rgba(178, 148, 152, 0.65)',
        tag: '情绪疗愈',
        chapters: []
      },
      growth: {
        id: 'growth',
        title: '成长型思维',
        subtitle: '100修',
        shortDesc: '激发动力',
        icon: '🌱',
        progress: 0,
        colorStart: 'rgba(158, 146, 168, 0.75)',
        colorEnd: 'rgba(140, 130, 152, 0.65)',
        tag: '能力培养',
        chapters: []
      }
    };

    var album = albumData[albumId];
    if (album) {
      var completedCount = Math.floor(album.progress);
      this.setData({
        album: album,
        completedCount: completedCount,
        totalCount: 100
      });
    }
  },

  generateNVCChapters: function() {
    return [
      { id: 1, title: '区分观察与评论', subtitle: '我看见在那', completedCount: 3, locked: false },
      { id: 2, title: '体会感受的力量', subtitle: '因为在乎', completedCount: 0, locked: false },
      { id: 3, title: '看见内在的需要', subtitle: '情绪背后', completedCount: 0, locked: false },
      { id: 4, title: '提出具体的请求', subtitle: '我要什么', completedCount: 0, locked: true },
      { id: 5, title: '全身心地倾听', subtitle: '先听再说', completedCount: 0, locked: true },
      { id: 6, title: '爱自己的语言', subtitle: '对自己温柔', completedCount: 0, locked: true },
      { id: 7, title: '表达愤怒', subtitle: '受伤的呐喊', completedCount: 0, locked: true },
      { id: 8, title: '表达感激', subtitle: '具体的赞美', completedCount: 0, locked: true },
      { id: 9, title: '学会说不', subtitle: '温和拒绝', completedCount: 0, locked: true },
      { id: 10, title: '重获生活热情', subtitle: '爱在流动', completedCount: 0, locked: true }
    ];
  },

  onChapterTap: function(e) {
    var id = e.currentTarget.dataset.id;
    var locked = e.currentTarget.dataset.locked;

    if (locked) {
      wx.showToast({
        title: '请先完成上一章节',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/chapter/chapter?albumId=' + this.data.albumId + '&chapterId=' + id
    });
  }
});
