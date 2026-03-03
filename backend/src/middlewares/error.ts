import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理中间件
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
    return;
  }

  // 数据库错误
  if (err.name === 'DatabaseError') {
    res.status(500).json({
      success: false,
      error: '数据库操作失败'
    });
    return;
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: '认证令牌已过期'
    });
    return;
  }

  // 其他错误
  console.error('未处理的错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
};

// 404处理
export const notFoundHandler = (
  _req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
};
