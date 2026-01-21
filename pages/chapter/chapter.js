// pages/chapter/chapter.js - 章节详情页
Page({
  data: {
    albumId: '',
    chapterId: '',
    chapter: null,
    sentences: [],
    completedCount: 0
  },

  onLoad(options) {
    const { albumId, chapterId } = options;
    this.setData({ albumId, chapterId });
    this.loadChapterDetail(albumId, chapterId);
  },

  // 加载章节详情
  loadChapterDetail(albumId, chapterId) {
    // 模拟章节数据
    const chapterData = {
      title: this.getChapterTitle(parseInt(chapterId)),
      subtitle: this.getChapterSubtitle(parseInt(chapterId)),
      id: chapterId
    };

    // 生成10个练习句
    const sentences = this.generateSentences(albumId, parseInt(chapterId));

    // 计算完成数
    const completedCount = sentences.filter(s => s.completed).length;

    this.setData({
      chapter: chapterData,
      sentences,
      completedCount
    });
  },

  // 获取章节标题
  getChapterTitle(chapterId) {
    const titles = [
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
    return titles[chapterId - 1] || '章节标题';
  },

  // 获取章节副标题
  getChapterSubtitle(chapterId) {
    const subtitles = [
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
    return subtitles[chapterId - 1] || '章节副标题';
  },

  // 生成练习句
  generateSentences(albumId, chapterId) {
    // 这里是示例数据，实际应从服务器获取
    const demoSentences = [
      {
        id: 1,
        content: '宝贝，我看到你的积木撒了一地，而不是说你总是乱扔东西。',
        scenario: '孩子乱扔玩具',
        completed: false
      },
      {
        id: 2,
        content: '我注意到你今天还没有开始写作业，这是观察，不是批评。',
        scenario: '写作业拖延',
        completed: false
      },
      {
        id: 3,
        content: '我看到碗里剩下一半蔬菜，而不是说你挑食。',
        scenario: '吃饭问题',
        completed: false
      },
      {
        id: 4,
        content: '我观察到你现在已经晚上10点了，而不是说你又在磨蹭。',
        scenario: '睡觉拖延',
        completed: false
      },
      {
        id: 5,
        content: '我看到你把颜料弄到桌子上了，我们需要一起清理。',
        scenario: '画画弄脏',
        completed: false
      },
      {
        id: 6,
        content: '我注意到你在看电视时声音开得很大，而不是说你不懂得控制。',
        scenario: '看电视声音大',
        completed: false
      },
      {
        id: 7,
        content: '我看到你把玩具都倒在客厅地上了，这让我觉得有点乱。',
        scenario: '玩具到处乱放',
        completed: false
      },
      {
        id: 8,
        content: '我观察到你今天还没有刷牙，而不是说你总是不讲卫生。',
        scenario: '刷牙拖延',
        completed: false
      },
      {
        id: 9,
        content: '我看到你今天穿了三件衣服，而不是说你又乱穿衣服。',
        scenario: '穿衣问题',
        completed: false
      },
      {
        id: 10,
        content: '我注意到你今天还没有换尿布，需要我帮你换吗？',
        scenario: '换尿布',
        completed: false
      }
    ];

    // 根据专辑和章节生成不同的内容
    // 这里先返回示例数据
    return demoSentences;
  },

  // 点击练习按钮
  onPracticeTap(e) {
    const { id, content } = e.currentTarget.dataset;
    wx.vibrateShort({ type: 'light' });

    // TODO: 实现朗读功能
    wx.showModal({
      title: '开始练习',
      content: `即将朗读：\n\n${content}`,
      confirmText: '开始',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '朗读功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 点击完成按钮
  onCompleteTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.vibrateShort({ type: 'light' });

    // 切换完成状态
    const sentences = this.data.sentences.map(item => {
      if (item.id === id) {
        return {
          ...item,
          completed: !item.completed
        };
      }
      return item;
    });

    // 重新计算完成数
    const completedCount = sentences.filter(s => s.completed).length;

    this.setData({ sentences, completedCount });

    // 保存到本地存储
    this.saveProgress(sentences, completedCount);

    if (completedCount > this.data.completedCount) {
      wx.showToast({
        title: '已完成 +1',
        icon: 'success'
      });
    }
  },

  // 保存进度
  saveProgress(sentences, completedCount) {
    const { albumId, chapterId } = this.data;
    const key = `chapter_${albumId}_${chapterId}`;

    wx.setStorageSync(key, {
      sentences,
      completedCount,
      updateTime: Date.now()
    });
  },

  // 完成本章节
  onCompleteChapter() {
    wx.vibrateShort({ type: 'heavy' });

    wx.showModal({
      title: '恭喜完成',
      content: `本章节已完成 ${this.data.completedCount}/10 句，确定要完成并解锁下一章吗？`,
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          // TODO: 更新服务器进度，解锁下一章
          wx.showToast({
            title: '章节已完成',
            icon: 'success',
            duration: 2000
          });

          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      }
    });
  }
});
