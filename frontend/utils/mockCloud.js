// mockCloud.js - 模拟微信云开发 SDK

const mockData = require('./mockData.js');

/**
 * 模拟 wx.cloud
 */
class MockCloud {
  constructor() {
    this.initialized = false;
  }

  /**
   * 初始化云开发
   */
  init(options = {}) {
    console.log('[MockCloud] 初始化云开发', options);
    this.initialized = true;
    return { errMsg: 'cloud.init:ok' };
  }

  /**
   * 调用云函数
   */
  async callFunction(options) {
    const { name, data } = options;
    console.log(`[MockCloud] 调用云函数: ${name}`, data);

    // 模拟网络延迟
    await this._delay(300);

    switch (name) {
      case 'login':
        return this._login(data);
      case 'saveUserInfo':
        return this._saveUserInfo(data);
      case 'syncUserProfile':
        return this._syncUserProfile(data);
      case 'checkMembership':
        return this._checkMembership(data);
      case 'getMembershipInfo':
        return this._getMembershipInfo(data);
      case 'redeemMembership':
        return this._redeemMembership(data);
      case 'generateEmotionalSlice':
        return this._generateEmotionalSlice(data);
      default:
        return { errMsg: `cloud.callFunction:fail 云函数 ${name} 不存在` };
    }
  }

  /**
   * 获取数据库实例
   */
  database() {
    return new MockDatabase();
  }

  /**
   * 获取微信上下文
   */
  getWXContext() {
    const user = mockData.getMockUser();
    return {
      OPENID: user.openid,
      APPID: 'mock_appid',
      UNIONID: 'mock_unionid'
    };
  }

  // ========== 云函数实现 ==========

