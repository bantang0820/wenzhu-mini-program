// API 配置文件
// ⚠️ 本地测试模式：连接本地后端服务器（通过花生壳内网穿透）
const USE_LOCAL_API = true; // ✅ 本地测试时设为true

const API_BASE_URL = USE_LOCAL_API
  ? 'https://api.wenzhuyuer.com/api'  // 本地测试（花生壳域名）
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
