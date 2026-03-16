// API 配置文件
const API_BASE_URL = 'https://1dt2po0565100.vicp.fun/api';

module.exports = {
  // 小程序默认走线上后端，便于真机直接登录
  baseURL: API_BASE_URL,

  // 如需临时切换地址，可直接修改上面的常量
  fallbackBaseURLs: [],

  // API 超时时间（毫秒）
  timeout: 30000,

  // 是否启用调试日志
  debug: true
};
