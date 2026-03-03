// utils/api.js - API 请求工具
const apiConfig = require('../config/api.js');

/**
 * 发起 HTTP 请求
 * @param {string} endpoint - API 端点
 * @param {object} options - 请求选项
 * @returns {Promise} 返回请求结果
 */
function request(endpoint, options = {}) {
  const { method = 'GET', data = null, needAuth = false } = options;

  // 构建完整 URL
  const url = `${apiConfig.baseURL}${endpoint}`;

  if (apiConfig.debug) {
    console.log(`[API] ${method} ${url}`, data);
  }

  return new Promise((resolve, reject) => {
    // 获取 token
    const token = wx.getStorageSync('token');

    // 构建请求头
    const header = {
      'Content-Type': 'application/json'
    };

    if (needAuth && token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    // 发起请求
    wx.request({
      url,
      method: method.toUpperCase(),
      data,
      header,
      timeout: apiConfig.timeout,
      success: (res) => {
        if (apiConfig.debug) {
          console.log(`[API] 响应:`, res.data);
        }

        // 检查业务状态码
        if (res.data.success === false) {
          // 业务错误
          wx.showToast({
            title: res.data.error || '请求失败',
            icon: 'none',
            duration: 2000
          });
          reject(new Error(res.data.error || '请求失败'));
          return;
        }

        // 成功
        resolve(res.data);
      },
      fail: (err) => {
        console.error('[API] 请求失败:', err);

        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });

        reject(err);
      }
    });
  });
}

/**
 * GET 请求
 */
function get(endpoint, data = null, needAuth = false) {
  // GET 请求将参数拼接到 URL
  let url = endpoint;
  if (data) {
    const params = Object.keys(data)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
      .join('&');
    url += `?${params}`;
  }
  return request(url, { method: 'GET', needAuth });
}

/**
 * POST 请求
 */
function post(endpoint, data = null, needAuth = false) {
  return request(endpoint, { method: 'POST', data, needAuth });
}

/**
 * PUT 请求
 */
function put(endpoint, data = null, needAuth = false) {
  return request(endpoint, { method: 'PUT', data, needAuth });
}

/**
 * DELETE 请求
 */
function del(endpoint, data = null, needAuth = false) {
  return request(endpoint, { method: 'DELETE', data, needAuth });
}

/**
 * 云函数调用模拟（用于替换 wx.cloud.callFunction）
 * @param {object} options - 云函数调用选项
 * @returns {Promise}
 */
function callFunction(options) {
  const { name, data = {} } = options;

  if (apiConfig.debug) {
    console.log(`[API] 云函数调用: ${name}`, data);
  }

  // 云函数名称到 API 端点的映射
  const functionMap = {
    // 认证相关
    'login': {
      endpoint: '/auth/wechat-login',
      method: 'POST',
      needAuth: false
    },
    'saveUserInfo': {
      endpoint: '/auth/save-user-info',
      method: 'POST',
      needAuth: false
    },
    'syncUserProfile': {
      endpoint: '/auth/sync-profile',
      method: 'POST',
      needAuth: true
    },

    // 会员相关
    'checkMembership': {
      endpoint: '/membership/check',
      method: 'POST',
      needAuth: false
    },
    'getMembershipInfo': {
      endpoint: '/membership/info',
      method: 'POST',
      needAuth: false
    },
    'redeemMembership': {
      endpoint: '/membership/redeem',
      method: 'POST',
      needAuth: true
    },

    // AI 相关
    'generateEmotionalSlice': {
      endpoint: '/ai/emotion-slice',
      method: 'POST',
      needAuth: true
    }
  };

  const mapping = functionMap[name];
  if (!mapping) {
    return Promise.reject({
      errMsg: `cloud.callFunction:fail 云函数 ${name} 不存在`
    });
  }

  // 发起 HTTP 请求
  return request(mapping.endpoint, {
    method: mapping.method,
    data,
    needAuth: mapping.needAuth
  }).then(result => {
    // 转换为云函数返回格式
    return {
      result: result.data,
      errMsg: 'cloud.callFunction:ok'
    };
  }).catch(error => {
    // 转换为云函数错误格式
    return {
      result: { error: error.message },
      errMsg: 'cloud.callFunction:fail'
    };
  });
}

/**
 * 数据库操作模拟（用于替换 wx.cloud.database）
 */
function database() {
  return {
    /**
     * 获取集合
     */
    collection: (name) => {
      const collectionMap = {
        'feedbacks': {
          add: (data) => post('/feedbacks', data, true)
        }
      };

      return collectionMap[name] || {
        add: () => Promise.reject({ errMsg: 'collection.add:fail 不支持的集合' }),
        get: () => Promise.resolve({ data: [], errMsg: 'collection.get:ok' }),
        where: () => ({ get: () => Promise.resolve({ data: [], errMsg: 'collection.get:ok' }) })
      };
    }
  };
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  callFunction,
  database
};
