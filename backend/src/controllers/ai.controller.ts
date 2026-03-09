import { Request, Response } from 'express';
import AIService from '../services/ai.service';
import {
  ApiResponse,
  EmotionSliceRequest,
  MindfulDiaryRequest,
  RetellFeedbackRequest
} from '../types';
import logger from '../utils/logger';

/**
 * AI控制器
 */
export class AIController {
  /**
   * 生成情绪切片文案
   */
  async generateEmotionSlice(req: Request, res: Response): Promise<void> {
    try {
      const data: EmotionSliceRequest = req.body;

      // 验证必填字段
      if (!data.scenario || !data.mood || !data.stormTime || !data.shiftTime || !data.anchorTime) {
        res.status(400).json({
          success: false,
          error: '缺少必填字段'
        } as ApiResponse);
        return;
      }

      const result = await AIService.generateEmotionSlice(data);

      res.json(result);
    } catch (error) {
      logger.error('生成情绪切片失败:', error);
      res.status(500).json({
        success: false,
        error: '生成情绪切片失败'
      } as ApiResponse);
    }
  }

  /**
   * 生成每句复述后的AI反馈
   */
  async generateRetellFeedback(req: Request, res: Response): Promise<void> {
    try {
      const data: RetellFeedbackRequest = req.body;

      if (!data.scenarioTitle || !data.readingRound || !data.totalRounds || !data.retellText) {
        res.status(400).json({
          success: false,
          error: '缺少必填字段'
        } as ApiResponse);
        return;
      }

      const result = await AIService.generateRetellFeedback(data);
      res.json(result);
    } catch (error) {
      logger.error('生成复述反馈失败:', error);
      res.status(500).json({
        success: false,
        error: '生成复述反馈失败'
      } as ApiResponse);
    }
  }

  /**
   * 生成正念育儿日记内容
   */
  async generateMindfulDiary(req: Request, res: Response): Promise<void> {
    try {
      const data: MindfulDiaryRequest = req.body;

      if (!data.scenarioTitle || !data.finalState || !data.finalStateLabel) {
        res.status(400).json({
          success: false,
          error: '缺少必填字段'
        } as ApiResponse);
        return;
      }

      const result = await AIService.generateMindfulDiary(data);
      res.json(result);
    } catch (error) {
      logger.error('生成正念日记失败:', error);
      res.status(500).json({
        success: false,
        error: '生成正念日记失败'
      } as ApiResponse);
    }
  }
}

export default new AIController();
