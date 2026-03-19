// API 配置文件
// ⚠️ 生产模式：连接线上后端服务器
const USE_LOCAL_API = false; // 🔴 上线前设为false

const API_BASE_URL = USE_LOCAL_API
  ? 'http://localhost:3000/api'  // 本地开发服务器
  : 'https://api.wenzhuyuer.com/api'; // 线上生产服务器

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
