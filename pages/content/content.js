// pages/content/content.js
Page({
  data: {
    albums: [],
    dailyQuote: '我观察到你不高兴，而不是你在闹脾气。'
  },

  onLoad: function() {
    this.loadAlbums();
  },

  loadAlbums: function() {
    var albums = [
      {
        id: 'nvc',
        title: '非暴力沟通',
        subtitle: '100句',
        desc: '马歇尔博士的爱的语言',
        icon: '🦒',
        progress: 12,
        tag: '沟通技巧',
        colorStart: 'rgba(143, 169, 152, 0.85)',
        colorEnd: 'rgba(117, 138, 126, 0.75)'
      },
      {
        id: 'adler',
        title: '课题分离',
        subtitle: '100句',
        desc: '阿德勒心理学边界指南',
        icon: '🏔️',
        progress: 0,
        tag: '边界感',
        colorStart: 'rgba(136, 157, 168, 0.85)',
        colorEnd: 'rgba(114, 133, 148, 0.75)'
      },
      {
        id: 'self',
        title: '自我关怀',
        subtitle: '100句',
        desc: '接纳不完美的自己',
        icon: '🤗',
        progress: 0,
        tag: '情绪疗愈',
        colorStart: 'rgba(198, 163, 165, 0.75)',
        colorEnd: 'rgba(178, 148, 152, 0.65)'
      },
      {
        id: 'growth',
        title: '成长型思维',
        subtitle: '100句',
        desc: '鼓励孩子激发内在动力',
        icon: '🌱',
        progress: 0,
        tag: '能力培养',
        colorStart: 'rgba(158, 146, 168, 0.75)',
        colorEnd: 'rgba(140, 130, 152, 0.65)'
      }
    ];

    this.setData({ albums: albums });
  },

  onAlbumTap: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.vibrateShort();
    wx.navigateTo({
      url: '/pages/album/album?id=' + id
    });
  },

  onDailyTap: function() {
    wx.vibrateShort();
    wx.showToast({
      title: '金句已刷新',
      icon: 'none'
    });
  }
});
