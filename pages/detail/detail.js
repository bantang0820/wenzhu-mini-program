// pages/detail/detail.js - 原研哉式极简主义完整版
const scenariosData = require('../../data/scenarios.js');

Page({
  data: {
    scenario: {}, // 场景数据
    currentText: '', // 当前金句
    displayText: '', // 打字机显示的文字
    currentDate: '', // 当前日期

    // 阶段管理
    currentPhase: 'holding', // holding | reading | completed

    // 第一阶段：长按止颤
    isDarkMode: false,
    isStabilizing: false,
    isStabilized: false,
    isHolding: false,
    holdProgress: 0,
    holdTimer: null,
    progressTimer: null,

    // 第二阶段：三轮朗读
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
    if (this.data.vadTimer) clearInterval(this.data.vadTimer);
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
      1: '请轻声朗读，让情绪流过你的身体',
      2: '把这句话读给自己听，找回你的力量',
      3: '深呼吸，让这句话真正进入心里',
      4: '感受每一个字，让它滋养你的心',
      5: '最后一句，让它成为你的一部分'
    };
    return guideTexts[round] || guideTexts[1];
  },

  // 加载场景数据
  loadScenario(id) {
    // 使用外部场景数据文件
    const scenario = scenariosData[id] || scenariosData["001"];

    // 如果场景有modules结构（新格式），从5个模块各随机选1句
    let finalMantras = [];
    if (scenario.modules) {
      // 从每个模块随机选1句
      const module1 = scenario.modules.module1;
      const module2 = scenario.modules.module2;
      const module3 = scenario.modules.module3;
      const module4 = scenario.modules.module4;
      const module5 = scenario.modules.module5;

      // 随机选择函数
      const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      finalMantras = [
        randomPick(module1),
        randomPick(module2),
        randomPick(module3),
        randomPick(module4),
        randomPick(module5)
      ];
    } else {
      // 旧格式，直接使用mantras
      finalMantras = scenario.mantras;
    }

    // 保留一些默认场景数据作为后备（兼容其他场景）
    const fallbackData = {
      "001": {
        id: "001",
        title: "孩子磨蹭",
        category: "焦虑",
        // 稳住引导语（第一阶段）
        stabilizeText: "深呼吸，稳住。这只是情绪，不是事实。",
        // 五阶定心文案
        mantras: [
          // 第一轮：承认
          "我承认我现在很焦虑，这没关系。这只是情绪，不是事实。",
          // 第二轮：抽离
          "我把期待暂时放下。孩子是孩子，我是我。我不必控制一切。",
          // 第三轮：归位
          "我是稳稳的。我有能力处理好这一刻。我也爱我自己。",
          // 第四轮：滋养
          "我允许时间慢下来。孩子的节奏和我不同，这没关系。",
          // 第五轮：整合
          "我选择耐心。每一次等待，都是在练习爱的能力。"
        ],
        // 治愈的话
        healingQuote: "现在的你，已经找回了耐心和温柔。去抱抱那个正在探索世界的孩子吧，他知道你会等他。"
      },
      "002": {
        id: "002",
        title: "作业拖拉",
        category: "焦虑",
        stabilizeText: "深呼吸，稳住。这不是态度问题，这是能力发展中的必然。",
        // 100句分为5个模块，朗读时从每个模块随机选1句（共5句）
        modules: {
          module1: [
            "当我怒火中烧时，我提醒自己：站在我面前的是个大脑尚未完工的生物。他的前额叶要到25岁才能成熟。此刻的磨蹭不是对抗，而是系统死机。我要做的是帮他重启，而不是对着死机的电脑发脾气。",
            "如果我此刻吼叫，只会激活他的爬行脑。这会让他瞬间进入战斗或逃跑状态，大脑皮层供血切断，彻底失去思考能力。为了让他变聪明，我必须先让自己闭嘴，创造安全场域。",
            "他的大脑由多巴胺驱动，渴望当下快乐；而负责延迟满足的神经回路还没连通。他看向窗外、玩橡皮，是在本能地寻找刺激。这不代表他懒，只代表他是个正常的孩子。",
            "我刚才对他说了长长一串指令，他却没动。不是他没听见，而是他的工作记忆容量很小，一次只能处理一个动作。我的唠叨造成了认知过载。我深吸一口气，把指令简化：拿起笔，写下第一个字。",
            "孩子的时间感是模糊的。在他的世界里，5分钟和1小时没有区别。我不能怪盲人看不见路，同样也不能怪孩子看不见时间。我要做他的外挂时钟，用沙漏或番茄钟帮他把无形的时间变成有形的视觉信号。"
          ],
          module2: [
            "我必须记住：写作业是他的课题，不是我的。我如此焦虑，是因为我妄想替他去过他的人生。但我无法替他长肌肉，也无法替他长脑子。我若替他着急，就是剥夺了他体验为自己负责的机会。",
            "我对他的人生有影响力，但我没有控制权。当我试图强行控制他的手去写字时，我们之间就只剩下了权力斗争，而学习成了牺牲品。此刻，我选择从控制者退回到支持者。",
            "看着他明天要交作业却还没写完，我本能地想去帮他写。住手！如果我永远帮他兜底，他就永远学不会对时间负责。我忍住焦虑，允许他明天面对老师的批评。",
            "我坐在他旁边盯着，像个监工，这让他觉得作业是给妈妈写的。我慢慢站起来，告诉他：妈妈相信你能行，妈妈去读自己的书了。我的离开不是抛弃，而是传递信任。",
            "孩子的作业分数，不是我的家长成绩单。他写得慢，不代表我教育失败；他写得快，也不代表我高人一等。我不需要通过孩子来证明我的价值。我本身的价值是圆满的。"
          ],
          module3: [
            "我不再给他贴上懒的标签。懒是一个道德审判，它会把孩子定在耻辱柱上。我把它重构为能力缺失。他现在的磨蹭，是在告诉我：妈妈，我缺乏拆解任务的能力。这是呼救信号，不是挑衅。",
            "即使他在玩手指，也不是为了故意气我。也许是因为题目太难，他在通过玩手指来缓解焦虑；也许是因为太无聊，他在自我娱乐。每一个行为背后都有一个正面的动机。",
            "我用初学者的眼光看他。他来到这个世界才几年，面对复杂的学业任务，他就是个笨拙的实习生。没有哪个实习生是一上手就熟练的。允许他犯错，允许他走弯路，允许他效率低。",
            "我不盯着那90%没写完的作业发愁，我盯着那10%已经写完的字随喜。哇，你已经写完两行了，这需要不少专注力呢。我用放大镜寻找他的微小胜利。",
            "我不拿他和别人家的孩子比，那是刻舟求剑。我只拿他和昨天的他比。昨天你磨蹭了1小时，今天只磨蹭了50分钟，这就是进步！只要曲线是向上的，哪怕斜率很低，也是在上升。"
          ],
          module4: [
            "在我想吼叫之前，我先走过去，把手轻轻搭在他的肩膀上，或者摸摸他的头。这个简单的肢体接触，能瞬间降低他的皮质醇，也能让我的催产素分泌。身体连接了，心就连接了。",
            "我不再站着俯视他，那是压迫者的姿态。我蹲下来，目光与他平视。我说：嗨，我看你眉头紧锁，是遇到拦路虎了吗？平等的视线，能让他感到被尊重。",
            "我不说你这么磨蹭，我说：我看到过去20分钟里，你只写了3行字，而且叹了5口气。这是观察，不是评判。事实是最有力量的。面对事实，他无法辩驳，只能反思。",
            "我不发模糊的指令如快点、认真点。我说：请在接下来的10分钟里，把这5道口算题做完，然后我们休息。指令越具体、越微小，执行力就越高。",
            "我不命令先写语文。我问：你是想先做语文这只大老虎，还是先做英语这只小兔子？给他选择权，就是给他掌控感。拥有掌控感的人，内驱力会自动提升。"
          ],
          module5: [
            "我是一个拥有巨大容器感的家长。我的心宽广到能装下他的优秀，也稳稳托得住他的磨蹭、混乱和无助。我是这个家庭的情绪定海神针，只要我是稳的，孩子的世界就是安全的。",
            "我的爱是坚固的磐石，绝不会因为他今天少写一行字而动摇。作业是浪花，亲子关系是海床。浪花再大，也卷不走海床。我稳稳地坐在那里，告诉他：无论发生什么，妈妈都在。",
            "我相信每个生命都有向上生长的本能。就像种子会发芽，向日葵会转向太阳。他的磨蹭只是暂时的乌云，遮不住他内在的生命力。我透过现象看本质，看到那个生机勃勃的灵魂。",
            "我爱他，仅仅因为他存在，不因为他做了什么，也不因为他没做什么。这种无条件的爱，是他行走人世间的底气。如果爱有条件，那叫交易。我给他的是爱，纯粹的、不带杂质的爱。",
            "最后，我对自己说两个字：稳住。稳住我的呼吸，稳住我的情绪，稳住我的爱。只要我稳住了，孩子就稳住了，未来就稳住了。先稳住自己，再拥抱孩子。"
          ]
        },
        healingQuote: "现在的你，已经找回了耐心和智慧。去温柔地陪在他身边吧，你知道他在努力，他也知道你会等他。"
      },
      "003": {
        id: "003",
        title: "不听话",
        category: "愤怒",
        stabilizeText: "愤怒是身体的信号，深呼吸，稳住。",
        mantras: [
          "我承认我现在很愤怒，这没关系。愤怒是身体的信号，我不必自责。",
          "我把'他必须听话'的期待放下。他在探索边界，这是成长的必经之路。",
          "我是稳稳的。温和而坚定，我可以设立界限，也保护我们的关系。",
          "我可以表达愤怒，但不伤害他。我的情绪是我的责任。",
          "爱就是允许他不听话。我可以不同意，但我依然爱他。"
        ],
        healingQuote: "你的温柔和坚定，是最好的教育。现在的你，可以蹲下来，看着他的眼睛说：我爱你，但我们需要遵守规则。"
      }
    };

    this.setData({
      scenario: scenario,
      currentText: scenario.stabilizeText, // 第一阶段：稳住引导语
      displayText: scenario.stabilizeText, // 直接显示完整文字
      allMantras: finalMantras, // 保存所有轮次的文案（从5个模块各选1句）
      healingQuote: scenario.healingQuote // 保存治愈的话
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
    const firstMantra = this.data.allMantras[0];

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
      recordedFilePath: ''
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

    // 启动VAD效果模拟（由于小程序限制，使用正弦波模拟光晕缩放）
    this.startVADEffect();
  },

  // 结束录音
  onRecordEnd() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();

    // 停止VAD效果
    this.stopVADEffect();
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

    // 判断是否是最后一轮（第5句）
    if (this.data.readingRound >= this.data.totalRounds) {
      // 第五句完成：+10能量 +50每日奖励 = +60能量
      this.addEnergy(60, true); // isDailyBonus=true显示特殊提示

      // 记录安顿时刻（点击完成录音的瞬间）
      this.setData({
        anchorTime: new Date()
      });

      // 更新打卡记录
      this.updateCheckIn();

      // 延迟跳转到卡片页面
      setTimeout(() => {
        this.navigateToCardWithoutAI();
      }, 1500);
    } else {
      // 普通句子：+10能量
      this.addEnergy(10);

      // 进入下一轮
      setTimeout(() => {
        this.nextRound();
      }, 500);
    }
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

  // 跳转到卡片页面（不需要AI生成文案）
  navigateToCardWithoutAI() {
    const { scenario, stormTime, shiftTime, anchorTime, allMantras } = this.data;

    wx.navigateTo({
      url: '/pages/card/card',
      success: (res) => {
        res.eventChannel.emit('acceptData', {
          scenario: scenario,
          stormTime: stormTime,
          shiftTime: shiftTime,
          anchorTime: anchorTime,
          allMantras: allMantras  // 传递5层朗读的句子
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
    if (this.data.isCompleted) {
      this.onBackHome();
    } else {
      wx.navigateBack();
    }
  }
});
