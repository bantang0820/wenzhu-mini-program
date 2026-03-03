import { Request, Response } from 'express';
import UserService from '../services/user.service';
import MembershipService from '../services/membership.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 会员控制器
 */
export class MembershipController {
  /**
   * 检查会员状态
   */
  async checkMembership(req: Request, res: Response): Promise<void> {
    try {
      const { openid } = req.body;

      if (!openid) {
        res.status(400).json({
          success: false,
          error: '缺少OpenID'
        } as ApiResponse);
        return;
      }

      const result = await UserService.checkMembership(openid);

      res.json({
        success: true,
        data: {
          isMember: result.isMember,
          membership: result.membership
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('检查会员状态失败:', error);
      res.status(500).json({
        success: false,
        error: '检查会员状态失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取会员详细信息
   */
  async getMembershipInfo(req: Request, res: Response): Promise<void> {
    try {
      const { openid } = req.body;

      if (!openid) {
        res.status(400).json({
          success: false,
          error: '缺少OpenID'
        } as ApiResponse);
        return;
      }

      const membership = await UserService.getMembershipInfo(openid);

      res.json({
        success: true,
        data: membership
      } as ApiResponse);
    } catch (error) {
      logger.error('获取会员信息失败:', error);
      res.status(500).json({
        success: false,
        error: '获取会员信息失败'
      } as ApiResponse);
    }
  }

  /**
   * 兑换会员码
   */
  async redeemMembership(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      if (!code) {
        res.status(400).json({
          success: false,
          error: '缺少兑换码'
        } as ApiResponse);
        return;
      }

      const result = await MembershipService.redeemCode(openid, code);

      if (!result.success) {
        res.json({
          success: false,
          error: result.msg
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: {
          msg: result.msg,
          expireDate: result.expireDate
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('兑换会员码失败:', error);
      res.status(500).json({
        success: false,
        error: '兑换失败，请稍后重试'
      } as ApiResponse);
    }
  }
}

export default new MembershipController();
