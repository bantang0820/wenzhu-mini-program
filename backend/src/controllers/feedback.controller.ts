import { Request, Response } from 'express';
import FeedbackService from '../services/feedback.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 反馈控制器
 */
export class FeedbackController {
  /**
   * 提交反馈
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { content, contact } = req.body;
      const openid = req.user?.openid || '';

      if (!content) {
        res.status(400).json({
          success: false,
          error: '缺少反馈内容'
        } as ApiResponse);
        return;
      }

      const feedbackId = await FeedbackService.submitFeedback(openid, content, contact);

      res.json({
        success: true,
        data: {
          id: feedbackId,
          message: '感谢您的反馈！'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('提交反馈失败:', error);
      res.status(500).json({
        success: false,
        error: '提交反馈失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取反馈列表（管理员功能）
   */
  async getFeedbackList(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const { list, total } = await FeedbackService.getFeedbackList(page, pageSize);

      res.json({
        success: true,
        data: {
          list,
          total,
          page,
          pageSize
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('获取反馈列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取反馈列表失败'
      } as ApiResponse);
    }
  }
}

export default new FeedbackController();
