// pages/detail/detail.js - 原研哉式极简主义完整版
Page({
  data: {
    scenario: {}, // 场景数据
    currentText: '', // 当前金句
    displayText: '', // 打字机显示的文字
    currentDate: '', // 当前日期

    // 阶段管理
    currentPhase: 'holding', // holding | reading | status-check | completed

    // 第一阶段：长按止颤
    isDarkMode: false,
    isStabilizing: false,
    isStabilized: false,
    isHolding: false,
    holdProgress: 0,
    holdTimer: null,
    progressTimer: null,

    // 第二阶段：三轮朗读
    readingRound: 1, // 当前第几轮（1-3）
    totalRounds: 3, // 总轮数
    allMantras: [], // 所有轮次的文案
    backgroundBrightness: 30, // 背景亮度（30-100），第一轮最暗

    showGuide: false, // 显示引导语
    guideText: '', // 引导文案（根据轮次动态生成）
    showStamp: false, // 显示录音按钮（延迟后）
    stampHintText: '', // 提示文字（已废弃）
    typewriterTimer: null,
    readingTimer: null,

    // 录音相关
    isRecording: false,
    hasRecorded: false,
    recordedFilePath: '',
    isPlaying: false,
    recordingTimer: null,

    // 第三阶段：状态询问
    showStatusCheck: false, // 显示状态询问卡片

    // 治愈卡片
    showHealingCard: false, // 显示治愈分享卡片
    healingQuote: '', // 治愈的话

    // 修复指南
    showRepairGuide: false, // 显示修复指南付费墙

    // 第四阶段：完成
    showCompleted: false,
    isCompleted: false,

    // 通用
    showRipple: false,
    HOLD_DURATION: 2000, // 按住2秒
    REVEAL_DELAY: 3000, // 完成后停留3秒
    TYPEWRITER_SPEED: 80, // 打字机速度
    READING_DELAY: 3000, // 留白时间（3秒）
  },

  onLoad(options) {
    const { id } = options;
    this.loadScenario(id);
    this.setCurrentDate();
  },

  onUnload() {
    this.clearAllTimers();
  },

  // 清理所有定时器
  clearAllTimers() {
    if (this.data.holdTimer) clearTimeout(this.data.holdTimer);
    if (this.data.progressTimer) clearInterval(this.data.progressTimer);
    if (this.data.typewriterTimer) clearInterval(this.data.typewriterTimer);
    if (this.data.readingTimer) clearTimeout(this.data.readingTimer);
  },

  // 设置当前日期
  setCurrentDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    this.setData({
      currentDate: `${month}月${day}日`
    });
  },

  // 获取当前轮次的引导语
  getGuideText(round) {
    const guideTexts = {
      1: '请轻声朗读，让情绪流过你的身体',
      2: '把这句话读给自己听，找回你的力量',
      3: '深呼吸，让这句话真正进入心里'
    };
    return guideTexts[round] || guideTexts[1];
  },

  // 加载场景数据
  loadScenario(id) {
    const mockData = {
      "001": {
        id: "001",
        title: "孩子磨蹭",
        category: "焦虑",
        // 稳住引导语（第一阶段）
        stabilizeText: "深呼吸，稳住。这只是情绪，不是事实。",
        // 三阶定心文案
        mantras: [
          // 第一轮：承认
          "我承认我现在很焦虑，这没关系。这只是情绪，不是事实。",
          // 第二轮：抽离
          "我把期待暂时放下。孩子是孩子，我是我。我不必控制一切。",
          // 第三轮：归位
          "我是稳稳的。我有能力处理好这一刻。我也爱我自己。"
        ],
        // 治愈的话
        healingQuote: "现在的你，已经找回了耐心和温柔。去抱抱那个正在探索世界的孩子吧，他知道你会等他。"
      },
      "002": {
        id: "002",
        title: "孩子大哭",
        category: "无助",
        stabilizeText: "允许自己脆弱，深呼吸，稳住。",
        mantras: [
          "我承认我现在很无助，这没关系。眼泪需要流淌，我允许自己脆弱。",
          "我把'必须立刻制止他'的念头放下。他的哭泣是情绪的出口，不是对我的控诉。",
          "我是稳稳的。我可以做一个容器，托住他的眼泪，也托住自己。"
        ],
        healingQuote: "眼泪流干了，爱就浮现了。现在的你，是孩子最安全的港湾。轻轻告诉他：妈妈在这里。"
      },
      "003": {
        id: "003",
        title: "不听话",
        category: "愤怒",
        stabilizeText: "愤怒是身体的信号，深呼吸，稳住。",
        mantras: [
          "我承认我现在很愤怒，这没关系。愤怒是身体的信号，我不必自责。",
          "我把'他必须听话'的期待放下。他在探索边界，这是成长的必经之路。",
          "我是稳稳的。温和而坚定，我可以设立界限，也保护我们的关系。"
        ],
        healingQuote: "你的温柔和坚定，是最好的教育。现在的你，可以蹲下来，看着他的眼睛说：我爱你，但我们需要遵守规则。"
      }
    };

    const scenario = mockData[id] || mockData["001"];

    this.setData({
      scenario: scenario,
      currentText: scenario.stabilizeText, // 第一阶段：稳住引导语
      displayText: scenario.stabilizeText, // 直接显示完整文字
      allMantras: scenario.mantras, // 保存所有轮次的文案
      healingQuote: scenario.healingQuote // 保存治愈的话
    });
  },

  // ========== 第一阶段：长按止颤 ==========

  onHoldStart(e) {
    if (this.data.isStabilized) return;

    this.setData({
      isHolding: true,
      isDarkMode: true,
      isStabilizing: true, // 触发稳定化动画
      holdProgress: 0
    });

    wx.vibrateShort({ type: 'heavy' });

    // 震动强度逐渐降低
    let vibrationIntensity = 'heavy';
    const progressTimer = setInterval(() => {
      if (this.data.holdProgress < 100) {
        const newProgress = Math.min(100, Math.round(this.data.holdProgress + 3.33));
        this.setData({
          holdProgress: newProgress
        });

        // 根据进度调整震动强度
        if (newProgress >= 70 && vibrationIntensity === 'heavy') {
          vibrationIntensity = 'medium';
        } else if (newProgress >= 40 && vibrationIntensity === 'medium') {
          vibrationIntensity = 'light';
        }
      }
    }, 100);

    const holdTimer = setTimeout(() => {
      this.onHoldComplete();
    }, this.data.HOLD_DURATION);

    this.setData({ progressTimer, holdTimer });
  },

  onHoldEnd(e) {
    if (this.data.isStabilized) return;

    this.clearAllTimers();

    if (this.data.holdProgress < 100) {
      // 松手时恢复颤抖
      this.setData({
        isHolding: false,
        isDarkMode: false,
        isStabilizing: false,
        holdProgress: 0
      });
    }
  },

  onHoldComplete() {
    this.clearAllTimers();

    wx.vibrateLong();

    this.setData({
      isHolding: false,
      holdProgress: 100,
      showRipple: true
    });

    setTimeout(() => {
      this.setData({ showRipple: false });
    }, 1500);

    // 1秒后（变色完成时）显示"已稳住"
    setTimeout(() => {
      this.setData({ isStabilized: true });
    }, 1000);

    // 不再自动跳转，等待用户点击"已稳住"
  },

  // 点击"已稳住"按钮，进入朗读阶段
  onStabilizedClick() {
    wx.vibrateShort({ type: 'light' });
    this.transitionToReveal();
  },

  // ========== 第二阶段：三轮朗读 ==========

  transitionToReveal() {
    const firstMantra = this.data.allMantras[0];

    this.setData({
      currentPhase: 'reading',
      isDarkMode: false, // 切回浅色模式
      isStabilizing: false, // 重置稳定化状态
      isStabilized: false, // 重置稳定状态
      showGuide: true,
      showStamp: false, // 先隐藏录音按钮，等打字机完成后再显示
      readingRound: 1, // 从第一轮开始
      backgroundBrightness: 30, // 第一轮最暗
      currentText: firstMantra, // 第一轮文案
      displayText: '', // 清空，等待打字机效果
      guideText: this.getGuideText(1), // 第一轮引导语
      hasRecorded: false, // 重置录音状态
      recordedFilePath: ''
    });

    // 启动打字机效果
    this.startTypewriter();
  },

  startTypewriter() {
    const fullText = this.data.currentText;
    let index = 0;
    let currentDisplay = '';

    const typewriterTimer = setInterval(() => {
      if (index < fullText.length) {
        currentDisplay += fullText[index];
        this.setData({
          displayText: currentDisplay
        });
        index++;
      } else {
        clearInterval(typewriterTimer);
        // 打字完成，立即显示录音按钮
        this.setData({
          showStamp: true
        });
      }
    }, this.data.TYPEWRITER_SPEED);

    this.setData({ typewriterTimer });
  },

  // ========== 录音功能 ==========

  // 开始录音
  onRecordStart() {
    const recorderManager = wx.getRecorderManager();

    this.setData({
      isRecording: true
    });

    wx.vibrateShort({ type: 'light' });

    recorderManager.start({
      duration: 60000, // 最长60秒
      format: 'mp3'
    });

    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        hasRecorded: true,
        recordedFilePath: res.tempFilePath
      });

      wx.vibrateShort({ type: 'heavy' });
    });
  },

  // 结束录音
  onRecordEnd() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();
  },

  // 回放录音
  onPlayRecord() {
    if (this.data.isPlaying) {
      // 正在播放，停止播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.stop();
      this.setData({
        isPlaying: false
      });
    } else {
      // 开始播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = this.data.recordedFilePath;

      innerAudioContext.onPlay(() => {
        this.setData({
          isPlaying: true
        });
      });

      innerAudioContext.onEnded(() => {
        this.setData({
          isPlaying: false
        });
      });

      innerAudioContext.onError((res) => {
        console.error('播放失败', res);
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
        this.setData({
          isPlaying: false
        });
      });

      innerAudioContext.play();
    }
  },

  // 确认录音，进入下一轮或完成
  onConfirmRecord() {
    wx.vibrateShort({ type: 'heavy' });

    // 判断是否是最后一轮
    if (this.data.readingRound >= this.data.totalRounds) {
      // 第三轮完成，显示状态询问卡片
      setTimeout(() => {
        this.showStatusCheckModal();
      }, 500);
    } else {
      // 进入下一轮
      setTimeout(() => {
        this.nextRound();
      }, 500);
    }
  },

  // 进入下一轮朗读
  nextRound() {
    const nextRound = this.data.readingRound + 1;

    // 计算新的背景亮度（30 -> 65 -> 100）
    const newBrightness = 30 + ((nextRound - 1) * 35);
    const nextMantra = this.data.allMantras[nextRound - 1];

    this.setData({
      readingRound: nextRound,
      backgroundBrightness: newBrightness,
      currentText: nextMantra, // 更新文案
      displayText: '', // 清空，等待打字机效果
      showStamp: false, // 先隐藏录音按钮，等打字机完成后再显示
      guideText: this.getGuideText(nextRound), // 更新引导语
      hasRecorded: false, // 重置录音状态
      recordedFilePath: ''
    });

    // 启动打字机效果
    this.startTypewriter();
  },

  // ========== 第三阶段：状态询问 ==========

  showStatusCheckModal() {
    this.setData({
      showStatusCheck: true,
      showGuide: false,
      showStamp: false
    });
  },

  // 用户选择"稳住了"
  onSteady() {
    this.setData({
      showStatusCheck: false,
      showHealingCard: true
    });
  },

  // 用户选择"仍有风暴" -> 显示修复指南付费墙
  onStillStormy() {
    this.setData({
      showStatusCheck: false,
      showRepairGuide: true
    });
  },

  // 关闭修复指南
  onCloseRepairGuide() {
    this.setData({
      showRepairGuide: false
    });
    // 直接进入完成页面
    this.transitionToCompleted();
  },

  // 解锁修复指南（付费）
  onUnlockRepair() {
    // TODO: 跳转支付页面
    wx.showToast({
      title: '跳转支付页面',
      icon: 'none',
      duration: 2000
    });
  },

  // ========== 治愈卡片功能 ==========

  // 从治愈卡片分享
  onShareFromHealing() {
    // 生成分享图片
    wx.showShareMenu({
      withShareTicket: true
    });

    // 提示用户截图分享
    wx.showToast({
      title: '可截图分享给朋友或队友',
      icon: 'none',
      duration: 2000
    });
  },

  // 从治愈卡片返回首页
  onBackHomeFromHealing() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // ========== 第四阶段：涟漪（完成） ==========

  transitionToCompleted() {
    this.setData({
      currentPhase: 'completed',
      showInternalize: false,
      showCompleted: true,
      isCompleted: true
    });

    // TODO: 保存到本地存储
    this.saveCompletedRecord();
  },

  saveCompletedRecord() {
    const completedRecords = wx.getStorageSync('completedRecords') || [];
    const newRecord = {
      scenarioId: this.data.scenario.id,
      scenarioTitle: this.data.scenario.title,
      quote: this.data.currentText,
      date: new Date().getTime(),
      category: this.data.scenario.category
    };
    completedRecords.unshift(newRecord);
    wx.setStorageSync('completedRecords', completedRecords);
  },

  // ========== 操作按钮 ==========

  onShare() {
    // TODO: 实现分享功能
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  onBackHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  onBack() {
    if (this.data.isCompleted) {
      this.onBackHome();
    } else {
      wx.navigateBack();
    }
  }
});
