import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/app';
import { AdminJwtPayload, JwtPayload } from '../types';
import { verifyAdminToken } from '../utils/jwt';

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}

// 验证JWT token
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: '未提供认证令牌'
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '无效的认证令牌'
    });
  }
};

// 可选的认证中间件（不强制要求登录）
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
};

// 管理员认证中间件
export const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: '未提供管理员认证令牌'
      });
      return;
    }

    const decoded = verifyAdminToken(token);

    if (decoded.role !== 'admin') {
      res.status(401).json({
        success: false,
        error: '无效的管理员认证令牌'
      });
      return;
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '无效的管理员认证令牌'
    });
  }
};
