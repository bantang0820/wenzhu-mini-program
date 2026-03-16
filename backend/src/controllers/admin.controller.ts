import { Request, Response } from 'express';
import { config } from '../config/app';
import { AppError } from '../middlewares/error';
import AdminService from '../services/admin.service';
import { ApiResponse } from '../types';
import { generateAdminToken } from '../utils/jwt';
import logger from '../utils/logger';

export class AdminController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (username !== config.admin.username || password !== config.admin.password) {
        res.status(401).json({
          success: false,
          error: '管理员账号或密码错误'
        } as ApiResponse);
        return;
      }

      const token = generateAdminToken({
        username,
        role: 'admin'
      });

      res.json({
        success: true,
        data: {
          token,
          username
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('管理员登录失败:', error);
      res.status(500).json({
        success: false,
        error: '管理员登录失败'
      } as ApiResponse);
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        username: req.admin?.username || config.admin.username
      }
    } as ApiResponse);
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : '';
      const users = await AdminService.getUsers(keyword);

      res.json({
        success: true,
        data: users
      } as ApiResponse);
    } catch (error) {
      this.handleError(error, res, '获取用户列表失败');
    }
  }

  async getRedeemCodes(req: Request, res: Response): Promise<void> {
    try {
      const filter: 'all' | 'used' | 'unused' = req.query.used === 'used' || req.query.used === 'unused'
        ? req.query.used
        : 'all';
      const codes = await AdminService.getRedeemCodes(filter);

      res.json({
        success: true,
        data: codes
      } as ApiResponse);
    } catch (error) {
      this.handleError(error, res, '获取兑换码列表失败');
    }
  }

  async generateRedeemCodes(req: Request, res: Response): Promise<void> {
    try {
      const { count, type, duration } = req.body;
      const codes = await AdminService.generateRedeemCodes(count, type || 'manual', duration);

      res.json({
        success: true,
        data: {
          codes
        }
      } as ApiResponse);
    } catch (error) {
      this.handleError(error, res, '生成兑换码失败');
    }
  }

  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : '';
      const members = await AdminService.getMembers(keyword);

      res.json({
        success: true,
        data: members
      } as ApiResponse);
    } catch (error) {
      this.handleError(error, res, '获取会员列表失败');
    }
  }

  async updateMembership(req: Request, res: Response): Promise<void> {
    try {
      const { userId, duration, action, type } = req.body;
      const result = await AdminService.updateMembership(
        userId,
        duration,
        type || (action === 'extend' ? 'manual_extend' : 'manual_grant')
      );

      res.json({
        success: true,
        message: result.isExtended ? '会员已延长' : '会员已开通',
        data: result
      } as ApiResponse);
    } catch (error) {
      this.handleError(error, res, '调整会员失败');
    }
  }

  private handleError(error: unknown, res: Response, fallbackMessage: string): void {
    logger.error(fallbackMessage + ':', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: fallbackMessage
    } as ApiResponse);
  }
}

export default new AdminController();
