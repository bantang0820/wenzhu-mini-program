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

  onShow: function() {
    if (this.data.albumId) {
      this.loadAlbumDetail(this.data.albumId);
    }
  },

  loadAlbumDetail: function(albumId) {
    const isPro = getApp().globalData.isMember || false;
    this.setData({ isPro }); // 同步更新本地 isPro 状态

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
        chapters: this.generateNVCChapters(isPro)
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

  generateNVCChapters: function(isPro) {
    const chapters = [
      { id: 1, title: '区分观察与评论', subtitle: '我看见在那', completedCount: 3, locked: false },
      { id: 2, title: '体会感受的力量', subtitle: '因为在乎', completedCount: 0, locked: true },
      { id: 3, title: '看见内在的需要', subtitle: '情绪背后', completedCount: 0, locked: true },
      { id: 4, title: '提出具体的请求', subtitle: '我要什么', completedCount: 0, locked: true },
      { id: 5, title: '全身心地倾听', subtitle: '先听再说', completedCount: 0, locked: true },
      { id: 6, title: '爱自己的语言', subtitle: '对自己温柔', completedCount: 0, locked: true },
      { id: 7, title: '表达愤怒', subtitle: '受伤的呐喊', completedCount: 0, locked: true },
      { id: 8, title: '表达感激', subtitle: '具体的赞美', completedCount: 0, locked: true },
      { id: 9, title: '学会说不', subtitle: '温和拒绝', completedCount: 0, locked: true },
      { id: 10, title: '重获生活热情', subtitle: '爱在流动', completedCount: 0, locked: true }
    ];

    // 如果是会员，全部解锁
    if (isPro) {
      return chapters.map(c => ({ ...c, locked: false }));
    }
    return chapters;
  },

  onChapterTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const locked = e.currentTarget.dataset.locked;
    const isMember = getApp().globalData.isMember || false;

    console.log('--- 章节点击拦截检查 (增强版) ---');
    console.log('章节 ID:', id);
    console.log('锁定状态 (原始):', locked);
    console.log('锁定状态 (转字符串):', String(locked));
    console.log('会员状态:', isMember);

    // 使用最稳妥的判断方式：显式检查字符串 "true" 或 布尔值 true
    const isActuallyLocked = (locked === true || String(locked) === 'true');

    if (isActuallyLocked && !isMember) {
      console.log('！拦截成功：准备跳转到 Pro 页面');
      wx.navigateTo({
        url: '/pages/pro/pro',
        success: () => console.log('跳转 Pro 成功'),
        fail: (err) => console.error('跳转 Pro 失败', err)
      });
      return;
    }

    console.log('✓ 放行：进入章节详情页');
    wx.navigateTo({
      url: '/pages/chapter/chapter?albumId=' + this.data.albumId + '&chapterId=' + id
    });
  }
});
