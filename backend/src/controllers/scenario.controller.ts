import { Request, Response } from 'express';
import ScenarioService from '../services/scenario.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 场景控制器
 */
export class ScenarioController {
  /**
   * 获取所有场景
   */
  async getAllScenarios(req: Request, res: Response): Promise<void> {
    try {
      const isFree = req.query.free === 'true' ? true : req.query.free === 'false' ? false : undefined;

      const scenarios = await ScenarioService.getAllScenarios(isFree);

      res.json({
        success: true,
        data: scenarios
      } as ApiResponse);
    } catch (error) {
      logger.error('获取场景列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取场景列表失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取场景详情
   */
  async getScenarioById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const scenario = await ScenarioService.getScenarioById(id);

      if (!scenario) {
        res.status(404).json({
          success: false,
          error: '场景不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: scenario
      } as ApiResponse);
    } catch (error) {
      logger.error('获取场景详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取场景详情失败'
      } as ApiResponse);
    }
  }

  /**
   * 检查场景访问权限
   */
  async checkScenarioAccess(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioId } = req.body;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const hasAccess = await ScenarioService.checkScenarioAccess(scenarioId, openid);

      res.json({
        success: true,
        data: {
          hasAccess
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('检查场景访问权限失败:', error);
      res.status(500).json({
        success: false,
        error: '检查场景访问权限失败'
      } as ApiResponse);
    }
  }

  /**
   * 记录练习
   */
  async recordPractice(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioId, moodBefore, moodAfter, duration, energy } = req.body;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      await ScenarioService.recordPractice(
        openid,
        scenarioId,
        moodBefore,
        moodAfter,
        duration,
        energy
      );

      res.json({
        success: true,
        data: {
          message: '记录成功'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('记录练习失败:', error);
      res.status(500).json({
        success: false,
        error: '记录练习失败'
      } as ApiResponse);
    }
  }

  /**
   * 记录情绪日志
   */
  async logEmotion(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioId, scenarioTitle, moodBefore, moodAfter, duration } = req.body;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      await ScenarioService.logEmotion(
        openid,
        scenarioId,
        scenarioTitle,
        moodBefore,
        moodAfter,
        duration
      );

      res.json({
        success: true,
        data: {
          message: '记录成功'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('记录情绪日志失败:', error);
      res.status(500).json({
        success: false,
        error: '记录情绪日志失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取打卡日历
   */
  async getCheckInCalendar(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const calendar = await ScenarioService.getCheckInCalendar(openid);

      res.json({
        success: true,
        data: calendar
      } as ApiResponse);
    } catch (error) {
      logger.error('获取打卡日历失败:', error);
      res.status(500).json({
        success: false,
        error: '获取打卡日历失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const statistics = await ScenarioService.getUserStatistics(openid);

      res.json({
        success: true,
        data: statistics
      } as ApiResponse);
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      res.status(500).json({
        success: false,
        error: '获取统计信息失败'
      } as ApiResponse);
    }
  }
}

export default new ScenarioController();
