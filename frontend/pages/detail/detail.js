// pages/detail/detail.js - 原研哉式极简主义完整版
const scenariosData = require('../../utils/scenarios.js');
const api = require('../../utils/api.js');
const app = getApp();

const FINAL_STATE_OPTIONS = [
  { value: 'calmer', label: '平静下来了' },
  { value: 'more_patient', label: '更有耐心了' },
  { value: 'relaxed', label: '松弛了一些' },
  { value: 'understood', label: '接纳了现状' },
  { value: 'still_tight', label: '还有点紧绷' },
  { value: 'need_support', label: '还想再练练' },
  { value: 'exhausted', label: '觉得很疲惫' },
  { value: 'custom', label: '自定义补充' }
];

const READING_TRANSITIONS = {
  1: {
    phaseTitle: '课题分离',
    lines: [
      '你刚才做了一件很重要的事——',
      '先接住了自己。',
      '接下来我们来找回自己的课题，',
      '把孩子的课题归还给孩子，',
      '开始朗读第二句吧。'
    ],
    buttonText: '再读一句',
    action: 'next-round'
  },
  2: {
    phaseTitle: '认知翻转',
    lines: [
      '放下不属于我们的重担后，',
      '是不是感觉到了一丝轻松？',
      '犯错不是糟糕的结局，',
      '而是你们共同成长的契机。',
      '带着这份轻松，',
      '换个视角看看刚才发生的事吧。'
    ],
    buttonText: '再读一句',
    action: 'next-round'
  },
  3: {
    phaseTitle: '微小行动',
    lines: [
      '视角的转变，',
      '已经让你在当下重新获得了力量。',
      '有了觉察，改变就会自然发生。',
      '深呼吸，',
      '让我们看看现在可以做点什么微小的事，',
      '重新连接彼此。'
    ],
    buttonText: '再读一句',
    action: 'next-round'
  },
  4: {
    phaseTitle: '重塑自我',
    lines: [
      '读到这里，你已经掌握了应对当下的方法，',
      '你真的太棒了！',
      '其实，你愿意在这里停下来向内看，',
      '就已经证明了一件事——',
      '你是一个充满爱的父母。',
      '现在，让我们回到一切的起点，',
      '去拥抱那个真实且足够好的自己。'
    ],
    buttonText: '读最后一句',
    action: 'next-round'
  },
  5: {
    phaseTitle: '',
    lines: [
      '恭喜你，完成了一次充满力量的内心探索。🎉',
      '偶尔情绪失控，',
      '并不代表你是个糟糕的父母。',
      '不必追求完美无瑕的育儿，',
      '真实的碰撞和及时的修复，',
      '才是给孩子最好的滋养。',
      '',
      '现在，带着这份平和与确信，',
      '去抱一抱你的孩子；',
      '或者去喝杯水，抱一抱辛苦了的自己吧。',
      '当你需要力量时，随时回来，',
      '我们在这里陪你稳稳地向前走。'
    ],
    buttonText: '去复盘',
    action: 'enter-final-state'
  }
};

