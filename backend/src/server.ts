import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/app';
import { testConnection } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error';
import logger from './utils/logger';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app: Application = express();

// 中间件配置
app.use(cors()); // 跨域支持
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体

// 请求日志
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 路由配置
app.use('/api', routes);

// 健康检查
app.get('/', (_req, res) => {
  res.json({
    name: '稳住小程序后端API',
    version: '1.0.0',
    status: 'running'
  });
});

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const startServer = async (): Promise<void> => {
  try {
    // 测试数据库连接
    logger.info('正在连接数据库...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('数据库连接失败，请检查配置');
      process.exit(1);
    }

    // 启动HTTP服务器
    const server = app.listen(config.port, () => {
      logger.info(`🚀 服务器启动成功`);
      logger.info(`📝 环境: ${config.nodeEnv}`);
      logger.info(`🌐 端口: ${config.port}`);
      logger.info(`📍 API地址: http://localhost:${config.port}/api`);
    });

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，正在关闭服务器...`);
      server.close(async () => {
        logger.info('HTTP服务器已关闭');
        // 这里可以关闭数据库连接池
        process.exit(0);
      });

      // 10秒后强制退出
      setTimeout(() => {
        logger.error('强制退出服务器');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 启动服务器
startServer();

export default app;
