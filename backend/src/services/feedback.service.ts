import pool from '../config/database';
import { Feedback } from '../types';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';

/**
 * 反馈服务类
 */
export class FeedbackService {
  /**
   * 提交反馈
   * @param openid 用户OpenID（匿名时为空）
   * @param content 反馈内容
   * @param contact 联系方式（可选）
   * @returns 反馈ID
   */
  async submitFeedback(openid: string, content: string, contact?: string): Promise<number> {
    try {
      let userId: number | null = null;

      if (openid) {
        const [userRows] = await pool.execute(
          'SELECT id FROM users WHERE openid = ?',
          [openid]
        );

        const users = userRows as Array<{ id: number }>;
        userId = users.length > 0 ? users[0].id : null;
      }

      const [result] = await pool.execute(
        `INSERT INTO feedbacks (user_id, openid, content, contact)
         VALUES (?, ?, ?, ?)`,
        [userId, openid, content, contact || '']
      );

      const insertId = (result as any).insertId;

      logger.info(`提交反馈成功: openid=${openid}, feedbackId=${insertId}`);
      return insertId;
    } catch (error) {
      logger.error('提交反馈失败:', error);
      throw new AppError('提交反馈失败');
    }
  }

  /**
   * 获取反馈列表（管理员功能）
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 反馈列表
   */
  async getFeedbackList(page: number = 1, pageSize: number = 20): Promise<{
    list: Feedback[];
    total: number;
  }> {
    try {
      const offset = (page - 1) * pageSize;

      // 查询总数
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM feedbacks'
      );

      const countResult = countRows as any[];
      const total = countResult[0].total;

      // 查询列表
      const [rows] = await pool.execute(
        `SELECT * FROM feedbacks
         ORDER BY create_time DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const list = rows as Feedback[];

      return { list, total };
    } catch (error) {
      logger.error('获取反馈列表失败:', error);
      throw new AppError('获取反馈列表失败');
    }
  }
}

export default new FeedbackService();
