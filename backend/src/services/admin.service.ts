import pool from '../config/database';
import MembershipService from './membership.service';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';

type RedeemCodeFilter = 'all' | 'used' | 'unused';

export class AdminService {
  async getUsers(keyword: string = ''): Promise<any[]> {
    try {
      const trimmedKeyword = keyword.trim();
      const likeKeyword = `%${trimmedKeyword}%`;

      const [rows] = await pool.execute(
        `SELECT
           id,
           nickname,
           openid,
           CASE
             WHEN is_vip = 1 AND vip_expire_time IS NOT NULL AND vip_expire_time > NOW() THEN 1
             ELSE 0
           END AS is_member,
           vip_expire_time,
           create_time,
           last_login_time
         FROM users
         WHERE (? = '' OR nickname LIKE ? OR openid LIKE ?)
         ORDER BY id DESC`,
        [trimmedKeyword, likeKeyword, likeKeyword]
      );

      return rows as any[];
    } catch (error) {
      logger.error('获取管理员用户列表失败:', error);
      throw new AppError('获取用户列表失败');
    }
  }

  async getRedeemCodes(filter: RedeemCodeFilter = 'all'): Promise<any[]> {
    try {
      let sql = `
        SELECT
          id,
          code,
          status,
          type,
          duration,
          used_by,
          used_time,
          created_at
        FROM redeem_codes
      `;

      if (filter === 'used') {
        sql += ' WHERE status = 1';
      } else if (filter === 'unused') {
        sql += ' WHERE status = 0';
      }

      sql += ' ORDER BY id DESC';

      const [rows] = await pool.execute(sql);
      return rows as any[];
    } catch (error) {
      logger.error('获取管理员兑换码列表失败:', error);
      throw new AppError('获取兑换码列表失败');
    }
  }

  async generateRedeemCodes(count: number, type: string, duration: number): Promise<string[]> {
    return MembershipService.generateCodes(count, type || 'manual', duration);
  }

  async getMembers(keyword: string = ''): Promise<any[]> {
    try {
      const trimmedKeyword = keyword.trim();
      const likeKeyword = `%${trimmedKeyword}%`;

      const [rows] = await pool.execute(
        `SELECT
           id,
           nickname,
           openid,
           vip_expire_time,
           last_login_time
         FROM users
         WHERE is_vip = 1
           AND vip_expire_time IS NOT NULL
           AND vip_expire_time > NOW()
           AND (? = '' OR nickname LIKE ? OR openid LIKE ?)
         ORDER BY vip_expire_time DESC, id DESC`,
        [trimmedKeyword, likeKeyword, likeKeyword]
      );

      return rows as any[];
    } catch (error) {
      logger.error('获取管理员会员列表失败:', error);
      throw new AppError('获取会员列表失败');
    }
  }

  async updateMembership(
    userId: number,
    duration: number,
    type: string = 'manual_grant'
  ): Promise<{
    userId: number;
    nickname: string;
    openid: string;
    endDate: Date;
    isExtended: boolean;
  }> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE id = ? FOR UPDATE',
        [userId]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        throw new AppError('用户不存在', 404);
      }

      const user = users[0];
      const now = new Date();
      const currentExpireTime = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
      const isCurrentlyMember = user.is_vip === 1 && currentExpireTime !== null && currentExpireTime > now;
      const startDate = isCurrentlyMember && currentExpireTime ? currentExpireTime : now;
      const endDate = new Date(startDate);

      endDate.setDate(endDate.getDate() + duration);

      await connection.execute(
        `UPDATE users
         SET is_vip = 1, vip_expire_time = ?
         WHERE id = ?`,
        [endDate, userId]
      );

      await connection.execute(
        `UPDATE memberships
         SET status = 'inactive'
         WHERE user_id = ? AND status = 'active'`,
        [userId]
      );

      await connection.execute(
        `INSERT INTO memberships (user_id, openid, code, status, type, start_date, end_date)
         VALUES (?, ?, '', 'active', ?, ?, ?)`,
        [userId, user.openid, type, startDate, endDate]
      );

      await connection.commit();

      return {
        userId,
        nickname: user.nickname || '',
        openid: user.openid,
        endDate,
        isExtended: isCurrentlyMember
      };
    } catch (error) {
      await connection.rollback();
      logger.error('管理员调整会员失败:', error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('调整会员失败');
    } finally {
      connection.release();
    }
  }
}

export default new AdminService();
