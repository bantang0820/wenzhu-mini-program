import pool from '../config/database';
import { Album, Chapter } from '../types';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';

/**
 * 课程服务类
 */
export class CourseService {
  /**
   * 获取所有专辑
   * @returns 专辑列表
   */
  async getAllAlbums(): Promise<Album[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM albums ORDER BY `order` ASC'
      );

      return rows as Album[];
    } catch (error) {
      logger.error('获取专辑列表失败:', error);
      throw new AppError('获取专辑列表失败');
    }
  }

  /**
   * 通过ID获取专辑
   * @param albumId 专辑ID
   * @returns 专辑信息
   */
  async getAlbumById(albumId: string): Promise<Album | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM albums WHERE id = ?',
        [albumId]
      );

      const albums = rows as any[];
      return albums.length > 0 ? albums[0] as Album : null;
    } catch (error) {
      logger.error('获取专辑失败:', error);
      throw new AppError('获取专辑失败');
    }
  }

  /**
   * 获取专辑的章节列表
   * @param albumId 专辑ID
   * @param openid 用户OpenID（用于检查权限）
   * @returns 章节列表
   */
  async getAlbumChapters(albumId: string, openid?: string): Promise<Chapter[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM chapters WHERE album_id = ? ORDER BY `order` ASC',
        [albumId]
      );

      let chapters = rows as Chapter[];

      // 如果提供了openid，检查会员权限并解锁章节
      if (openid) {
        const isVip = await this.checkUserVip(openid);

        // 如果是会员，解锁所有章节
        // 如果不是会员，只保留第1章
        if (!isVip) {
          chapters = chapters.map(ch => ({
            ...ch,
            locked: ch.order !== 1
          }));
        } else {
          chapters = chapters.map(ch => ({
            ...ch,
            locked: false
          }));
        }
      }

      return chapters;
    } catch (error) {
      logger.error('获取章节列表失败:', error);
      throw new AppError('获取章节列表失败');
    }
  }

  /**
   * 获取章节详情
   * @param chapterId 章节ID
   * @param openid 用户OpenID
   * @returns 章节详情
   */
  async getChapterById(chapterId: number, openid: string): Promise<Chapter | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM chapters WHERE id = ?',
        [chapterId]
      );

      const chapters = rows as any[];
      if (chapters.length === 0) {
        return null;
      }

      let chapter = chapters[0] as Chapter;

      // 检查用户是否有权访问
      const isVip = await this.checkUserVip(openid);

      // 第1章免费，其他需要会员
      if (chapter.order !== 1 && !isVip) {
        chapter.locked = true;
      }

      return chapter;
    } catch (error) {
      logger.error('获取章节详情失败:', error);
      throw new AppError('获取章节详情失败');
    }
  }

  /**
   * 标记章节为已完成
   * @param openid 用户OpenID
   * @param chapterId 章节ID
   */
  async markChapterComplete(openid: string, chapterId: number): Promise<void> {
    try {
      // 获取用户ID
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        throw new AppError('用户不存在');
      }

      const user = users[0];

      // 检查是否已经完成
      const [existingRows] = await pool.execute(
        'SELECT * FROM learning_progress WHERE user_id = ? AND chapter_id = ?',
        [user.id, chapterId]
      );

      const existing = existingRows as any[];

      if (existing.length === 0) {
        // 插入完成记录
        await pool.execute(
          `INSERT INTO learning_progress (user_id, chapter_id, completed, completed_at)
           VALUES (?, ?, 1, NOW())`,
          [user.id, chapterId]
        );

        // 更新章节完成数
        await pool.execute(
          `UPDATE chapters
           SET completed_count = completed_count + 1
           WHERE id = ?`,
          [chapterId]
        );

        logger.info(`章节完成: openid=${openid}, chapterId=${chapterId}`);
      }
    } catch (error) {
      logger.error('标记章节完成失败:', error);
      throw new AppError('标记章节完成失败');
    }
  }

  /**
   * 获取用户的学习进度
   * @param openid 用户OpenID
   * @returns 学习进度
   */
  async getUserProgress(openid: string): Promise<{
    albumId: string;
    albumTitle: string;
    completedChapters: number;
    totalChapters: number;
    progress: number;
  }[]> {
    try {
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        return [];
      }

      const user = users[0];

      // 获取所有专辑
      const albums = await this.getAllAlbums();

      // 计算每个专辑的进度
      const progress = [];

      for (const album of albums) {
        // 获取专辑的所有章节
        const [chapterRows] = await pool.execute(
          'SELECT * FROM chapters WHERE album_id = ?',
          [album.id]
        );

        const chapters = chapterRows as Chapter[];
        const totalChapters = chapters.length;

        // 获取用户已完成的章节数
        const [completedRows] = await pool.execute(
          `SELECT COUNT(*) as count FROM learning_progress
           WHERE user_id = ? AND chapter_id IN (
             SELECT id FROM chapters WHERE album_id = ?
           ) AND completed = 1`,
          [user.id, album.id]
        );

        const completedResult = completedRows as any[];
        const completedChapters = completedResult[0].count;

        progress.push({
          albumId: album.id,
          albumTitle: album.title,
          completedChapters,
          totalChapters,
          progress: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
        });
      }

      return progress;
    } catch (error) {
      logger.error('获取学习进度失败:', error);
      throw new AppError('获取学习进度失败');
    }
  }

  /**
   * 检查用户是否为会员
   * @param openid 用户OpenID
   * @returns 是否为会员
   */
  private async checkUserVip(openid: string): Promise<boolean> {
    try {
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        return false;
      }

      const user = users[0];
      const now = new Date();

      return user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > now;
    } catch (error) {
      logger.error('检查会员状态失败:', error);
      return false;
    }
  }
}

export default new CourseService();
