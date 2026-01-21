// pages/stats/stats.js - 觉察（心灵花园 + 岁月相册 + 宝藏抽屉）
const app = getApp();

// 安全获取云数据库实例
let db = null;
try {
  if (wx.cloud) {
    db = wx.cloud.database();
  }
} catch (error) {
  console.warn('云数据库初始化失败', error);
}

Page({
  data: {
    // ========== 顶部：心灵花园 ==========
    totalDays: 0, // 已正念育儿天数
    totalCount: 0, // 击退焦虑次数

    // ========== 中部：岁月相册 ==========
    currentYear: 0,
    currentMonth: 0,
    monthDisplay: '', // 月份显示文本
    calendarDays: [], // 日历日期数组
    checkedDates: {}, // 打卡日期对象 { "2025-01-15": true }
    availableMonths: [], // 有记录的月份列表

    // ========== 树的精灵（宝物） ==========
    skyTreasures: [], // 树冠周围（天空）- 轻盈物品
    groundTreasures: [], // 树根处（大地）- 厚重物品
    allTreasures: [], // 所有宝物（用于树洞查看）
    hasMoreTreasures: false, // 是否有更多宝物（超过5个）

    loading: true
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadAllData();
  },

  // 初始化数据
  initData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.setData({
      currentYear: year,
      currentMonth: month,
      monthDisplay: `${year}.${String(month).padStart(2, '0')}`,
      checkedDates: {},
      calendarDays: [],
      medals: [],
      lockedMedals: []
    });
    // 延迟加载，确保页面先渲染
    setTimeout(() => {
      this.loadAllData();
    }, 100);
  },

  // ========== 加载所有数据 ==========
  async loadAllData() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadUserStats().catch(err => {
          console.error('加载用户统计失败', err);
        }),
        this.loadCalendarData().catch(err => {
          console.error('加载日历数据失败', err);
        }),
        this.loadMedalData()
      ]);
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // ========== 加载用户统计数据 ==========
  async loadUserStats() {
    try {
      // 检查云数据库是否可用
      if (!wx.cloud || !db) {
        throw new Error('云数据库未初始化');
      }

      const openid = app.globalData.openid || (await this.getOpenId());
      
      if (!openid) {
        throw new Error('未获取到用户ID');
      }
      
      // 从云数据库读取情绪日志
      const logsResult = await db.collection('emotion_logs')
        .where({
          user_id: openid
        })
        .get();

      const logs = logsResult.data || [];
      
      // 计算总次数
      const totalCount = logs.length;
      
      // 计算总天数（去重日期）
      const dateSet = new Set();
      logs.forEach(log => {
        if (log.timestamp) {
          const date = new Date(log.timestamp);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dateSet.add(dateStr);
        }
      });
      const totalDays = dateSet.size;

      // 计算击败百分比
      const beatPercent = Math.min(99, Math.floor(totalDays * 2 + 10));

      this.setData({
        totalDays,
        totalCount,
        beatPercent
      });

      // 保存打卡日期对象供日历使用
      const checkedDatesObj = {};
      dateSet.forEach(date => {
        checkedDatesObj[date] = true;
      });
      this.setData({ checkedDates: checkedDatesObj });

    } catch (error) {
      console.error('加载统计数据失败', error);
      // 降级到本地存储
      const totalDays = wx.getStorageSync('totalDays') || 0;
      const totalCount = wx.getStorageSync('totalCount') || 0;
      const checkInMap = wx.getStorageSync('checkInMap') || {};
      
      // 转换本地存储的打卡数据
      const checkedDatesObj = {};
      Object.keys(checkInMap).forEach(date => {
        if (checkInMap[date]) {
          checkedDatesObj[date] = true;
        }
      });
      
      this.setData({
        totalDays,
        totalCount,
        checkedDates: checkedDatesObj
      });
    }
  },

  // 获取用户 OpenID
  async getOpenId() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      });
      return res.result.openid;
    } catch (error) {
      console.error('获取 OpenID 失败', error);
      return '';
    }
  },



  // ========== 加载日历数据 ==========
  async loadCalendarData() {
    try {
      const { currentYear, currentMonth } = this.data;

      // 如果年月未初始化，使用当前日期
      if (!currentYear || !currentMonth) {
        const now = new Date();
        this.setData({
          currentYear: now.getFullYear(),
          currentMonth: now.getMonth() + 1,
          monthDisplay: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
        });
        return this.loadCalendarData();
      }

      // 获取当月第一天是星期几（0=周日，1=周一...）
      const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // 生成日历数组（包含空白格子）
      const calendarDays = [];
      
      // 添加空白格子（月初）
      for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ isEmpty: true });
      }

      // 添加日期格子
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isCheckedIn = this.data.checkedDates && this.data.checkedDates[dateStr] || false;
        const isToday = this.isToday(dateStr);

        calendarDays.push({
          day: i,
          dateStr: dateStr,
          isCheckedIn: isCheckedIn,
          isToday: isToday,
          isEmpty: false
        });
      }

      // 加载可用月份列表（不阻塞日历显示）
      this.loadAvailableMonths().catch(err => {
        console.error('加载可用月份失败', err);
      });

      this.setData({ calendarDays });
    } catch (error) {
      console.error('加载日历数据失败', error);
      // 即使出错也显示空日历
      this.setData({ calendarDays: [] });
    }
  },

  // 加载有记录的月份列表
  async loadAvailableMonths() {
    try {
      if (!db) {
        this.setData({ availableMonths: [] });
        return;
      }

      const openid = app.globalData.openid || (await this.getOpenId());
      
      if (!openid) {
        this.setData({ availableMonths: [] });
        return;
      }
      
      const logsResult = await db.collection('emotion_logs')
        .where({
          user_id: openid
        })
        .field({
          timestamp: true
        })
        .get();

      const logs = logsResult.data || [];
      const monthSet = new Set();
      
      logs.forEach(log => {
        if (log.timestamp) {
          const date = new Date(log.timestamp);
          const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(monthStr);
        }
      });

      // 转换为数组并排序
      const availableMonths = Array.from(monthSet).sort();
      this.setData({ availableMonths });

    } catch (error) {
      console.error('加载可用月份失败', error);
      this.setData({ availableMonths: [] });
    }
  },

  // 判断是否是今天
  isToday(dateStr) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  },

  // ========== 月份切换 ==========
  // 切换到上一个月
  onPrevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({
      currentYear,
      currentMonth,
      monthDisplay: `${currentYear}.${String(currentMonth).padStart(2, '0')}`
    });
    this.loadCalendarData();
  },

  // 切换到下一个月
  onNextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({
      currentYear,
      currentMonth,
      monthDisplay: `${currentYear}.${String(currentMonth).padStart(2, '0')}`
    });
    this.loadCalendarData();
  },

  // 选择月份
  onSelectMonth() {
    const { availableMonths, currentYear, currentMonth } = this.data;
    
    const monthOptions = availableMonths.map(monthStr => {
      const [year, monthNum] = monthStr.split('-');
      return `${year}年${parseInt(monthNum)}月`;
    });

    wx.showActionSheet({
      itemList: monthOptions,
      success: (res) => {
        const selectedMonth = availableMonths[res.tapIndex];
        const [year, monthNum] = selectedMonth.split('-');
        this.setData({
          currentYear: parseInt(year),
          currentMonth: parseInt(monthNum),
          monthDisplay: `${year}.${monthNum}`
        });
        this.loadCalendarData();
      }
    });
  },

  // ========== 加载树的精灵（宝物） ==========
  loadMedalData() {
    const { totalDays, totalCount } = this.data;

    // 宝物配置 - 区分轻盈和厚重
    const allTreasures = [
      { 
        id: 1, 
        name: '第一次看见', 
        icon: '🪨', 
        category: 'ground', // 厚重 - 放在树根
        requirement: 1, 
        type: 'days',
        date: this.getFirstDayDate(),
        diary: '你第一次看见了自己的情绪。',
        description: '时间的纹理'
      },
      { 
        id: 2, 
        name: '温柔的降落', 
        icon: '🪶', 
        category: 'sky', // 轻盈 - 放在树冠
        requirement: 7, 
        type: 'days',
        date: this.getDateByDays(7),
        diary: '你放下了重担，轻盈如羽。',
        description: '温柔的降落'
      },
      { 
        id: 3, 
        name: '时间的纹理', 
        icon: '🪨', 
        category: 'ground', // 厚重
        requirement: 30, 
        type: 'days',
        date: this.getDateByDays(30),
        diary: '重复是某种神圣的仪式。',
        description: '时间的纹理'
      },
      { 
        id: 4, 
        name: '光的裂缝', 
        icon: '✨', 
        category: 'sky', // 轻盈
        requirement: 50, 
        type: 'count',
        date: null,
        diary: '裂痕不是灾难，那是光照进来的地方。',
        description: '光的裂缝'
      },
      { 
        id: 5, 
        name: '守夜', 
        icon: '🕯️', 
        category: 'sky', // 轻盈
        requirement: 100, 
        type: 'count',
        date: null,
        diary: '万籁俱寂，你在守护孩子的梦。',
        description: '守夜'
      },
      { 
        id: 6, 
        name: '岁月的琥珀', 
        icon: '🟫', 
        category: 'ground', // 厚重
        requirement: 100, 
        type: 'days',
        date: this.getDateByDays(100),
        diary: '时间凝固在里面，见证你的坚持。',
        description: '岁月的琥珀'
      },
      { 
        id: 7, 
        name: '四季', 
        icon: '🍂', 
        category: 'sky', // 轻盈
        requirement: 365, 
        type: 'days',
        date: this.getDateByDays(365),
        diary: '走过四季，见证成长。',
        description: '四季'
      },
      { 
        id: 8, 
        name: '星光', 
        icon: '💎', 
        category: 'sky', // 轻盈
        requirement: 500, 
        type: 'count',
        date: null,
        diary: '五百次觉察，如星光点点。',
        description: '星光'
      }
    ];

    // 只保留已获得的宝物
    const unlockedTreasures = allTreasures.filter(treasure => {
      const isUnlocked = treasure.type === 'days' 
        ? totalDays >= treasure.requirement 
        : totalCount >= treasure.requirement;
      return isUnlocked;
    });

    // 按获得时间排序（最新的在前），只显示最近的5个
    const recentTreasures = unlockedTreasures.slice(-5).reverse();
    const hasMore = unlockedTreasures.length > 5;

    // 分离轻盈和厚重物品
    const skyItems = recentTreasures.filter(t => t.category === 'sky');
    const groundItems = recentTreasures.filter(t => t.category === 'ground');

    // 为天空物品分配位置（树冠两侧，避开文字区域）
    const skyTreasures = skyItems.map((item, index) => {
      const positions = [
        { left: '12%', top: '22%' }, // 左上（避开文字）
        { left: '88%', top: '18%' }, // 右上（避开文字）
        { left: '8%', top: '28%' },  // 左中
        { left: '92%', top: '26%' }, // 右中
        { left: '18%', top: '20%' }  // 备用
      ];
      return {
        ...item,
        position: positions[index] || positions[0]
      };
    });

    // 为大地物品分配位置（树根附近，避开文字）
    const groundTreasures = groundItems.map((item, index) => {
      const positions = [
        { left: '18%', top: '72%' }, // 左下（避开文字）
        { left: '78%', top: '75%' }, // 右下（避开文字）
        { left: '12%', top: '78%' }, // 左更下
        { left: '82%', top: '80%' }, // 右更下
        { left: '45%', top: '82%' }  // 中间（避开文字）
      ];
      return {
        ...item,
        position: positions[index] || positions[0]
      };
    });

    this.setData({
      skyTreasures,
      groundTreasures,
      allTreasures: unlockedTreasures,
      hasMoreTreasures: hasMore
    });
  },

  // 获取第一次打卡的日期
  getFirstDayDate() {
    // 这里应该从数据库获取，暂时返回当前日期
    const now = new Date();
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  },

  // 根据天数获取日期
  getDateByDays(days) {
    const now = new Date();
    const targetDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    return `${targetDate.getFullYear()}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')}`;
  },

  // 点击宝物
  onTreasureTap(e) {
    const { treasure } = e.currentTarget.dataset;
    if (!treasure) return;

    // 显示详情弹窗（后续可以优化为全屏卡片）
    wx.showModal({
      title: treasure.name,
      content: `${treasure.date || '某一天'}\n\n${treasure.diary}`,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#D4AF37'
    });
  },

  // 点击树洞查看全部
  onTreeHoleTap() {
    const { allTreasures } = this.data;
    if (allTreasures.length === 0) return;

    // 显示所有宝物列表（后续可以优化为全屏展示）
    const treasureList = allTreasures.map(t => `${t.icon} ${t.name}`).join('\n');
    wx.showModal({
      title: '拾光',
      content: treasureList,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#D4AF37'
    });
  },

  // ========== 格式化月份显示 ==========
  formatMonth() {
    const { currentYear, currentMonth } = this.data;
    const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    return `${currentYear}.${String(currentMonth).padStart(2, '0')} 的花园`;
  }
});