  /**
   * 云函数: login - 获取 OpenID
   */
  _login(data) {
    const user = mockData.getMockUser();
    return {
      result: {
        openid: user.openid,
        appid: 'mock_appid',
        unionid: 'mock_unionid'
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: saveUserInfo - 保存用户信息
   */
  _saveUserInfo(data) {
    const { openid, userInfo } = data;
    const user = mockData.getMockUser();

    if (user.openid !== openid) {
      return {
        result: { error: '用户不匹配' },
        errMsg: 'cloud.callFunction:fail'
      };
    }

    const updatedUser = mockData.saveMockUser({
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl
    });

    return {
      result: {
        success: true,
        userId: updatedUser._id,
        isNewUser: false
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: syncUserProfile - 同步用户信息
   */
  _syncUserProfile(data) {
    const { userInfo } = data;
    const user = mockData.getMockUser();

    // 更新用户信息
    const updatedUser = mockData.saveMockUser(userInfo);

    return {
      result: {
        success: true,
        action: 'update',
        user: updatedUser
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: checkMembership - 检查会员状态
   */
  _checkMembership(data) {
    const { openid } = data;
    const user = mockData.getMockUser();

    if (user.openid !== openid) {
      return {
        result: { isMember: false },
        errMsg: 'cloud.callFunction:ok'
      };
    }

    // 检查会员是否有效
    const isMember = user.is_vip && user.vip_expire_time && new Date(user.vip_expire_time) > new Date();

    return {
      result: {
        isMember,
        membership: isMember ? {
          userId: user._id,
          status: 'active',
          endDate: user.vip_expire_time
        } : null
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: getMembershipInfo - 获取会员信息
   */
  _getMembershipInfo(data) {
    const { openid } = data;
    const user = mockData.getMockUser();

    if (user.openid !== openid || !user.is_vip) {
      return {
        result: { membership: null },
        errMsg: 'cloud.callFunction:ok'
      };
    }

    const now = new Date();
    const endDate = new Date(user.vip_expire_time);
    const isActive = endDate >= now;
    const remainingDays = Math.max(0, Math.floor((endDate - now) / (1000 * 60 * 60 * 24)));

    return {
      result: {
        membership: {
          userId: user._id,
          status: isActive ? 'active' : 'inactive',
          startDate: user.create_time,
          endDate: user.vip_expire_time,
          type: 'annual',
          isActive,
          remainingDays
        }
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: redeemMembership - 兑换会员码
   */
  _redeemMembership(data) {
    const { code } = data;
    const codes = mockData.getMockRedeemCodes();
    const user = mockData.getMockUser();

    // 查找兑换码
    const codeIndex = codes.findIndex(c => c.code.toUpperCase() === code.toUpperCase() && c.status === 0);

    if (codeIndex === -1) {
      return {
        result: { success: false, msg: '兑换码无效或已被使用' },
        errMsg: 'cloud.callFunction:ok'
      };
    }

    // 更新兑换码状态
    codes[codeIndex].status = 1;
    codes[codeIndex].used_by = user.openid;
    codes[codeIndex].used_time = new Date();
    mockData.saveMockRedeemCodes(codes);

    // 计算新的过期时间
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const currentExpire = user.vip_expire_time ? new Date(user.vip_expire_time).getTime() : 0;
    const newExpireTime = currentExpire > now ? currentExpire + oneYearMs : now + oneYearMs;

    // 更新用户会员状态
    mockData.saveMockUser({
      is_vip: true,
      vip_expire_time: new Date(newExpireTime)
    });

    // 格式化日期
    const expireDate = new Date(newExpireTime);
    const formattedDate = `${expireDate.getFullYear()}.${String(expireDate.getMonth() + 1).padStart(2, '0')}.${String(expireDate.getDate()).padStart(2, '0')}`;

    return {
      result: {
        success: true,
        msg: '兑换成功！',
        expireDate: formattedDate
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  /**
   * 云函数: generateEmotionalSlice - 生成情绪切片
   */
  async _generateEmotionalSlice(data) {
    const { scenario, mood, stormTime, shiftTime, anchorTime } = data;

    // 模拟 API 延迟
    await this._delay(500);

    // 返回默认文案
    return {
      result: {
        success: true,
        data: {
          ...mockData.DEFAULT_EMOTIONAL_SLICE,
          timeStart: this._formatTime(stormTime),
          timeMid: this._formatTime(shiftTime),
          timeEnd: '此刻'
        }
      },
      errMsg: 'cloud.callFunction:ok'
    };
  }

  // ========== 工具方法 ==========

  /**
   * 延迟函数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 格式化时间
   */
  _formatTime(date) {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

/**
 * 模拟数据库
 */
class MockDatabase {
  /**
   * 获取集合
   */
  collection(name) {
    return new MockCollection(name);
  }

  /**
   * 获取服务器时间
   */
  serverDate() {
    return new Date();
  }

  /**
   * 数据库命令
   */
  get command() {
    return {
      gte: (val) => ({ $operator: '$gte', value: val }),
      lte: (val) => ({ $operator: '$lte', value: val }),
      gt: (val) => ({ $operator: '$gt', value: val }),
      lt: (val) => ({ $operator: '$lt', value: val }),
      and: (...conds) => ({ $operator: '$and', conditions: conds }),
      or: (...conds) => ({ $operator: '$or', conditions: conds })
    };
  }
}

/**
 * 模拟集合
 */
class MockCollection {
  constructor(name) {
    this.name = name;
    this._whereData = null;
    this._limitVal = null;
    this._skipVal = null;
    this._orderByField = null;
    this._orderByDirection = null;
  }

  /**
   * 查询条件
   */
  where(query) {
    this._whereData = query;
    return this;
  }

  /**
   * 限制数量
   */
  limit(num) {
    this._limitVal = num;
    return this;
  }

  /**
   * 跳过数量
   */
  skip(num) {
    this._skipVal = num;
    return this;
  }

  /**
   * 排序
   */
  orderBy(field, direction = 'asc') {
    this._orderByField = field;
    this._orderByDirection = direction;
    return this;
  }

  /**
   * 获取数据
   */
  async get() {
    console.log(`[MockCloud] 数据库查询: ${this.name}`, this._whereData);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 200));

    switch (this.name) {
      case 'feedbacks':
        return this._getFeedbacks();
      default:
        return { data: [], errMsg: 'collection.get:ok' };
    }
  }

  /**
   * 添加数据
   */
  async add(data) {
    console.log(`[MockCloud] 数据库添加: ${this.name}`, data);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 200));

    switch (this.name) {
      case 'feedbacks':
        return this._addFeedback(data);
      default:
        return { _id: `mock_${Date.now()}`, errMsg: 'collection.add:ok' };
    }
  }

  /**
   * 更新数据
   */
  async update(data) {
    console.log(`[MockCloud] 数据库更新: ${this.name}`, data);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { stats: { updated: 1 }, errMsg: 'collection.update:ok' };
  }

  /**
   * 删除数据
   */
  async remove() {
    console.log(`[MockCloud] 数据库删除: ${this.name}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { stats: { removed: 1 }, errMsg: 'collection.remove:ok' };
  }

  /**
   * 通过 ID 获取文档
   */
  doc(id) {
    this._docId = id;
    return this;
  }

  /**
   * 获取反馈数据
   */
  _getFeedbacks() {
    const feedbacks = mockData.getMockFeedbacks();
    let result = feedbacks;

    // 应用查询条件
    if (this._whereData) {
      result = result.filter(item => {
        for (let key in this._whereData) {
          if (item[key] !== this._whereData[key]) {
            return false;
          }
        }
        return true;
      });
    }

    // 应用排序
    if (this._orderByField) {
      result.sort((a, b) => {
        const aVal = a[this._orderByField];
        const bVal = b[this._orderByField];
        if (this._orderByDirection === 'desc') {
          return bVal - aVal;
        }
        return aVal - bVal;
      });
    }

    // 应用限制
    if (this._limitVal) {
      result = result.slice(0, this._limitVal);
    }

    return { data: result, errMsg: 'collection.get:ok' };
  }

  /**
   * 添加反馈
   */
  _addFeedback(data) {
    const feedbacks = mockData.getMockFeedbacks();
    const newFeedback = {
      _id: `feedback_${Date.now()}`,
      ...data,
      createTime: new Date()
    };
    feedbacks.unshift(newFeedback);
    mockData.saveMockFeedbacks(feedbacks);

    return {
      _id: newFeedback._id,
      errMsg: 'collection.add:ok'
    };
  }
}

// 创建实例
const mockCloud = new MockCloud();

module.exports = mockCloud;
