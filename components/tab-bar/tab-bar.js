// components/tab-bar/tab-bar.js
Component({
  data: {
    selected: 0,
    tabs: [
      {
        pagePath: "pages/index/index",
        text: "稳住",
        icon: "🧘"
      },
      {
        pagePath: "pages/content/content",
        text: "阅见",
        icon: "📚"
      },
      {
        pagePath: "pages/stats/stats",
        text: "觉察",
        icon: "📈"
      },
      {
        pagePath: "pages/profile/profile",
        text: "本心",
        icon: "💎"
      }
    ]
  },

  methods: {
    switchTab(e) {
      const { path } = e.currentTarget.dataset;
      wx.switchTab({
        url: `/${path}`
      });
    }
  },

  lifetimes: {
    attached() {
      // 获取当前页面路径
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage.route;

      // 更新选中状态
      const selected = this.data.tabs.findIndex(tab => tab.pagePath === currentRoute);
      if (selected !== -1) {
        this.setData({ selected });
      }
    }
  }
});
