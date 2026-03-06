import { Request, Response } from 'express';
import ShareService from '../services/share.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 分享控制器
 */
export class ShareController {
  /**
   * 检查练习状态
   */
  async checkPracticeStatus(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const status = await ShareService.checkPracticeStatus(openid);

      res.json({
        success: true,
        data: status
      } as ApiResponse);
    } catch (error) {
      logger.error('检查练习状态失败:', error);
      res.status(500).json({
        success: false,
        error: '检查练习状态失败'
      } as ApiResponse);
    }
  }

  /**
   * 记录分享并解锁
   */
  async recordShare(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const result = await ShareService.recordShareAndUnlock(openid);

      res.json({
        success: result.success,
        message: result.message,
        data: result
      } as ApiResponse);
    } catch (error) {
      logger.error('记录分享失败:', error);
      res.status(500).json({
        success: false,
        error: '记录分享失败'
      } as ApiResponse);
    }
  }

  /**
   * 处理好友通过分享链接进入
   */
  async handleInviteShare(req: Request, res: Response): Promise<void> {
    try {
      const { sharerOpenid } = req.body;
      const newFriendOpenid = req.user?.openid;

      if (!newFriendOpenid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      if (!sharerOpenid) {
        res.status(400).json({
          success: false,
          error: '缺少分享者信息'
        } as ApiResponse);
        return;
      }

      const result = await ShareService.handleInviteShare(sharerOpenid, newFriendOpenid);

      res.json({
        success: result.success,
        message: result.message,
        data: result
      } as ApiResponse);
    } catch (error) {
      logger.error('处理好友分享失败:', error);
      res.status(500).json({
        success: false,
        error: '处理好友分享失败'
      } as ApiResponse);
    }
  }

  /**
   * 消耗练习次数（使用免费次数或解锁机会）
   */
  async consumePractice(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const success = await ShareService.consumePractice(openid);

      res.json({
        success,
        message: success ? '可以使用' : '次数不足'
      } as ApiResponse);
    } catch (error) {
      logger.error('消耗练习次数失败:', error);
      res.status(500).json({
        success: false,
        error: '消耗练习次数失败'
      } as ApiResponse);
    }
  }
}

export default new ShareController();
