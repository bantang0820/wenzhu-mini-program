// mockData.js - Mock 数据配置文件

/**
 * 模拟用户数据
 */
const MOCK_USER = {
  _id: 'mock_user_001',
  openid: 'mock_openid_12345678',
  nickname: '正念家长',
  avatarUrl: '',
  is_vip: false, // 默认不是会员
  vip_expire_time: null,
  create_time: new Date('2025-01-01'),
  last_login_time: new Date(),
  total_days: 0,
  total_count: 0
};

/**
 * 模拟会员数据
 */
const MOCK_MEMBERSHIPS = [
  {
    _id: 'mock_membership_001',
    userId: 'mock_user_001',
    status: 'inactive',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-01'),
    type: 'annual',
    createdAt: new Date('2025-01-01')
  }
];

/**
 * 模拟兑换码数据
 */
const MOCK_REDEEM_CODES = [
  {
    code: 'DEMO12345678', // 演示用兑换码
    status: 0, // 0: 未使用, 1: 已使用
    type: 'annual',
    duration: 365,
    created_at: new Date('2025-01-01')
  },
  {
    code: 'TEST87654321', // 测试用兑换码
    status: 0,
    type: 'annual',
    duration: 365,
    created_at: new Date('2025-01-01')
  }
];

/**
 * 模拟情绪日志数据
 */
const MOCK_EMOTION_LOGS = [];

/**
 * 模拟反馈数据
 */
const MOCK_FEEDBACKS = [];

/**
 * 生成情绪切片的默认文案
 */
const DEFAULT_EMOTIONAL_SLICE = {
  stormText: '那个瞬间，我感觉失控了。情绪像野火一样蔓延。',
  shiftText: '我按下了暂停键。三次深呼吸，把自己拉回当下。',
  anchorText: '情绪是天空，我是天空。云来云去，我一直在。',
  timeStart: '20:00',
  timeMid: '20:05',
  timeEnd: '此刻'
};

/**
 * 获取模拟用户数据
 */
function getMockUser() {
  const user = wx.getStorageSync('mock_user');
  if (!user) {
    wx.setStorageSync('mock_user', MOCK_USER);
    return MOCK_USER;
  }
  return user;
}

/**
 * 保存模拟用户数据
 */
function saveMockUser(userData) {
  const currentUser = getMockUser();
  const updatedUser = { ...currentUser, ...userData, last_login_time: new Date() };
  wx.setStorageSync('mock_user', updatedUser);
  return updatedUser;
}

/**
 * 获取模拟会员数据
 */
function getMockMemberships() {
  let memberships = wx.getStorageSync('mock_memberships');
  if (!memberships) {
    memberships = MOCK_MEMBERSHIPS;
    wx.setStorageSync('mock_memberships', memberships);
  }
  return memberships;
}

/**
 * 保存模拟会员数据
 */
function saveMockMemberships(memberships) {
  wx.setStorageSync('mock_memberships', memberships);
}

/**
 * 获取模拟兑换码数据
 */
function getMockRedeemCodes() {
  let codes = wx.getStorageSync('mock_redeem_codes');
  if (!codes) {
    codes = MOCK_REDEEM_CODES;
    wx.setStorageSync('mock_redeem_codes', codes);
  }
  return codes;
}

/**
 * 保存模拟兑换码数据
 */
function saveMockRedeemCodes(codes) {
  wx.setStorageSync('mock_redeem_codes', codes);
}

/**
 * 获取模拟反馈数据
 */
function getMockFeedbacks() {
  let feedbacks = wx.getStorageSync('mock_feedbacks');
  if (!feedbacks) {
    feedbacks = MOCK_FEEDBACKS;
    wx.setStorageSync('mock_feedbacks', feedbacks);
  }
  return feedbacks;
}

/**
 * 保存模拟反馈数据
 */
function saveMockFeedbacks(feedbacks) {
  wx.setStorageSync('mock_feedbacks', feedbacks);
}

/**
 * 重置所有 mock 数据
 */
function resetMockData() {
  wx.removeStorageSync('mock_user');
  wx.removeStorageSync('mock_memberships');
  wx.removeStorageSync('mock_redeem_codes');
  wx.removeStorageSync('mock_feedbacks');
}

module.exports = {
  MOCK_USER,
  MOCK_MEMBERSHIPS,
  MOCK_REDEEM_CODES,
  DEFAULT_EMOTIONAL_SLICE,

  getMockUser,
  saveMockUser,
  getMockMemberships,
  saveMockMemberships,
  getMockRedeemCodes,
  saveMockRedeemCodes,
  getMockFeedbacks,
  saveMockFeedbacks,
  resetMockData
};
