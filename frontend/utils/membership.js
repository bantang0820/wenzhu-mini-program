// utils/membership.js - 会员检查工具函数

/**
 * 检查用户是否是会员
 * @returns {Promise<boolean>} 是否是会员
 */
async function checkMembership() {
  const openid = wx.getStorageSync('openid');

  if (!openid) {
    return false;
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'checkMembership',
      data: { openid }
    });

    return res.result.isMember || false;
  } catch (err) {
    console.error('检查会员状态失败', err);
    return false;
  }
}

/**
 * 需要会员权限才能使用
 * 如果不是会员，显示付费引导
 * @returns {Promise<boolean>} 是否有会员权限
 */
async function requireMembership(showPaywall = true) {
  const isMember = await checkMembership();

  if (!isMember && showPaywall) {
    // 显示付费引导弹窗
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.showPaywall = true;
    }
  }

  return isMember;
}

/**
 * 获取会员信息
 * @returns {Promise<Object>} 会员信息
 */
async function getMembershipInfo() {
  const openid = wx.getStorageSync('openid');

  if (!openid) {
    return null;
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'getMembershipInfo',
      data: { openid }
    });

    return res.result.membership || null;
  } catch (err) {
    console.error('获取会员信息失败', err);
    return null;
  }
}

/**
 * 格式化会员到期时间
 * @param {Date} endDate 到期时间
 * @returns {String} 格式化的到期时间
 */
function formatEndDate(endDate) {
  if (!endDate) return '';

  const date = new Date(endDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}年${month}月${day}日`;
}

/**
 * 计算会员剩余天数
 * @param {Date} endDate 到期时间
 * @returns {Number} 剩余天数
 */
function getRemainingDays(endDate) {
  if (!endDate) return 0;

  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

module.exports = {
  checkMembership,
  requireMembership,
  getMembershipInfo,
  formatEndDate,
  getRemainingDays
};