Page({
  data: {
    scenario: {}, // 场景数据
    currentText: '', // 当前金句
    displayText: '', // 打字机显示的文字
    currentDate: '', // 当前日期

    // 阶段管理
    currentPhase: 'holding', // holding | reading | completed
    roundSteps: [1, 2, 3, 4, 5], // 轮次点位

    // 第一阶段：长按止颤
    isDarkMode: false,
    isStabilizing: false,
    isStabilized: false,
    isHolding: false,
    holdProgress: 0,
    holdTimer: null,
    progressTimer: null,

    // 第二阶段：五句朗读
    readingRound: 1, // 当前第几轮（1-5）
    totalRounds: 5, // 总轮数（改为5句）
    allMantras: [], // 所有轮次的文案
    backgroundBrightness: 30, // 背景亮度（30-100），第一轮最暗

    showGuide: false, // 显示引导语
    guideText: '', // 引导文案（根据轮次动态生成）
    showStamp: false, // 显示录音按钮（延迟后）
    showReadingIntro: false, // 首句前说明
    showReadingTransition: false, // 朗读轮次之间的过渡页
    readingTransitionLines: [],
    readingTransitionButtonText: '',
    readingTransitionAction: '',
    phaseTitle: '', // 过渡页翻转后显示的阶段标题
    closingOverlay: '', // '' | start | transition
    stampHintText: '', // 提示文字（已废弃）
    typewriterTimer: null,
    readingTimer: null,

    // 录音相关
    isRecording: false,
    hasRecorded: false,
    recordedFilePath: '',
    isPlaying: false,
    recordingTimer: null,

    // 能量光晕（VAD效果）
    energyScale: 1, // 光晕缩放比例（1-2）
    vadTimer: null, // VAD检测定时器

    // 能量提示
    showEnergyToast: false, // 是否显示能量提示
    energyToastText: '', // 能量提示文字

    // 能量系统
    totalEnergy: 0, // 总能量
    todayEnergy: 0, // 今日能量
    todaySentences: 0, // 今日朗读句数
    consecutiveDays: 0, // 连续打卡天数
    lastCheckInDate: null, // 上次打卡日期

    // 治愈卡片
    showHealingCard: false, // 显示治愈分享卡片
    healingQuote: '', // 治愈的话

    // 复盘流程（已同步至所有场景：每句朗读后复述）
    isRoundRetellMode: false,
    skipRetellForRemainingRounds: false,
    postReadingStep: '', // '' | retell | feedback | state
    currentReflectionRound: 0,
    currentReflectionMantra: '',
    retellText: '',
    retellFeedback: '',
    roundRetells: [],
    roundFeedbacks: [],
    selectedFinalState: '',
    selectedFinalStates: [],
    finalStateOptions: FINAL_STATE_OPTIONS.map((item) => ({ ...item, selected: false })),
    showCustomFeelingInput: false,

    // 兼容卡片透传字段
    feelingText: '',
    mindfulJournal: '',
    isGeneratingFeedback: false,
    isGeneratingJournal: false,
    speechAvailable: false,
    isSpeechRecording: false,
    isFlipping: false,
    speechTarget: 'reading', // reading | retell | feeling
    hasRecordPermission: false,

    // 第四阶段：完成
    showCompleted: false,
    isCompleted: false,

    // 通用
    showRipple: false,
    HOLD_DURATION: 2000, // 按住2秒
    REVEAL_DELAY: 3000, // 完成后停留3秒
    TYPEWRITER_SPEED: 40, // 打字机速度（加快显示）
    READING_DELAY: 3000, // 留白时间（3秒）

    // 情绪切片时间轴
    stormTime: null,      // 风暴时刻（进入页面时）
    shiftTime: null,      // 转念时刻（按压完成后）
    anchorTime: null,     // 安顿时刻（点击"稳住了"时）

    // 顶部导航定位
    backButtonStyle: ''
  },

  onLoad(options) {
    const { id, mode, autoStart } = options;

    this.initTopNavPosition();

    // 判断是否为快速模式
    if (mode === 'quick') {
      // 快速模式：使用默认场景
      this.loadScenario('001'); // 使用"孩子磨蹭"作为默认场景
    } else {
      // 普通模式：使用选中的场景
      this.loadScenario(id);
    }

    this.setCurrentDate();
    this.loadEnergyData();
    this.checkAccessLimit();

    // 记录风暴时刻（进入页面的时间）
    this.setData({
      stormTime: new Date(),
      shiftTime: new Date() // 转念时刻也是进入页面的时间
    });

    // 如果是自动开始模式（从首页长按进入），直接开始朗读
    if (autoStart === 'true') {
      // 直接进入朗读阶段，跳过长按止颤
      this.transitionToReading();
    }

    this.initRecorderManager();
    this.initAudioPlayer();
    this.initSpeechRecognition();
    this.checkRecordPermission();
  },

  initTopNavPosition() {
    try {
      const windowInfo = typeof wx.getWindowInfo === 'function'
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync();
      const menuButtonRect = typeof wx.getMenuButtonBoundingClientRect === 'function'
        ? wx.getMenuButtonBoundingClientRect()
        : null;
      const windowWidth = windowInfo.windowWidth || windowInfo.screenWidth || 375;
      const statusBarHeight = windowInfo.statusBarHeight || 0;
      const backButtonSize = (64 / 750) * windowWidth;
      const backButtonLeft = (40 / 750) * windowWidth;

      let backButtonTop = statusBarHeight + 8;

      if (menuButtonRect && menuButtonRect.height) {
        backButtonTop = menuButtonRect.top + (menuButtonRect.height - backButtonSize) / 2;
      }

      this.setData({
        backButtonStyle: [
          `top: ${Math.round(backButtonTop)}px`,
          `left: ${Math.round(backButtonLeft)}px`,
          `width: ${Math.round(backButtonSize)}px`,
          `height: ${Math.round(backButtonSize)}px`
        ].join('; ')
      });
    } catch (error) {
      console.warn('初始化顶部导航位置失败，使用默认返回键位置', error);
    }
  },

  onUnload() {
    this.stopSpeechInput();
    this.clearAllTimers();
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
  },

  buildFinalStateOptions(selectedValues = []) {
    return FINAL_STATE_OPTIONS.map((item) => ({
      ...item,
      selected: selectedValues.includes(item.value)
    }));
  },

  // 清理所有定时器
  clearAllTimers() {
    if (this.data.holdTimer) clearTimeout(this.data.holdTimer);
    if (this.data.progressTimer) clearInterval(this.data.progressTimer);
    if (this.data.typewriterTimer) clearInterval(this.data.typewriterTimer);
    if (this.data.readingTimer) clearTimeout(this.data.readingTimer);
    if (this.data.vadTimer) clearInterval(this.data.vadTimer);
    if (this.feedbackAutoTimer) clearTimeout(this.feedbackAutoTimer);
    if (typeof this.stopMockSpeechTyping === 'function') {
      this.stopMockSpeechTyping();
    }
  },

  // 初始化语音识别（接入微信同声传译插件）
  initSpeechRecognition() {
    try {
      const plugin = requirePlugin("WechatSI");
      this.speechManager = plugin.getRecordRecognitionManager();

      this.speechManager.onStart = () => {
        const speechTarget = this.currentSpeechSessionTarget || this.activeSpeechTarget || 'retell';
        console.log('语音识别开始', speechTarget);

        if (speechTarget === 'reading') {
          this.setData({
            isRecording: true
          });
          this.startVADEffect();
          if (this.pendingStopAfterSpeechStart || this.isSpeechTouching === false) {
            this.pendingStopAfterSpeechStart = false;
            this.stopSpeechInput({ force: true });
          }
          return;
        }

        this.setData({
          isSpeechRecording: true
        });
        if (this.pendingStopAfterSpeechStart || this.isSpeechTouching === false) {
          this.pendingStopAfterSpeechStart = false;
          this.stopSpeechInput({ force: true });
        }
      };
      
      this.speechManager.onRecognize = (res) => {
        // 实时转写
        const speechTarget = this.currentSpeechSessionTarget || this.activeSpeechTarget || 'retell';
        if (res.result && speechTarget !== 'reading') {
          this.updateSpeechText(res.result, { animated: true });
        }
      };

      this.speechManager.onStop = (res) => {
        const speechTarget = this.currentSpeechSessionTarget || this.activeSpeechTarget || 'retell';

        if (speechTarget === 'reading') {
          this.stopVADEffect();
          this.setData({
            isRecording: false,
            hasRecorded: !!res.tempFilePath,
            recordedFilePath: res.tempFilePath || '',
            speechAvailable: true
          });
        } else {
          // 录音结束，获取最终结果
          if (res.result) {
            this.stopMockSpeechTyping();
            this.updateSpeechText(res.result);
          } else {
            wx.showToast({
              title: '没有识别到内容，请重试',
              icon: 'none'
            });
          }

          this.setData({
            isSpeechRecording: false,
            speechAvailable: true
          });
        }
        this.lastSpeechStopAt = Date.now();
        this.speechAudioPath = res.tempFilePath;
        this.activeSpeechTarget = '';
        this.currentSpeechSessionTarget = '';
      };

      this.speechManager.onError = (res) => {
        console.error('录音识别失败', res.msg);
        const speechTarget = this.currentSpeechSessionTarget || this.activeSpeechTarget || 'retell';
        const errorMsg = res.msg || '';
        const isStopRaceError = errorMsg.includes('please stop after start');
        if (speechTarget === 'reading') {
          this.stopVADEffect();
          this.setData({
            isRecording: false,
            speechAvailable: !isStopRaceError
          });
        } else {
          this.setData({
            isSpeechRecording: false,
            speechAvailable: !isStopRaceError
          });
        }
        this.lastSpeechStopAt = Date.now();
        this.activeSpeechTarget = '';
        this.currentSpeechSessionTarget = '';

        if (isStopRaceError) {
          return;
        }

        if (errorMsg.includes('internal voice data failed')) {
          wx.showToast({
            title: '语音识别暂时不可用，请重试',
            icon: 'none'
          });
          return;
        }

        wx.showToast({
          title: errorMsg || '识别失败，请重试',
          icon: 'none'
        });
      };

      this.setData({ speechAvailable: true });
    } catch (e) {
      console.error('同声传译插件初始化失败', e);
      this.speechManager = null;
      this.speechRecorder = null;
      this.setData({ speechAvailable: false });
    }
  },

  initRecorderManager() {
    if (this.recorderManager) return;

    this.recorderManager = wx.getRecorderManager();

    this.recorderManager.onStart(() => {
      this.setData({
        isRecording: true
      });
      this.startVADEffect();
      if (this.pendingStopAfterRecordStart || this.isRecordTouching === false) {
        this.pendingStopAfterRecordStart = false;
        this.stopRecording();
      }
    });

    this.recorderManager.onStop((res) => {
      this.stopVADEffect();
      this.setData({
        isRecording: false,
        hasRecorded: true,
        recordedFilePath: res.tempFilePath || ''
      });
      this.lastRecorderStopAt = Date.now();

      wx.vibrateShort({ type: 'heavy' });
    });

    this.recorderManager.onError((error) => {
      console.error('录音失败', error);
      this.stopVADEffect();
      this.setData({
        isRecording: false
      });
      this.lastRecorderStopAt = Date.now();
      this.handlePrivacyRelatedError(error, '录音失败，请重试');
    });
  },

  handlePrivacyRelatedError(error, fallbackTitle = '操作失败，请重试') {
    const errMsg = error && (error.errMsg || error.msg) ? (error.errMsg || error.msg) : '';

    if (errMsg.includes('please stop after start')) {
      wx.showToast({
        title: '上一段录音还在收尾，请再试一次',
        icon: 'none'
      });
      return;
    }

    if (errMsg.includes('privacy agreement')) {
      wx.showModal({
        title: '需补充隐私配置',
        content: '当前小程序后台还没有在“用户隐私保护指引”里声明录音信息，微信已拦截麦克风能力。请到微信公众平台补充录音相关隐私声明，通常几分钟后生效。',
        showCancel: false
      });
      return;
    }

    if (errMsg.includes('authorize') || errMsg.includes('auth deny') || errMsg.includes('permission')) {
      wx.showToast({
        title: '请先允许麦克风权限',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: errMsg || fallbackTitle,
      icon: 'none'
    });
  },

  sleep(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  hasPendingSpeechStop() {
    return (this.lastSpeechStopRequestedAt || 0) > (this.lastSpeechStopAt || 0);
  },

  async waitForSpeechRelease(timeoutMs = 1800) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const isBusy = this.data.isRecording
        || this.data.isSpeechRecording
        || !!this.activeSpeechTarget
        || !!this.currentSpeechSessionTarget
        || !!this.speechStartPending;

      if (!isBusy) {
        return true;
      }

      await this.sleep(60);
    }

    return false;
  },

  initAudioPlayer() {
    if (this.audioPlayer) return;

    this.audioPlayer = wx.createInnerAudioContext();

    this.audioPlayer.onPlay(() => {
      this.setData({
        isPlaying: true
      });
    });

    this.audioPlayer.onEnded(() => {
      this.setData({
        isPlaying: false
      });
    });

    this.audioPlayer.onStop(() => {
      this.setData({
        isPlaying: false
      });
    });

    this.audioPlayer.onError((res) => {
      console.error('播放失败', res);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
      this.setData({
        isPlaying: false
      });
    });
  },

  // 检查麦克风权限状态：granted | denied | unknown
  checkRecordPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const permission = res.authSetting['scope.record'];
          let status = 'unknown';
          if (permission === true) status = 'granted';
          if (permission === false) status = 'denied';
          this.setData({ hasRecordPermission: status === 'granted' });
          resolve(status);
        },
        fail: () => {
          this.setData({ hasRecordPermission: false });
          resolve('unknown');
        }
      });
    });
  },

  // 确保麦克风权限：已授权则直接通过；未授权时才触发一次申请
  async ensureRecordPermission() {
    if (this.data.hasRecordPermission) return true;

    const permissionStatus = await this.checkRecordPermission();
    if (permissionStatus === 'granted') return true;

    if (permissionStatus === 'unknown') {
      return new Promise((resolve) => {
        wx.authorize({
          scope: 'scope.record',
          success: () => {
            this.setData({ hasRecordPermission: true });
            resolve(true);
          },
          fail: () => {
            this.setData({ hasRecordPermission: false });
            resolve(false);
          }
        });
      });
    }

    return new Promise((resolve) => {
      wx.showModal({
        title: '需要麦克风权限',
        content: '请在设置中开启麦克风权限，开启后就可以正常朗读和复盘了。',
        confirmText: '去设置',
        success: (modalRes) => {
          if (!modalRes.confirm) {
            resolve(false);
            return;
          }

          wx.openSetting({
            success: (settingRes) => {
              const granted = !!settingRes.authSetting['scope.record'];
              this.setData({ hasRecordPermission: granted });
              resolve(granted);
            },
            fail: () => resolve(false)
          });
        }
      });
    });
  },

  resetSpeechSessionState() {
    this.activeSpeechTarget = '';
    this.currentSpeechSessionTarget = '';
    this.speechStartPending = false;
    this.pendingStopAfterSpeechStart = false;
    this.isSpeechTouching = false;
    this.setData({
      isSpeechRecording: false,
      speechTarget: 'reading'
    });
  },

  async prepareReadingRecorder(options = {}) {
    const {
      requestPrivacy = false,
      requestPermission = false,
      showToast = false
    } = options;

    if (!this.recorderManager) {
      this.initRecorderManager();
    }

    let privacyAuthorized = true;
    if (requestPrivacy && app && typeof app.ensurePrivacyAuthorization === 'function') {
      privacyAuthorized = await app.ensurePrivacyAuthorization();
      if (!privacyAuthorized) {
        if (showToast) {
          wx.showToast({
            title: '请先同意隐私授权',
            icon: 'none'
          });
        }
        return false;
      }
    }

    if (requestPermission) {
      const hasPermission = await this.ensureRecordPermission();
      if (!hasPermission) {
        if (showToast) {
          wx.showToast({
            title: '请先允许麦克风权限',
            icon: 'none'
          });
        }
        return false;
      }
      return true;
    }

    await this.checkRecordPermission();
    return true;
  },

  updateSpeechText(text) {
    const options = arguments[1] || {};
    if (this.data.speechTarget === 'retell') {
      if (options.animated) {
        this.startMockSpeechTyping('retellText', text);
        return;
      }
      this.setData({
        retellText: text
      });
      return;
    }

    if (options.animated) {
      this.startMockSpeechTyping('feelingText', text);
      return;
    }

    this.setData({
      feelingText: text
    });
  },

  startMockSpeechTyping(fieldName, nextText = '') {
    this.stopMockSpeechTyping();

    const currentText = this.data[fieldName] || '';
    const targetText = nextText || '';

    if (!targetText) {
      this.setData({
        [fieldName]: ''
      });
      return;
    }

    if (!targetText.startsWith(currentText) || targetText.length <= currentText.length) {
      this.setData({
        [fieldName]: targetText
      });
      return;
    }

    let index = currentText.length;
    this.mockSpeechTypingTimer = setInterval(() => {
      const remaining = targetText.length - index;
      const step = remaining > 12 ? 4 : remaining > 6 ? 3 : remaining > 2 ? 2 : 1;
      index += step;
      if (index >= targetText.length) {
        this.setData({
          [fieldName]: targetText
        });
        this.stopMockSpeechTyping();
        return;
      }

      this.setData({
        [fieldName]: targetText.slice(0, index)
      });
    }, 16);
  },

  stopMockSpeechTyping() {
    if (this.mockSpeechTypingTimer) {
      clearInterval(this.mockSpeechTypingTimer);
      this.mockSpeechTypingTimer = null;
    }
  },

  shouldIgnoreTap(lastTouchTimestamp, lastTouchEndTimestamp) {
    if (lastTouchEndTimestamp && (Date.now() - lastTouchEndTimestamp < 500)) {
      return true;
    }

    return lastTouchTimestamp && (Date.now() - lastTouchTimestamp < 350);
  },

  onSpeechRecordTouchStart() {
    // 震动反馈，让用户知道开始录音
    wx.vibrateShort({ type: 'light' });

    this.isSpeechTouching = true;
    this.lastSpeechTouchStartAt = Date.now();
    if (!this.data.isSpeechRecording) {
      this.onSpeechRecordToggle();
    }
  },

  onSpeechRecordTouchEnd() {
    // 震动反馈，让用户知道录音结束
    if (this.data.isSpeechRecording) {
      wx.vibrateShort({ type: 'light' });
    }

    this.isSpeechTouching = false;
    this.lastSpeechTouchEndAt = Date.now();
    if (this.data.isSpeechRecording) {
      this.stopSpeechInput();
      return;
    }

    if (this.speechStartPending) {
      this.pendingStopAfterSpeechStart = true;
    }
  },

  onSpeechRecordTouchCancel() {
    this.onSpeechRecordTouchEnd();
  },

  onSpeechRecordTap() {
    if (this.shouldIgnoreTap(this.lastSpeechTouchStartAt, this.lastSpeechTouchEndAt)) return;
    this.onSpeechRecordToggle();
  },

  onSpeechRecordToggle() {
    if (this.data.isGeneratingFeedback || this.data.isGeneratingJournal) return;

    if (this.data.isSpeechRecording) {
      this.stopSpeechInput();
      return;
    }

    this.startSpeechInput();
  },

  async startSpeechInput() {
    return this.startSpeechCapture(this.data.postReadingStep === 'retell' ? 'retell' : 'feeling');
  },

  async startSpeechCapture(target) {
    if (this.speechStartPending) return;
    if (!this.speechManager && !this.speechRecorder) {
      this.initSpeechRecognition();
    }

    if (!this.speechManager && !this.speechRecorder) {
      wx.showModal({
        title: '语音识别不可用',
        content: '当前环境没有成功加载微信同声传译插件，请使用真机预览，并确认插件已在小程序后台启用。',
        showCancel: false
      });
      return;
    }

    const privacyAuthorized = app && typeof app.ensurePrivacyAuthorization === 'function'
      ? await app.ensurePrivacyAuthorization()
      : true;
    if (!privacyAuthorized) return;

    const hasPermission = await this.ensureRecordPermission();
    if (!hasPermission) return;

    this.speechStartPending = true;
    
    const hasUnreleasedSpeechSession = this.data.isRecording
      || this.data.isSpeechRecording
      || !!this.activeSpeechTarget;

    if (hasUnreleasedSpeechSession) {
      await this.stopSpeechInput({
        force: true,
        waitForStop: true,
        timeoutMs: 2200
      });
    }

    this.activeSpeechTarget = target;
    this.currentSpeechSessionTarget = target;

    const recorderReleasedAt = Math.max(this.lastRecorderStopAt || 0, this.lastRecorderStopRequestedAt || 0);
    const recorderCooldown = 800 - (Date.now() - recorderReleasedAt);
    if (recorderCooldown > 0) {
      await this.sleep(recorderCooldown);
    }

    const speechReleasedAt = Math.max(this.lastSpeechStopAt || 0, this.lastSpeechStopRequestedAt || 0);
    const speechCooldown = 900 - (Date.now() - speechReleasedAt);
    if (speechCooldown > 0) {
      await this.sleep(speechCooldown);
    }

    if (target !== 'reading' && this.isSpeechTouching === false) {
      this.speechStartPending = false;
      this.activeSpeechTarget = '';
      this.currentSpeechSessionTarget = '';
      return;
    }

    if (target === 'reading') {
      this.setData({
        isRecording: true,
        speechTarget: target
      });
    } else {
      this.setData({
        isSpeechRecording: true,
        speechTarget: target
      });
      this.updateSpeechText('');
    }

    this.pendingStopAfterSpeechStart = false;
    wx.vibrateShort({ type: 'light' });

    if (this.speechManager) {
      try {
        // 真实录音（使用同声传译）
        this.speechManager.start({
          duration: 60000,
          lang: "zh_CN"
        });
      } catch (error) {
        console.error('启动语音识别失败', error);
        if (target === 'reading') {
          this.stopVADEffect();
          this.setData({
            isRecording: false
          });
          this.handlePrivacyRelatedError(error, '录音启动失败');
        } else {
          this.setData({
            isSpeechRecording: false
          });
          this.handlePrivacyRelatedError(error, '语音启动失败');
        }
        this.lastSpeechStopAt = Date.now();
        this.activeSpeechTarget = '';
        this.currentSpeechSessionTarget = '';
      } finally {
        setTimeout(() => {
          this.speechStartPending = false;
        }, 300);
      }
    } else {
      this.speechStartPending = false;
    }
  },

  async stopSpeechInput(options = {}) {
    const { force = false, waitForStop = false, timeoutMs = 1800 } = options;
    const shouldStopCurrentSpeech = this.data.isSpeechRecording || this.data.isRecording || !!this.activeSpeechTarget || force;
    const currentTarget = this.currentSpeechSessionTarget || this.activeSpeechTarget || this.data.speechTarget;
    const stopAlreadyPending = this.hasPendingSpeechStop();

    if (this.speechManager && shouldStopCurrentSpeech) {
      if (currentTarget === 'reading') {
        this.stopVADEffect();
      }
      this.setData({
        isRecording: false,
        isSpeechRecording: false
      });
      if (!stopAlreadyPending) {
        this.lastSpeechStopRequestedAt = Date.now();
        try {
          this.speechManager.stop();
        } catch (error) {
          console.warn('停止语音识别失败，尝试兜底清理', error);
          this.setData({
            isRecording: false,
            isSpeechRecording: false
          });
          this.activeSpeechTarget = '';
          this.currentSpeechSessionTarget = '';
          this.lastSpeechStopAt = Date.now();
        }
      }
    } else if (this.speechRecorder && shouldStopCurrentSpeech) {
      if (currentTarget === 'reading') {
        this.stopVADEffect();
      }
      this.setData({
        isRecording: false,
        isSpeechRecording: false
      });
      if (!stopAlreadyPending) {
        this.lastSpeechStopRequestedAt = Date.now();
        try {
          this.speechRecorder.stop();
        } catch (error) {
          console.warn('停止语音录音失败，尝试兜底清理', error);
          this.setData({
            isRecording: false,
            isSpeechRecording: false
          });
          this.activeSpeechTarget = '';
          this.currentSpeechSessionTarget = '';
          this.lastSpeechStopAt = Date.now();
        }
      }
    }

    if (waitForStop) {
      await this.waitForSpeechRelease(timeoutMs);
    }
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

  getPracticeDateString(date = new Date()) {
    const targetDate = date instanceof Date ? date : new Date(date);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getStoredEnergyData() {
    const rawEnergyData = wx.getStorageSync('energyData') || {};
    const legacyTotalEnergy = Number(wx.getStorageSync('totalEnergy') || 0);
    const legacyCurrentStreak = Number(wx.getStorageSync('currentStreak') || 0);

    return {
      totalEnergy: Number(
        rawEnergyData.totalEnergy !== undefined ? rawEnergyData.totalEnergy : (legacyTotalEnergy || 0)
      ),
      todayEnergy: Number(rawEnergyData.todayEnergy || 0),
      todaySentences: Number(rawEnergyData.todaySentences || 0),
      consecutiveDays: Number(
        rawEnergyData.consecutiveDays !== undefined ? rawEnergyData.consecutiveDays : (legacyCurrentStreak || 0)
      ),
      lastCheckInDate: rawEnergyData.lastCheckInDate || null,
      lastEnergyResetDate: rawEnergyData.lastEnergyResetDate || null
    };
  },

  calculateConsecutiveDays(checkInMap = {}) {
    const today = this.getPracticeDateString();
    if (!checkInMap[today]) {
      return 0;
    }

    let streak = 0;
    const cursor = new Date(`${today}T12:00:00`);

    while (checkInMap[this.getPracticeDateString(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  },

  syncLocalPracticeStats(energyData, checkInMap = wx.getStorageSync('checkInMap') || {}) {
    const totalDays = Object.keys(checkInMap).length;
    const totalEnergy = Number((energyData && energyData.totalEnergy) || 0);
    const currentStreak = Number((energyData && energyData.consecutiveDays) || 0);

    wx.setStorageSync('totalDays', totalDays);
    wx.setStorageSync('totalEnergy', totalEnergy);
    wx.setStorageSync('currentStreak', currentStreak);
  },

  // 检查免费用户权限限制
  checkAccessLimit() {
    return; // 强制移除免费用户权限限制
    const isPro = getApp().globalData.isMember;
    if (isPro) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const checkInMap = wx.getStorageSync('checkInMap') || {};

    // 如果今天已经打过卡（checkInMap中有记录），且不是会员
    if (checkInMap[dateStr]) {
      wx.showModal({
        title: '每日练习已达上限',
        content: '免费用户每日可进行 1 次正念练习。开通 Pro 会员即可享受无限次练习，随时随地稳住情绪。',
        confirmText: '去开通',
        confirmColor: '#D4AF37',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/pro/pro' });
          } else {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 获取当前轮次的引导语
  getGuideText(round) {
    const guideTexts = {
      1: '长按朗读，轻轻的念给自己听',
      2: '长按麦克风，把这句话说给自己听',
      3: '长按麦克风，不用全信，先慢慢念',
      4: '长按麦克风，慢一点，给自己一点空间',
      5: '长按麦克风，最后一句，轻轻说完就好'
    };
    return guideTexts[round] || guideTexts[1];
  },

  // 加载场景数据
  loadScenario(id) {
    // 使用外部场景数据文件
    const scenario = scenariosData[id] || scenariosData["001"] || {};

    // 如果场景有modules结构（新格式），首轮固定读模块一第一句，其余模块保留随机
    let finalMantras = [];
    if (scenario.modules) {
      const module1 = Array.isArray(scenario.modules.module1) ? scenario.modules.module1 : [];
      const module2 = Array.isArray(scenario.modules.module2) ? scenario.modules.module2 : [];
      const module3 = Array.isArray(scenario.modules.module3) ? scenario.modules.module3 : [];
      const module4 = Array.isArray(scenario.modules.module4) ? scenario.modules.module4 : [];
      const module5 = Array.isArray(scenario.modules.module5) ? scenario.modules.module5 : [];

      const randomPick = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
      const firstModuleLine = module1[0] || '';

      finalMantras = [
        firstModuleLine,
        randomPick(module2),
        randomPick(module3),
        randomPick(module4),
        randomPick(module5)
      ].filter(Boolean);
    } else {
      // 旧格式，直接使用mantras
      finalMantras = Array.isArray(scenario.mantras) ? scenario.mantras.filter(Boolean) : [];
    }


    const isRoundRetellMode = false; // 先关闭逐句复述，回归纯朗读流程
    // 直接使用scenario数据，不再使用fallbackData（因为scenarios.js已有完整数据）
    const normalizedScenario = {
      ...scenario
    };
    const initialText = normalizedScenario.stabilizeText || finalMantras[0] || '';

    this.setData({
      scenario: normalizedScenario,
      currentText: initialText, // 第一阶段：稳住引导语
      displayText: initialText, // 直接显示完整文字
      allMantras: finalMantras, // 保存所有轮次的文案（从5个模块各选1句）
      healingQuote: normalizedScenario.healingQuote || '', // 保存治愈的话
      isRoundRetellMode: isRoundRetellMode,
      skipRetellForRemainingRounds: true,
      roundRetells: [],
      roundFeedbacks: [],
      selectedFinalState: '',
      selectedFinalStates: [],
      finalStateOptions: this.buildFinalStateOptions(),
      showCustomFeelingInput: false,
      currentReflectionRound: 0,
      currentReflectionMantra: '',
      postReadingStep: ''
    });
  },

  // ========== 能量系统 ==========

  // 加载能量数据
  loadEnergyData() {
    const energyData = this.getStoredEnergyData();
    const checkInMap = wx.getStorageSync('checkInMap') || {};
    const today = this.getPracticeDateString();

    // 只在跨天时重置“今日数据”，不改动真实打卡日期
    if (energyData.lastEnergyResetDate !== today) {
      energyData.todayEnergy = 0;
      energyData.todaySentences = 0;
      energyData.lastEnergyResetDate = today;
    }

    energyData.consecutiveDays = this.calculateConsecutiveDays(checkInMap);
    this.saveEnergyData(energyData);

    this.setData({
      totalEnergy: energyData.totalEnergy,
      todayEnergy: energyData.todayEnergy,
      todaySentences: energyData.todaySentences,
      consecutiveDays: energyData.consecutiveDays,
      lastCheckInDate: energyData.lastCheckInDate
    });
  },

  // 增加能量
  addEnergy(amount, isDailyBonus = false) {
    const today = this.getPracticeDateString();
    const baseEnergyData = this.getStoredEnergyData();
    const isSameDay = baseEnergyData.lastEnergyResetDate === today;
    const newTotalEnergy = baseEnergyData.totalEnergy + amount;
    const newTodayEnergy = (isSameDay ? baseEnergyData.todayEnergy : 0) + amount;
    const newTodaySentences = (isSameDay ? baseEnergyData.todaySentences : 0) + 1;

    const energyData = {
      totalEnergy: newTotalEnergy,
      todayEnergy: newTodayEnergy,
      todaySentences: newTodaySentences,
      consecutiveDays: this.data.consecutiveDays,
      lastCheckInDate: baseEnergyData.lastCheckInDate,
      lastEnergyResetDate: today
    };

    this.setData({
      totalEnergy: energyData.totalEnergy,
      todayEnergy: energyData.todayEnergy,
      todaySentences: energyData.todaySentences,
      showEnergyToast: true,
      energyToastText: isDailyBonus ? `🎉 完成5句朗读！+${amount}能量` : `+${amount}能量`
    });

    this.saveEnergyData(energyData);

    // 2秒后隐藏提示
    setTimeout(() => {
      this.setData({
        showEnergyToast: false
      });
    }, 2000);
  },

  // 保存能量数据
  saveEnergyData(data) {
    const normalizedData = data || {
      totalEnergy: this.data.totalEnergy,
      todayEnergy: this.data.todayEnergy,
      todaySentences: this.data.todaySentences,
      consecutiveDays: this.data.consecutiveDays,
      lastCheckInDate: this.data.lastCheckInDate,
      lastEnergyResetDate: this.getPracticeDateString()
    };

    wx.setStorageSync('energyData', normalizedData);
    this.syncLocalPracticeStats(normalizedData);
  },

  // ========== 直接进入朗读阶段（跳过长按止颤）==========

  transitionToReading() {
    const firstMantra = this.data.allMantras && this.data.allMantras.length > 0 
      ? this.data.allMantras[0] 
      : (this.data.currentText || '');

    this.setData({
      currentPhase: 'reading',
      isDarkMode: false,
      isStabilizing: false,
      isStabilized: false,
      showGuide: false,
      showStamp: false,
      showReadingIntro: true,
      showReadingTransition: false,
      readingTransitionLines: [],
      readingTransitionButtonText: '',
      readingTransitionAction: '',
      phaseTitle: '',
      closingOverlay: '',
      readingRound: 1,
      backgroundBrightness: 30,
      currentText: firstMantra,
      displayText: '',
      guideText: this.getGuideText(1),
      hasRecorded: false,
      recordedFilePath: '',
      postReadingStep: '',
      currentReflectionRound: 0,
      currentReflectionMantra: '',
      retellText: '',
      retellFeedback: '',
      roundRetells: [],
      roundFeedbacks: [],
      selectedFinalState: '',
      selectedFinalStates: [],
      finalStateOptions: this.buildFinalStateOptions(),
      showCustomFeelingInput: false,
      feelingText: '',
      mindfulJournal: '',
      isGeneratingFeedback: false,
      isGeneratingJournal: false,
      isSpeechRecording: false,
      speechTarget: 'reading'
    });

    this.prepareReadingRecorder().catch((error) => {
      console.warn('初始化朗读录音能力失败', error);
    });
  },

  // ========== 第一阶段：长按止颤（保留用于普通模式）==========

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

    // 记录转念时刻（按压完成，文字变成金色的瞬间）
    this.setData({
      isHolding: false,
      holdProgress: 100,
      showRipple: true,
      shiftTime: new Date()
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

  // ========== 第二阶段：五句朗读 ==========

  transitionToReveal() {
    const firstMantra = this.data.allMantras && this.data.allMantras.length > 0 
      ? this.data.allMantras[0] 
      : (this.data.currentText || '');

    this.setData({
      currentPhase: 'reading',
      isDarkMode: false, // 切回浅色模式
      isStabilizing: false, // 重置稳定化状态
      isStabilized: false, // 重置稳定状态
      showGuide: false,
      showStamp: false, // 先隐藏录音按钮，等打字机完成后再显示
      showReadingIntro: true,
      showReadingTransition: false,
      readingTransitionLines: [],
      readingTransitionButtonText: '',
      readingTransitionAction: '',
      phaseTitle: '',
      closingOverlay: '',
      readingRound: 1, // 从第一轮开始
      backgroundBrightness: 30, // 第一轮最暗
      currentText: firstMantra, // 第一轮文案
      displayText: '', // 清空，等待打字机效果
      guideText: this.getGuideText(1), // 第一轮引导语
      hasRecorded: false, // 重置录音状态
      recordedFilePath: '',
      postReadingStep: '',
      currentReflectionRound: 0,
      currentReflectionMantra: '',
      retellText: '',
      retellFeedback: '',
      roundRetells: [],
      roundFeedbacks: [],
      selectedFinalState: '',
      selectedFinalStates: [],
      finalStateOptions: this.buildFinalStateOptions(),
      showCustomFeelingInput: false,
      feelingText: '',
      mindfulJournal: '',
      isGeneratingFeedback: false,
      isGeneratingJournal: false,
      isSpeechRecording: false,
      speechTarget: 'reading'
    });
  },

  onConfirmReadingIntro() {
    if (!this.data.showReadingIntro) return;

    wx.vibrateShort({ type: 'light' });
    this.prepareReadingRecorder({
      requestPrivacy: true,
      requestPermission: true,
      showToast: true
    }).catch((error) => {
      console.warn('预热朗读录音能力失败', error);
    });

    this.setData({ isFlipping: true });

    setTimeout(() => {
      this.playOverlayDissolve('start', () => {
        this.setData({
          showReadingIntro: false,
          showGuide: true,
          closingOverlay: '',
          isFlipping: false
        });
        this.startTypewriter();
      });
    }, 780);
  },

  getReadingTransitionConfig(round) {
    return READING_TRANSITIONS[round] || null;
  },

  showReadingTransition(round) {
    const transitionConfig = this.getReadingTransitionConfig(round);
    if (!transitionConfig) {
      if (round >= this.data.totalRounds) {
        this.enterFinalStateFlow();
      } else {
        this.nextRound();
      }
      return;
    }

    this.setData({
      showGuide: false,
      showStamp: false,
      hasRecorded: false,
      isPlaying: false,
      showReadingTransition: true,
      readingTransitionLines: transitionConfig.lines,
      readingTransitionButtonText: transitionConfig.buttonText,
      readingTransitionAction: transitionConfig.action,
      phaseTitle: transitionConfig.phaseTitle || '', // 添加阶段标题
      closingOverlay: ''
    });
  },

  onConfirmReadingTransition() {
    if (!this.data.showReadingTransition) return;

    wx.vibrateShort({ type: 'light' });
    const action = this.data.readingTransitionAction;

    if (action === 'enter-final-state') {
      this.playOverlayDissolve('transition', () => {
        this.setData({
          showReadingTransition: false,
          readingTransitionLines: [],
          readingTransitionButtonText: '',
          readingTransitionAction: '',
          closingOverlay: ''
        });
        this.enterFinalStateFlow();
      });
      return;
    }

    this.setData({ isFlipping: true });

    setTimeout(() => {
      this.playOverlayDissolve('transition', () => {
        this.setData({
          showReadingTransition: false,
          readingTransitionLines: [],
          readingTransitionButtonText: '',
          readingTransitionAction: '',
          closingOverlay: '',
          isFlipping: false
        });
        this.nextRound();
      });
    }, 780);
  },

  playOverlayDissolve(kind, onComplete) {
    this.setData({
      closingOverlay: kind
    });

    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        this.setData({
          closingOverlay: ''
        });
      }
    }, 280);
  },

  startTypewriter() {
    if (this.data.typewriterTimer) {
      clearInterval(this.data.typewriterTimer);
    }

    // 格式化当前句子：在句号或问号后面增加换行符，让段落按照完整句子换行，减轻压力
    let formattedText = this.data.currentText || '';
    
    // 将英文问号统一替换为中文问号，避免字体差异显得突兀
    formattedText = formattedText.replace(/\?/g, '？');
    
    // 匹配中文/英文句号以及中文问号（后面如果紧跟空格也一并处理），在标点后增加换行符
    // 注意：如果是字符串末尾的标点，我们保留它但不加额外的换行
    formattedText = formattedText.replace(/([。\.？])\s*(?!$)/g, '$1\n');

    this.setData({
      typewriterTimer: null,
      displayText: formattedText,
      showStamp: true
    });
  },

  // ========== 录音功能 ==========

  onRecordTouchStart() {
    // 震动反馈，让用户知道开始录音
    wx.vibrateShort({ type: 'light' });

    this.isRecordTouching = true;
    this.lastRecordTouchStartAt = Date.now();
    if (!this.data.isRecording) {
      this.onRecordToggle();
    }
  },

  onRecordTouchEnd() {
    // 震动反馈，让用户知道录音结束
    if (this.data.isRecording) {
      wx.vibrateShort({ type: 'light' });
    }

    this.isRecordTouching = false;
    this.lastRecordTouchEndAt = Date.now();
    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }

    if (this.recordStartPending) {
      this.pendingStopAfterRecordStart = true;
    }
  },

  onRecordTouchCancel() {
    this.onRecordTouchEnd();
  },

  onRecordTap() {
    if (this.shouldIgnoreTap(this.lastRecordTouchStartAt, this.lastRecordTouchEndAt)) return;
    this.onRecordToggle();
  },

  onRecordToggle() {
    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }

    if (this.recordStartPending) return;
    this.startRecording();
  },

  // 开始录音
  async startRecording() {
    this.recordStartPending = true;
    try {
      const recorderReady = await this.prepareReadingRecorder({
        requestPrivacy: true,
        requestPermission: true,
        showToast: true
      });
      if (!recorderReady) {
        return;
      }

      if (this.data.isRoundRetellMode) {
        const hasSpeechReleasePending = this.hasPendingSpeechStop()
          || !!this.currentSpeechSessionTarget
          || !!this.speechStartPending;

        if (this.data.isSpeechRecording || this.activeSpeechTarget || hasSpeechReleasePending) {
          await this.stopSpeechInput({
            force: true,
            waitForStop: true,
            timeoutMs: 2600
          });
        }

        const speechReleasedAt = Math.max(this.lastSpeechStopAt || 0, this.lastSpeechStopRequestedAt || 0);
        const speechCooldown = 900 - (Date.now() - speechReleasedAt);
        if (speechCooldown > 0) {
          await this.sleep(speechCooldown);
        }
      } else {
        this.resetSpeechSessionState();
      }

      const recorderReleasedAt = Math.max(this.lastRecorderStopAt || 0, this.lastRecorderStopRequestedAt || 0);
      const recorderCooldown = 500 - (Date.now() - recorderReleasedAt);
      if (recorderCooldown > 0) {
        await this.sleep(recorderCooldown);
      }

      if (this.isRecordTouching === false) {
        return;
      }

      this.setData({
        hasRecorded: false,
        recordedFilePath: '',
        isPlaying: false
      });

      this.pendingStopAfterRecordStart = false;
      this.recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'aac'
      });
    } catch (error) {
      console.error('启动朗读录音失败', error);
      this.stopVADEffect();
      this.setData({
        isRecording: false
      });
      this.lastRecorderStopAt = Date.now();
      this.handlePrivacyRelatedError(error, '录音启动失败');
    } finally {
      setTimeout(() => {
        this.recordStartPending = false;
      }, 300);
    }
  },

  // 结束录音
  stopRecording() {
    if (!this.data.isRecording || !this.recorderManager) return;

    this.pendingStopAfterRecordStart = false;
    this.lastRecorderStopRequestedAt = Date.now();
    this.stopVADEffect();
    this.setData({
      isRecording: false
    });

    try {
      this.recorderManager.stop();
    } catch (error) {
      console.warn('停止朗读录音失败', error);
      this.lastRecorderStopAt = Date.now();
      this.handlePrivacyRelatedError(error, '录音停止失败');
    }
  },

  // 启动VAD效果（模拟光晕缩放）
  startVADEffect() {
    let time = 0;
    const vadTimer = setInterval(() => {
      time += 0.1;
      // 使用正弦波 + 随机噪声模拟声音强度的变化
      const baseScale = 1.2;
      const variation = Math.sin(time * 2) * 0.3 + (Math.random() - 0.5) * 0.2;
      const scale = Math.max(1, Math.min(2, baseScale + variation));

      this.setData({
        energyScale: scale
      });
    }, 100); // 每100ms更新一次

    this.setData({ vadTimer });
  },

  // 停止VAD效果
  stopVADEffect() {
    if (this.data.vadTimer) {
      clearInterval(this.data.vadTimer);
      this.setData({
        vadTimer: null,
        energyScale: 1
      });
    }
  },

  // 回放录音
  onPlayRecord() {
    if (this.data.isPlaying) {
      // 正在播放，停止播放
      if (this.audioPlayer) {
        this.audioPlayer.stop();
      }
      this.setData({
        isPlaying: false
      });
    } else {
      // 开始播放
      this.initAudioPlayer();
      this.audioPlayer.src = this.data.recordedFilePath;
      this.audioPlayer.play();
    }
  },

  // 确认录音，进入下一轮或完成
  onConfirmRecord() {
    wx.vibrateShort({ type: 'heavy' });
    const { readingRound, totalRounds, isRoundRetellMode, skipRetellForRemainingRounds } = this.data;

    // 所有场景：每句朗读后进入复述流程
    if (isRoundRetellMode && !skipRetellForRemainingRounds) {
      if (readingRound >= totalRounds) {
        const completedAt = new Date();
        this.addEnergy(20, true);
        this.setData({ anchorTime: completedAt });
        this.updateCheckIn(completedAt);

        setTimeout(() => {
          this.startPostReadingFlow(readingRound);
        }, 1000);
      } else {
        this.addEnergy(10);
        setTimeout(() => {
          this.startPostReadingFlow(readingRound);
        }, 400);
      }
      return;
    }

    // 跳过复述后，直接走纯朗读流程，最后一轮进入本心对话
    if (readingRound >= totalRounds) {
      const completedAt = new Date();
      this.addEnergy(20, true);
      this.setData({
        anchorTime: completedAt
      });
      this.updateCheckIn(completedAt);

      setTimeout(() => {
        this.showReadingTransition(readingRound);
      }, 800);
    } else {
      this.addEnergy(10);
      setTimeout(() => {
        this.showReadingTransition(readingRound);
      }, 400);
    }
  },

  // ========== 朗读后快速复盘 ==========

  // 每句朗读后进入复述流程
  startPostReadingFlow(round = this.data.readingRound) {
    const currentReflectionMantra = this.data.allMantras && this.data.allMantras.length > 0
      ? this.data.allMantras[round - 1] 
      : (this.data.currentText || '');

    this.setData({
      currentPhase: 'reading',
      showStamp: false,
      showReadingIntro: false,
      hasRecorded: false,
      isPlaying: false,
      postReadingStep: 'retell',
      currentReflectionRound: round,
      currentReflectionMantra: currentReflectionMantra,
      retellText: '',
      retellFeedback: '',
      selectedFinalState: '',
      selectedFinalStates: [],
      finalStateOptions: this.buildFinalStateOptions(),
      showCustomFeelingInput: false,
      feelingText: '',
      isGeneratingFeedback: false,
      isSpeechRecording: false,
      speechTarget: 'retell'
    });
  },

  async onSkipRetell() {
    wx.vibrateShort({ type: 'light' });
    await this.stopSpeechInput({
      waitForStop: true,
      timeoutMs: 2200
    });

    this.setData({
      skipRetellForRemainingRounds: true,
      retellText: '',
      retellFeedback: '',
      isSpeechRecording: false,
      speechTarget: 'reading'
    });

    const currentReflectionRound = this.data.currentReflectionRound || this.data.readingRound;
    if (currentReflectionRound >= this.data.totalRounds) {
      this.enterFinalStateFlow();
      return;
    }

    this.setData({
      postReadingStep: '',
      currentReflectionMantra: '',
      displayText: '',
      showGuide: false,
      showStamp: false,
      showReadingIntro: false
    });

    setTimeout(() => {
      this.nextRound();
    }, 320);
  },

  // 返回朗读阶段（重读上一句）
  async onBackToReading() {
    await this.stopSpeechInput({
      waitForStop: true,
      timeoutMs: 2200
    });
    this.setData({
      retellText: '',
      isRecording: false,
      isSpeechRecording: false,
      hasRecorded: false,
      recordedFilePath: '',
      speechTarget: 'reading',
      postReadingStep: null,
      showStamp: true,
      showReadingIntro: false,
      showReadingTransition: false,
      readingTransitionLines: [],
      readingTransitionButtonText: '',
      readingTransitionAction: '',
      phaseTitle: '',
      isPlaying: false,
      guideText: '长按开始朗读'
    });
  },

  // 提交快速复述并生成鼓励反馈（目前为 mock，后续可替换真实 AI）
  async onSubmitRetell() {
    if (this.data.isGeneratingFeedback) return;

    const currentReflectionRound = this.data.currentReflectionRound || this.data.readingRound;
    const mantraText = this.data.allMantras && this.data.allMantras.length > 0
      ? this.data.allMantras[currentReflectionRound - 1]
      : (this.data.currentText || '');
    const retellText = (this.data.retellText || '').trim();

    await this.stopSpeechInput({
      waitForStop: true,
      timeoutMs: 2200
    });

    if (!retellText) {
      const roundRetells = [...(this.data.roundRetells || [])];
      roundRetells[currentReflectionRound - 1] = '';
      this.setData({
        roundRetells,
        retellFeedback: ''
      });
      this.onContinueAfterFeedback();
      return;
    }

    this.setData({ isGeneratingFeedback: true });
    try {
      const retellFeedback = await this.generateRetellFeedback({
        scenarioTitle: this.data.scenario.title || '',
        readingRound: currentReflectionRound,
        totalRounds: this.data.totalRounds,
        mantraText,
        retellText
      });

      const roundRetells = [...(this.data.roundRetells || [])];
      roundRetells[currentReflectionRound - 1] = retellText;
      const roundFeedbacks = [...(this.data.roundFeedbacks || [])];
      roundFeedbacks[currentReflectionRound - 1] = retellFeedback;

      this.setData({
        roundRetells,
        roundFeedbacks,
        retellFeedback
      });

      // 直接进入下一句，跳过反馈页面展示
      this.onContinueAfterFeedback();
    } catch (error) {
      console.error('生成复述反馈失败', error);
      wx.showToast({
        title: '反馈生成失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isGeneratingFeedback: false });
    }
  },

  async onContinueAfterFeedback() {
    if (this.feedbackAutoTimer) {
      clearTimeout(this.feedbackAutoTimer);
      this.feedbackAutoTimer = null;
    }
    await this.stopSpeechInput({
      waitForStop: true,
      timeoutMs: 2200
    });
    const { currentReflectionRound, totalRounds } = this.data;

    if (currentReflectionRound >= totalRounds) {
      this.enterFinalStateFlow();
      return;
    }

    this.setData({
      postReadingStep: '',
      currentReflectionMantra: '',
      retellText: '',
      retellFeedback: '',
      isRecording: false,
      isSpeechRecording: false,
      hasRecorded: false,
      recordedFilePath: '',
      speechTarget: 'reading',
      displayText: '',
      showGuide: false,
      showStamp: false,
      showReadingIntro: false
    });

    setTimeout(() => {
      this.nextRound();
    }, 450);
  },

  // 反馈展示短暂停留后自动进入下一句（第5句后自动进入状态选择）
  scheduleAutoContinueAfterFeedback() {
    if (this.feedbackAutoTimer) {
      clearTimeout(this.feedbackAutoTimer);
      this.feedbackAutoTimer = null;
    }

    this.feedbackAutoTimer = setTimeout(() => {
      this.onContinueAfterFeedback();
    }, 1800);
  },

  enterFinalStateFlow() {
    this.setData({
      postReadingStep: 'state',
      currentReflectionMantra: '',
      retellText: '',
      retellFeedback: '',
      isRecording: false,
      isSpeechRecording: false,
      hasRecorded: false,
      recordedFilePath: '',
      showReadingTransition: false,
      readingTransitionLines: [],
      readingTransitionButtonText: '',
      readingTransitionAction: '',
      phaseTitle: '',
      closingOverlay: '',
      selectedFinalState: '',
      selectedFinalStates: [],
      finalStateOptions: this.buildFinalStateOptions(),
      showCustomFeelingInput: false,
      feelingText: ''
    });
  },

  onSelectFinalState(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;

    const currentSelected = Array.isArray(this.data.selectedFinalStates)
      ? [...this.data.selectedFinalStates]
      : [];
    const nextSelected = currentSelected.includes(value)
      ? currentSelected.filter((item) => item !== value)
      : [...currentSelected, value];

    this.setData({
      selectedFinalStates: nextSelected,
      selectedFinalState: nextSelected.join(','),
      finalStateOptions: this.buildFinalStateOptions(nextSelected),
      showCustomFeelingInput: nextSelected.includes('custom'),
      feelingText: nextSelected.includes('custom') ? this.data.feelingText : ''
    });
  },

  onFeelingInput(e) {
    this.setData({
      feelingText: e.detail.value
    });
  },

  getFinalStateLabel() {
    const selectedValues = Array.isArray(this.data.selectedFinalStates)
      ? this.data.selectedFinalStates
      : [];
    const labels = (this.data.finalStateOptions || [])
      .filter((item) => item.value !== 'custom' && selectedValues.includes(item.value))
      .map((item) => item.label);

    if (selectedValues.includes('custom')) {
      const customFeeling = (this.data.feelingText || '').trim();
      labels.push(customFeeling || '补充了一些感受');
    }

    return labels.join('、');
  },

  getFinalStateValue() {
    const selectedValues = Array.isArray(this.data.selectedFinalStates)
      ? this.data.selectedFinalStates
      : [];

    return selectedValues.map((value) => {
      if (value !== 'custom') {
        return value;
      }

      const customFeeling = (this.data.feelingText || '').trim();
      return customFeeling ? `custom:${customFeeling}` : 'custom';
    }).join(',');
  },

  // 第5句复述完成后：选择状态并生成卡片
  async onGenerateDiaryFromState() {
    if (this.data.isGeneratingJournal) return;

    const selectedFinalStates = Array.isArray(this.data.selectedFinalStates)
      ? this.data.selectedFinalStates
      : [];
    if (!selectedFinalStates.length) {
      wx.showToast({
        title: '请选择你此刻的状态',
        icon: 'none'
      });
      return;
    }

    this.stopSpeechInput();
    const finalStateValue = this.getFinalStateValue();
    const finalStateLabel = this.getFinalStateLabel();
    const cleanRoundRetells = (this.data.roundRetells || []).map((item) => (typeof item === 'string' ? item : ''));
    const cleanAllMantras = (this.data.allMantras || []).map((item) => (typeof item === 'string' ? item : ''));

    this.setData({ isGeneratingJournal: true });
    wx.showLoading({
      title: '生成日记卡片中...',
      mask: true
    });

    try {
      const mindfulJournal = await this.generateMindfulJournal({
        scenarioTitle: this.data.scenario.title || '',
        allMantras: cleanAllMantras,
        roundRetells: cleanRoundRetells,
        finalState: finalStateValue,
        finalStateLabel: finalStateLabel,
        stormTime: this.data.stormTime,
        shiftTime: this.data.shiftTime,
        anchorTime: this.data.anchorTime
      });

      this.setData({
        mindfulJournal,
        feelingText: finalStateLabel
      });

      wx.hideLoading();
      this.navigateToCardWithoutAI();
    } catch (error) {
      console.error('生成日记失败', error);
      wx.hideLoading();
      wx.showToast({
        title: '日记生成失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isGeneratingJournal: false });
    }
  },

  // 优先调用后端AI接口，失败时回退本地兜底
  async generateRetellFeedback(payload) {
    try {
      // 传递 silent: true，防止网络不通时弹出"网络请求失败"的toast
      const response = await api.post('/ai/retell-feedback', payload, false, true);
      const feedback = response && response.data && response.data.feedback;
      if (feedback) return feedback;
      throw new Error('AI反馈为空');
    } catch (error) {
      // 记录一个普通日志即可，不需要 warn，因为目前是预期内的 Mock 行为
      console.log('调用AI复述反馈失败，使用本地兜底（预期内行为）');
      return this.mockEvaluateRetell(payload);
    }
  },

  async generateMindfulJournal(payload) {
    try {
      const response = await api.post('/ai/mindful-diary', payload, false, true);
      const diaryContent = response && response.data && response.data.diaryContent;
      if (diaryContent) return diaryContent;
      throw new Error('AI日记为空');
    } catch (error) {
      console.error('调用AI日记失败:', error);
      throw error;
    }
  },

  // mock：复述评价（鼓励与抱持）
  mockEvaluateRetell({ scenarioTitle, retellText }) {
    const contentLength = retellText.replace(/\s/g, '').length;
    const sceneTitle = scenarioTitle || '刚刚这个场景';
    const levelText = contentLength > 80
      ? '你把关键细节抓得很完整，这说明你真的在用心练习。'
      : contentLength > 30
        ? '你已经抓住了重点，复述得很有力量。'
        : '你愿意马上复述，本身就是很强的心力行动。';

    const finalText = `在“${sceneTitle}”里，${levelText}你没有被情绪推着走，而是主动把注意力带回当下，这就是心力在变强。你每一次愿意停下来、说出来、再选择一次，都会让家里的空气更柔和、更有希望。你已经在把“稳住”变成家庭里的真实力量了。`;

    return new Promise((resolve) => {
      setTimeout(() => resolve(finalText), 900);
    });
  },

  // mock：正念育儿日记
  mockGenerateJournal({ scenarioTitle, roundRetells, finalStateLabel, stormTime, shiftTime, anchorTime }) {
    const sceneTitle = scenarioTitle || '日常育儿时刻';
    const retellSummary = (roundRetells || []).filter(Boolean).slice(0, 2).join('；').trim().slice(0, 80);
    const feelingSummary = finalStateLabel || '平静下来了';
    const stormLabel = stormTime ? this.formatTime(stormTime) : '--:--';
    const shiftLabel = shiftTime ? this.formatTime(shiftTime) : '--:--';
    const anchorLabel = anchorTime ? this.formatTime(anchorTime) : '--:--';

    const journal = [
      `刚刚在“${sceneTitle}”这个时刻里，我先经历了情绪上涌。`,
      `从 ${stormLabel} 到 ${shiftLabel} 再到 ${anchorLabel}，我看见自己不是只能爆发，我也可以慢慢稳住。`,
      '',
      `我复述给自己的那句话是：${retellSummary || '我愿意先稳住，再去回应孩子。'}`,
      `现在我的感觉是：${feelingSummary || '身体在慢慢放松，心也回来了。'}`,
      '',
      '我想肯定自己：今天的我没有追求完美，而是做了一个更有力量的选择。',
      '当我先安顿好自己，孩子就更容易感到被理解，家里的希望也会一点点亮起来。',
      '',
      '下一次遇到类似时刻，我会先呼吸三次，再开口说话。'
    ].join('\n');

    return new Promise((resolve) => {
      setTimeout(() => resolve(journal), 1000);
    });
  },

  formatTime(timeValue) {
    const date = timeValue instanceof Date ? timeValue : new Date(timeValue);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  },

  // 更新打卡记录
  updateCheckIn(practiceTime = new Date()) {
    try {
      const dateStr = this.getPracticeDateString(practiceTime);
      
      const checkInMap = wx.getStorageSync('checkInMap') || {};
      const isFirstToday = !checkInMap[dateStr];

      if (isFirstToday) {
        checkInMap[dateStr] = true;
        wx.setStorageSync('checkInMap', checkInMap);
      }

      const totalDays = Object.keys(checkInMap).length;
      const consecutiveDays = this.calculateConsecutiveDays(checkInMap);
      const energyData = this.getStoredEnergyData();

      energyData.consecutiveDays = consecutiveDays;
      energyData.lastCheckInDate = dateStr;
      energyData.lastEnergyResetDate = energyData.lastEnergyResetDate || dateStr;

      wx.setStorageSync('totalDays', totalDays);
      this.saveEnergyData(energyData);
      this.setData({
        consecutiveDays,
        lastCheckInDate: dateStr
      });
      
      const totalCount = (wx.getStorageSync('totalCount') || 0) + 1;
      wx.setStorageSync('totalCount', totalCount);

      this.syncPracticeRecord(practiceTime);
      
      console.log('首页呼吸练习打卡成功:', dateStr);
    } catch (e) {
      console.error('更新打卡记录失败', e);
    }
  },

  async syncPracticeRecord(practiceTime = new Date()) {
    const isLoggedIn = typeof app.isLoggedIn === 'function'
      ? app.isLoggedIn()
      : !!(wx.getStorageSync('token') && wx.getStorageSync('openid'));
    const scenarioId = this.data.scenario && this.data.scenario.id;

    if (!isLoggedIn || !scenarioId) {
      return;
    }

    const duration = this.data.stormTime
      ? Math.max(new Date(practiceTime).getTime() - new Date(this.data.stormTime).getTime(), 0)
      : 0;

    try {
      await api.post(
        '/scenarios/practice',
        {
          scenarioId,
          duration,
          energy: 60
        },
        true,
        true
      );
    } catch (error) {
      console.warn('同步练习记录失败，已保留本地数据', error);
    }
  },

  // 进入下一轮朗读
  nextRound() {
    const nextRound = this.data.readingRound + 1;

    // 按总轮数线性提亮背景（30 -> 100）
    const stepRatio = (nextRound - 1) / Math.max(1, this.data.totalRounds - 1);
    const newBrightness = Math.round(30 + (stepRatio * 70));
    const nextMantra = this.data.allMantras && this.data.allMantras.length > 0
      ? this.data.allMantras[nextRound - 1] 
      : (this.data.currentText || '');

    this.setData({
      readingRound: nextRound,
      backgroundBrightness: newBrightness,
      currentText: nextMantra, // 更新文案
      displayText: '', // 清空，等待打字机效果
      showGuide: true, // 确保从复述返回后下一句可见
      showStamp: false, // 先隐藏录音按钮，等打字机完成后再显示
      showReadingIntro: false,
      showReadingTransition: false,
      readingTransitionLines: [],
      readingTransitionButtonText: '',
      readingTransitionAction: '',
      phaseTitle: '',
      closingOverlay: '',
      guideText: this.getGuideText(nextRound), // 更新引导语
      isRecording: false,
      isSpeechRecording: false,
      speechTarget: 'reading',
      hasRecorded: false, // 重置录音状态
      recordedFilePath: ''
    });

    this.prepareReadingRecorder().catch((error) => {
      console.warn('下一轮朗读录音预热失败', error);
    });

    // 启动打字机效果
    this.startTypewriter();
  },

  // 跳转到卡片页面（不需要AI生成文案）
  navigateToCardWithoutAI() {
    const {
      scenario,
      stormTime,
      shiftTime,
      anchorTime,
      allMantras,
      retellText,
      retellFeedback,
      feelingText,
      mindfulJournal
    } = this.data;

    wx.navigateTo({
      url: '/pages/card/card',
      success: (res) => {
        res.eventChannel.emit('acceptData', {
          scenario: scenario,
          stormTime: stormTime,
          shiftTime: shiftTime,
          anchorTime: anchorTime,
          allMantras: allMantras,  // 传递5层朗读的句子
          generatedDiaryContent: mindfulJournal || '',
          reflectionData: {
            retellText,
            retellFeedback,
            feelingText,
            mindfulJournal
          }
        });
      },
      fail: (err) => {
        console.error('跳转失败', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
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
    this.stopSpeechInput();
    if (this.data.isCompleted) {
      this.onBackHome();
    } else {
      wx.navigateBack();
    }
  }
});
