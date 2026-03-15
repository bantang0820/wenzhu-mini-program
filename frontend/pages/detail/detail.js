// pages/detail/detail.js - 原研哉式极简主义完整版
const scenariosData = require('../../utils/scenarios.js');
const api = require('../../utils/api.js');
const app = getApp();

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
    postReadingStep: '', // '' | retell | feedback | state
    currentReflectionRound: 0,
    currentReflectionMantra: '',
    retellText: '',
    retellFeedback: '',
    roundRetells: [],
    roundFeedbacks: [],
    selectedFinalState: '',
    finalStateOptions: [
      { value: 'calmer', label: '平静下来了' },
      { value: 'more_patient', label: '更有耐心了' },
      { value: 'relaxed', label: '松弛了一些' },
      { value: 'understood', label: '接纳了现状' },
      { value: 'still_tight', label: '还有点紧绷' },
      { value: 'need_support', label: '还想再练练' },
      { value: 'exhausted', label: '觉得很疲惫' },
      { value: 'custom', label: '自定义补充' }
    ],

    // 兼容卡片透传字段
    feelingText: '',
    mindfulJournal: '',
    isGeneratingFeedback: false,
    isGeneratingJournal: false,
    speechAvailable: false,
    isSpeechRecording: false,
    speechTarget: 'retell', // reading | retell | feeling
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
  },

  onLoad(options) {
    const { id, mode, autoStart } = options;

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

  onUnload() {
    this.stopSpeechInput();
    this.clearAllTimers();
    if (this.audioPlayer) {
      this.audioPlayer.destroy();
      this.audioPlayer = null;
    }
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
        const speechTarget = this.activeSpeechTarget || this.data.speechTarget;
        console.log('语音识别开始', speechTarget);

        if (speechTarget === 'reading') {
          this.setData({
            isRecording: true
          });
          this.startVADEffect();
          return;
        }

        this.setData({
          isSpeechRecording: true
        });
      };
      
      this.speechManager.onRecognize = (res) => {
        // 实时转写
        const speechTarget = this.activeSpeechTarget || this.data.speechTarget;
        if (res.result && speechTarget !== 'reading') {
          this.updateSpeechText(res.result, { animated: true });
        }
      };

      this.speechManager.onStop = (res) => {
        const speechTarget = this.activeSpeechTarget || this.data.speechTarget;

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
      };

      this.speechManager.onError = (res) => {
        console.error('录音识别失败', res.msg);
        const speechTarget = this.activeSpeechTarget || this.data.speechTarget;
        if (speechTarget === 'reading') {
          this.stopVADEffect();
          this.setData({
            isRecording: false,
            speechAvailable: false
          });
        } else {
          this.setData({
            isSpeechRecording: false,
            speechAvailable: false
          });
        }
        this.lastSpeechStopAt = Date.now();
        this.activeSpeechTarget = '';
        wx.showToast({
          title: res.msg || '识别失败，请重试',
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

  async waitForSpeechRelease(timeoutMs = 1800) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const isBusy = this.data.isRecording
        || this.data.isSpeechRecording
        || !!this.activeSpeechTarget
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

  shouldIgnoreTap(lastTouchTimestamp) {
    return lastTouchTimestamp && (Date.now() - lastTouchTimestamp < 350);
  },

  onSpeechRecordTouchStart() {
    this.lastSpeechTouchStartAt = Date.now();
    this.onSpeechRecordToggle();
  },

  onSpeechRecordTap() {
    if (this.shouldIgnoreTap(this.lastSpeechTouchStartAt)) return;
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

    if (this.speechManager && shouldStopCurrentSpeech) {
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
        this.lastSpeechStopAt = Date.now();
      }
    } else if (this.speechRecorder && shouldStopCurrentSpeech) {
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
        this.lastSpeechStopAt = Date.now();
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
      1: '长按麦克风，轻声朗读，让情绪流过',
      2: '长按麦克风，把这句话读给自己听',
      3: '长按麦克风，深呼吸，让这句话进入心里',
      4: '长按麦克风，感受每一个字，让它滋养你的心',
      5: '长按麦克风，最后一句，让它成为你的一部分'
    };
    return guideTexts[round] || guideTexts[1];
  },

  // 加载场景数据
  loadScenario(id) {
    // 使用外部场景数据文件
    const scenario = scenariosData[id] || scenariosData["001"] || {};

    // 如果场景有modules结构（新格式），从5个模块各随机选1句
    let finalMantras = [];
    if (scenario.modules) {
      // 从每个模块随机选1句
      const module1 = Array.isArray(scenario.modules.module1) ? scenario.modules.module1 : [];
      const module2 = Array.isArray(scenario.modules.module2) ? scenario.modules.module2 : [];
      const module3 = Array.isArray(scenario.modules.module3) ? scenario.modules.module3 : [];
      const module4 = Array.isArray(scenario.modules.module4) ? scenario.modules.module4 : [];
      const module5 = Array.isArray(scenario.modules.module5) ? scenario.modules.module5 : [];

      // 随机选择函数
      const randomPick = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';

      finalMantras = [
        randomPick(module1),
        randomPick(module2),
        randomPick(module3),
        randomPick(module4),
        randomPick(module5)
      ].filter(Boolean);
    } else {
      // 旧格式，直接使用mantras
      finalMantras = Array.isArray(scenario.mantras) ? scenario.mantras.filter(Boolean) : [];
    }


    const isRoundRetellMode = true; // 同步到所有场景：统一启用逐句复述模式
    // 直接使用scenario数据，不再使用fallbackData（因为scenarios.js已有完整数据）
    const normalizedScenario = {
      ...scenario
    };
    const initialText = normalizedScenario.stabilizeText || finalMantras[0] || fallbackScenario.stabilizeText || '';

    this.setData({
      scenario: normalizedScenario,
      currentText: initialText, // 第一阶段：稳住引导语
      displayText: initialText, // 直接显示完整文字
      allMantras: finalMantras, // 保存所有轮次的文案（从5个模块各选1句）
      healingQuote: normalizedScenario.healingQuote || '', // 保存治愈的话
      isRoundRetellMode: isRoundRetellMode,
      roundRetells: [],
      roundFeedbacks: [],
      selectedFinalState: '',
      currentReflectionRound: 0,
      currentReflectionMantra: '',
      postReadingStep: ''
    });
  },

  // ========== 能量系统 ==========

  // 加载能量数据
  loadEnergyData() {
    const energyData = wx.getStorageSync('energyData') || {
      totalEnergy: 0,
      todayEnergy: 0,
      todaySentences: 0,
      consecutiveDays: 0,
      lastCheckInDate: null
    };

    // 检查是否是新的一天
    const today = new Date().toDateString();
    if (energyData.lastCheckInDate !== today) {
      // 新的一天，重置今日能量
      energyData.todayEnergy = 0;
      energyData.todaySentences = 0;

      // 检查连续打卡
      const lastDate = energyData.lastCheckInDate ? new Date(energyData.lastCheckInDate) : null;
      if (lastDate) {
        const diffTime = new Date().getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // 连续打卡
          energyData.consecutiveDays += 1;
        } else if (diffDays > 1) {
          // 中断，重置连续天数
          energyData.consecutiveDays = 0;
        }
      }

      energyData.lastCheckInDate = today;
      this.saveEnergyData(energyData);
    }

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
    const newTotalEnergy = this.data.totalEnergy + amount;
    const newTodayEnergy = this.data.todayEnergy + amount;
    const newTodaySentences = this.data.todaySentences + 1;

    const energyData = {
      totalEnergy: newTotalEnergy,
      todayEnergy: newTodayEnergy,
      todaySentences: newTodaySentences,
      consecutiveDays: this.data.consecutiveDays,
      lastCheckInDate: this.data.lastCheckInDate
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
    wx.setStorageSync('energyData', data || {
      totalEnergy: this.data.totalEnergy,
      todayEnergy: this.data.todayEnergy,
      todaySentences: this.data.todaySentences,
      consecutiveDays: this.data.consecutiveDays,
      lastCheckInDate: this.data.lastCheckInDate
    });
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
      showGuide: true,
      showStamp: false,
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
      feelingText: '',
      mindfulJournal: '',
      isGeneratingFeedback: false,
      isGeneratingJournal: false,
      isSpeechRecording: false,
      speechTarget: 'retell'
    });

    // 启动打字机效果
    this.startTypewriter();
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
      showGuide: true,
      showStamp: false, // 先隐藏录音按钮，等打字机完成后再显示
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
      feelingText: '',
      mindfulJournal: '',
      isGeneratingFeedback: false,
      isGeneratingJournal: false,
      isSpeechRecording: false,
      speechTarget: 'retell'
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

  onRecordTouchStart() {
    this.lastRecordTouchStartAt = Date.now();
    this.onRecordToggle();
  },

  onRecordTap() {
    if (this.shouldIgnoreTap(this.lastRecordTouchStartAt)) return;
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
      await this.startSpeechCapture('reading');
    } finally {
      setTimeout(() => {
        this.recordStartPending = false;
      }, 300);
    }
  },

  // 结束录音
  stopRecording() {
    if (!this.data.isRecording) return;
    this.stopSpeechInput();
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
    const { readingRound, totalRounds, isRoundRetellMode } = this.data;

    // 所有场景：每句朗读后进入复述流程
    if (isRoundRetellMode) {
      if (readingRound >= totalRounds) {
        this.addEnergy(60, true);
        this.setData({ anchorTime: new Date() });
        this.updateCheckIn();

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

    // 判断是否是最后一轮（第5句）
    if (readingRound >= totalRounds) {
      // 第五句完成：+10能量 +50每日奖励 = +60能量
      this.addEnergy(60, true); // isDailyBonus=true显示特殊提示

      // 记录安顿时刻（点击完成录音的瞬间）
      this.setData({
        anchorTime: new Date()
      });

      // 更新打卡记录
      this.updateCheckIn();

      // 其他场景保持原逻辑：直接进入日记卡片
      setTimeout(() => {
        this.navigateToCardWithoutAI();
      }, 1200);
    } else {
      // 普通句子：+10能量
      this.addEnergy(10);

      // 进入下一轮
      setTimeout(() => {
        this.nextRound();
      }, 500);
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
      hasRecorded: false,
      isPlaying: false,
      postReadingStep: 'retell',
      currentReflectionRound: round,
      currentReflectionMantra: currentReflectionMantra,
      retellText: '',
      retellFeedback: '',
      selectedFinalState: '',
      isGeneratingFeedback: false,
      isSpeechRecording: false,
      speechTarget: 'retell'
    });
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
    if (!retellText) {
      wx.showToast({
        title: '先按按钮说一句复述',
        icon: 'none'
      });
      return;
    }

    await this.stopSpeechInput({
      waitForStop: true,
      timeoutMs: 2200
    });
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
      this.setData({
        postReadingStep: 'state',
        selectedFinalState: ''
      });
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
      showStamp: false
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

  onSelectFinalState(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({
      selectedFinalState: value
    });
  },

  onFeelingInput(e) {
    this.setData({
      feelingText: e.detail.value
    });
  },

  getFinalStateLabel() {
    const selected = this.data.selectedFinalState;
    if (selected === 'custom') {
      return this.data.feelingText || '补充了一些感受';
    }
    const option = (this.data.finalStateOptions || []).find((item) => item.value === selected);
    return option ? option.label : '';
  },

  // 第5句复述完成后：选择状态并生成卡片
  async onGenerateDiaryFromState() {
    if (this.data.isGeneratingJournal) return;

    const selectedFinalState = this.data.selectedFinalState;
    if (!selectedFinalState) {
      wx.showToast({
        title: '请选择你此刻的状态',
        icon: 'none'
      });
      return;
    }

    this.stopSpeechInput();
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
        finalState: selectedFinalState,
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
      console.log('调用AI日记失败，使用本地兜底（预期内行为）');
      return this.mockGenerateJournal(payload);
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
  updateCheckIn() {
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // 2. 更新总天数 (如果是今天第一次打卡)
      const checkInMap = wx.getStorageSync('checkInMap') || {};
      if (!checkInMap[dateStr]) {
        checkInMap[dateStr] = true;
        wx.setStorageSync('checkInMap', checkInMap);
        
        const totalDays = (wx.getStorageSync('totalDays') || 0) + 1;
        wx.setStorageSync('totalDays', totalDays);
      }
      
      // 3. 更新总次数
      const totalCount = (wx.getStorageSync('totalCount') || 0) + 1;
      wx.setStorageSync('totalCount', totalCount);
      
      console.log('首页呼吸练习打卡成功:', dateStr);
    } catch (e) {
      console.error('更新打卡记录失败', e);
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
      guideText: this.getGuideText(nextRound), // 更新引导语
      isRecording: false,
      isSpeechRecording: false,
      speechTarget: 'reading',
      hasRecorded: false, // 重置录音状态
      recordedFilePath: ''
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
