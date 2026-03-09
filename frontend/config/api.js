// API 配置文件
module.exports = {
  // 后端服务器地址（开发环境优先本机）
  baseURL: 'http://127.0.0.1:3000/api',

  // 备用地址（主地址请求失败时自动重试）
  fallbackBaseURLs: [
    'https://1dt2po0565100.vicp.fun/api'
  ],

  // API 超时时间（毫秒）
  timeout: 30000,

  // 是否启用调试日志
  debug: true
};
