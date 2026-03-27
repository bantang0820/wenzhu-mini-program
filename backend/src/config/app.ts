import dotenv from 'dotenv';

dotenv.config();

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',

  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    apiUrl: 'https://api.weixin.qq.com',
    devMockOpenid: process.env.WECHAT_DEV_MOCK_OPENID || 'test_openid_local_user'
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  },

  admin: {
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
    jwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || '',
    tokenExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h'
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
  },

  zhipu: {
    apiKey: process.env.ZHIPU_API_KEY || '',
    apiUrl: process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: process.env.ZHIPU_MODEL || 'glm-4-flash'
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs'
  },

  security: {
    adminLoginMaxFailures: parsePositiveInt(process.env.ADMIN_LOGIN_MAX_FAILURES, 5),
    adminLoginWindowMs: parsePositiveInt(process.env.ADMIN_LOGIN_WINDOW_MS, 10 * 60 * 1000),
    adminLoginBlockMs: parsePositiveInt(process.env.ADMIN_LOGIN_BLOCK_MS, 30 * 60 * 1000)
  }
};

const weakAdminPasswords = new Set([
  'admin',
  'admin123',
  '123456',
  '12345678',
  'password',
  'qwerty',
  'wenzhu123'
]);

const weakJwtPlaceholders = new Set([
  'your_jwt_secret_key',
  'your_jwt_secret_key_change_in_production'
]);

export const validateSecurityConfig = (): void => {
  const issues: string[] = [];

  if (!config.jwt.secret) {
    issues.push('缺少 JWT_SECRET');
  }

  if (!config.admin.username) {
    issues.push('缺少 ADMIN_USERNAME');
  }

  if (!config.admin.password) {
    issues.push('缺少 ADMIN_PASSWORD');
  }

  if (!config.admin.jwtSecret) {
    issues.push('缺少 ADMIN_JWT_SECRET（或可回退使用 JWT_SECRET）');
  }

  if (weakJwtPlaceholders.has(config.jwt.secret)) {
    issues.push('JWT_SECRET 仍在使用示例占位值');
  }

  if (weakJwtPlaceholders.has(config.admin.jwtSecret)) {
    issues.push('ADMIN_JWT_SECRET 仍在使用示例占位值');
  }

  if (config.jwt.secret && config.jwt.secret.length < 32) {
    issues.push('JWT_SECRET 长度不足，至少 32 位');
  }

  if (config.admin.jwtSecret && config.admin.jwtSecret.length < 32) {
    issues.push('ADMIN_JWT_SECRET 长度不足，至少 32 位');
  }

  if (config.admin.password && config.admin.password.length < 12) {
    issues.push('ADMIN_PASSWORD 长度不足，至少 12 位');
  }

  if (weakAdminPasswords.has(config.admin.password.toLowerCase())) {
    issues.push('ADMIN_PASSWORD 过于简单，请使用高强度随机密码');
  }

  if (issues.length > 0) {
    throw new Error(`安全配置校验失败：\n- ${issues.join('\n- ')}`);
  }
};

export default config;
