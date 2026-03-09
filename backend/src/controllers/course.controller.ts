import { Request, Response } from 'express';
import CourseService from '../services/course.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 课程控制器
 */
export class CourseController {
  /**
   * 获取所有专辑
   */
  async getAllAlbums(req: Request, res: Response): Promise<void> {
    try {
      const albums = await CourseService.getAllAlbums();

      res.json({
        success: true,
        data: albums
      } as ApiResponse);
    } catch (error) {
      logger.error('获取专辑列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取专辑列表失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取专辑详情
   */
  async getAlbumById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const album = await CourseService.getAlbumById(id);

      if (!album) {
        res.status(404).json({
          success: false,
          error: '专辑不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: album
      } as ApiResponse);
    } catch (error) {
      logger.error('获取专辑详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取专辑详情失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取专辑的章节列表
   */
  async getAlbumChapters(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const openid = req.user?.openid;

      const chapters = await CourseService.getAlbumChapters(id, openid);

      res.json({
        success: true,
        data: chapters
      } as ApiResponse);
    } catch (error) {
      logger.error('获取章节列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取章节列表失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取章节详情
   */
  async getChapterById(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const chapter = await CourseService.getChapterById(parseInt(chapterId), openid);

      if (!chapter) {
        res.status(404).json({
          success: false,
          error: '章节不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: chapter
      } as ApiResponse);
    } catch (error) {
      logger.error('获取章节详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取章节详情失败'
      } as ApiResponse);
    }
  }

  /**
   * 标记章节为已完成
   */
  async markChapterComplete(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      await CourseService.markChapterComplete(openid, parseInt(chapterId));

      res.json({
        success: true,
        data: {
          message: '标记成功'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('标记章节完成失败:', error);
      res.status(500).json({
        success: false,
        error: '标记章节完成失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取用户的学习进度
   */
  async getUserProgress(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const progress = await CourseService.getUserProgress(openid);

      res.json({
        success: true,
        data: progress
      } as ApiResponse);
    } catch (error) {
      logger.error('获取学习进度失败:', error);
      res.status(500).json({
        success: false,
        error: '获取学习进度失败'
      } as ApiResponse);
    }
  }
}

export default new CourseController();
