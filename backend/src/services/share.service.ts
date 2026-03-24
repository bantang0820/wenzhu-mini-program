import pool from '../config/database';
import { AppError } from '../middlewares/error';
import logger from '../utils/logger';
import moment from 'moment';

const INVITE_REWARD_DAYS = 3;

/**
 * 分享和解锁服务
 */
export class ShareService {
  private async ensureInviteRewardTable(connection: any): Promise<void> {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invite_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sharer_user_id INT NOT NULL COMMENT '邀请人用户ID',
        sharer_openid VARCHAR(100) NOT NULL COMMENT '邀请人OpenID',
        friend_user_id INT NOT NULL COMMENT '被邀请人用户ID',
        friend_openid VARCHAR(100) NOT NULL COMMENT '被邀请人OpenID',
        reward_days INT NOT NULL DEFAULT 3 COMMENT '奖励天数',
        status ENUM('rewarded') DEFAULT 'rewarded' COMMENT '奖励状态',
        rewarded_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '奖励发放时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_friend_user_id (friend_user_id),
        UNIQUE KEY uk_sharer_friend (sharer_user_id, friend_user_id),
        INDEX idx_sharer_user_id (sharer_user_id),
        INDEX idx_friend_user_id (friend_user_id),
        INDEX idx_rewarded_at (rewarded_at),
        CONSTRAINT fk_invite_rewards_sharer FOREIGN KEY (sharer_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_invite_rewards_friend FOREIGN KEY (friend_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请奖励记录表';
    `);
  }

  private async grantVipDays(
    connection: any,
    user: any,
    days: number,
    type: string,
    code: string
  ): Promise<Date> {
    const now = new Date();
    const currentExpireTime = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
    const isCurrentVip = user.is_vip === 1 && currentExpireTime !== null && currentExpireTime > now;
    const startDate = isCurrentVip && currentExpireTime ? currentExpireTime : now;
    const endDate = new Date(startDate);

    endDate.setDate(endDate.getDate() + days);

    await connection.execute(
      `UPDATE users
       SET is_vip = 1, vip_expire_time = ?
       WHERE id = ?`,
      [endDate, user.id]
    );

    await connection.execute(
      `UPDATE memberships
       SET status = 'inactive'
       WHERE user_id = ? AND status = 'active'`,
      [user.id]
    );

    await connection.execute(
      `INSERT INTO memberships (user_id, openid, code, status, type, start_date, end_date)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      [user.id, user.openid, code, type, startDate, endDate]
    );

    return endDate;
  }

  /**
   * 检查用户练习次数和状态
   * @param openid 用户OpenID
   * @returns 练习状态信息
   */
  async checkPracticeStatus(openid: string): Promise<{
    canPractice: boolean;
    remainingFreeCount: number;
    dailyFreeCount: number;
    dailyShareCount: number;
    maxShareCount: number;
    hasUnlocked: boolean;
    reason?: string;
  }> {
    try {
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        throw new AppError('用户不存在');
      }

      const user = users[0];
      const today = moment().format('YYYY-MM-DD');
      const dailyFreeDate = user.daily_free_date;
      const dailyShareDate = user.daily_share_date;

      // 检查是否需要重置免费次数
      let dailyFreeCount = user.daily_free_count || 0;
      if (dailyFreeDate !== today) {
        // 新的一天，重置免费次数
        dailyFreeCount = 0;
        await pool.execute(
          `UPDATE users SET daily_free_count = 0, daily_free_date = ? WHERE id = ?`,
          [today, user.id]
        );
      }

      // 检查是否需要重置分享次数
      let dailyShareCount = user.daily_share_count || 0;
      if (dailyShareDate !== today) {
        // 新的一天，重置分享次数
        dailyShareCount = 0;
        await pool.execute(
          `UPDATE users SET daily_share_count = 0, daily_share_date = ? WHERE id = ?`,
          [today, user.id]
        );
      }

      const maxFreeCount = 3; // 每天3次免费
      const maxShareCount = 3; // 每天3次分享机会
      const remainingFreeCount = maxFreeCount - dailyFreeCount;

      // 检查是否有未使用的解锁机会
      const [unlockRows] = await pool.execute(
        `SELECT * FROM unlock_records
         WHERE user_id = ?
           AND is_used = 0
           AND expire_date >= ?
         ORDER BY created_at ASC
         LIMIT 1`,
        [user.id, today]
      );

      const hasUnlocked = (unlockRows as any[]).length > 0;

      // 判断是否可以练习
      let canPractice = false;
      let reason = '';

      if (user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > new Date()) {
        // 会员可以无限练习
        canPractice = true;
        reason = 'member';
      } else if (remainingFreeCount > 0) {
        // 还有免费次数
        canPractice = true;
        reason = 'free';
      } else if (hasUnlocked) {
        // 有解锁机会
        canPractice = true;
        reason = 'unlocked';
      } else if (dailyShareCount < maxShareCount) {
        // 还可以分享解锁
        canPractice = false;
        reason = 'need_share';
      } else {
        // 分享次数用完，需要开通会员
        canPractice = false;
        reason = 'need_member';
      }

      return {
        canPractice,
        remainingFreeCount: Math.max(0, remainingFreeCount),
        dailyFreeCount,
        dailyShareCount,
        maxShareCount,
        hasUnlocked,
        reason
      };
    } catch (error) {
      logger.error('检查练习状态失败:', error);
      throw new AppError('检查练习状态失败');
    }
  }

  /**
   * 记录分享行为并解锁
   * @param openid 用户OpenID
   * @returns 解锁结果
   */
  async recordShareAndUnlock(openid: string): Promise<{
    success: boolean;
    message: string;
    remainingShareCount?: number;
  }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        await connection.rollback();
        throw new AppError('用户不存在');
      }

      const user = users[0];
      const today = moment().format('YYYY-MM-DD');

      // 检查今日分享次数
      let dailyShareCount = user.daily_share_count || 0;
      if (user.daily_share_date !== today) {
        dailyShareCount = 0;
      }

      if (dailyShareCount >= 3) {
        await connection.rollback();
        return {
          success: false,
          message: '今日分享次数已用完，请明天再试或开通会员'
        };
      }

      // 增加分享次数
      dailyShareCount += 1;
      await connection.execute(
        `UPDATE users SET daily_share_count = ?, daily_share_date = ? WHERE id = ?`,
        [dailyShareCount, today, user.id]
      );

      // 创建解锁记录（当天有效）
      await connection.execute(
        `INSERT INTO unlock_records (user_id, user_openid, unlock_type, expire_date)
         VALUES (?, ?, 'share', ?)`,
        [user.id, openid, today]
      );

      await connection.commit();

      logger.info(`用户分享解锁成功: openid=${openid}`);

      return {
        success: true,
        message: '分享成功！获得1次额外练习机会（今日有效）',
        remainingShareCount: 3 - dailyShareCount
      };
    } catch (error) {
      await connection.rollback();
      logger.error('记录分享失败:', error);
      throw new AppError('记录分享失败');
    } finally {
      connection.release();
    }
  }

  /**
   * 使用解锁机会
   * @param openid 用户OpenID
   * @returns 是否成功
   */
  async useUnlock(openid: string): Promise<boolean> {
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
      const today = moment().format('YYYY-MM-DD');

      // 查找未使用的解锁记录
      const [unlockRows] = await pool.execute(
        `SELECT * FROM unlock_records
         WHERE user_id = ?
           AND is_used = 0
           AND expire_date >= ?
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
        [user.id, today]
      );

      const unlocks = unlockRows as any[];

      if (unlocks.length === 0) {
        return false;
      }

      // 标记为已使用
      await pool.execute(
        `UPDATE unlock_records SET is_used = 1, used_at = NOW() WHERE id = ?`,
        [unlocks[0].id]
      );

      logger.info(`使用解锁机会成功: openid=${openid}, unlockId=${unlocks[0].id}`);
      return true;
    } catch (error) {
      logger.error('使用解锁机会失败:', error);
      return false;
    }
  }

  /**
   * 处理好友通过分享链接进入
   * @param sharerOpenid 分享者的OpenID
   * @param newFriendOpenid 新好友的OpenID
   * @returns 处理结果
   */
  async handleInviteShare(sharerOpenid: string, newFriendOpenid: string): Promise<{
    success: boolean;
    message: string;
    rewarded: boolean;
    rewardDays: number;
    friendVipExpireTime?: string;
  }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.ensureInviteRewardTable(connection);

      // 检查分享者是否存在
      const [sharerRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ? FOR UPDATE',
        [sharerOpenid]
      );

      const sharers = sharerRows as any[];
      if (sharers.length === 0) {
        await connection.rollback();
        return {
          success: false,
          message: '分享者不存在',
          rewarded: false,
          rewardDays: INVITE_REWARD_DAYS
        };
      }

      const sharer = sharers[0];

      // 检查好友是否存在
      const [friendRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ? FOR UPDATE',
        [newFriendOpenid]
      );

      const friends = friendRows as any[];

      if (friends.length === 0) {
        await connection.rollback();
        return {
          success: false,
          message: '请先登录',
          rewarded: false,
          rewardDays: INVITE_REWARD_DAYS
        };
      }

      const friend = friends[0];
      if (sharer.id === friend.id) {
        await connection.rollback();
        return {
          success: true,
          message: '不能邀请自己哦',
          rewarded: false,
          rewardDays: INVITE_REWARD_DAYS
        };
      }

      // 好友只能通过邀请奖励一次，避免重复领取
      const [existingRewardRows] = await connection.execute(
        `SELECT * FROM invite_rewards
         WHERE friend_user_id = ?
         LIMIT 1
         FOR UPDATE`,
        [friend.id]
      );

      const existingRewards = existingRewardRows as any[];

      if (existingRewards.length > 0) {
        await connection.rollback();
        return {
          success: true,
          message: '这个好友已经领取过邀请奖励了',
          rewarded: false,
          rewardDays: INVITE_REWARD_DAYS
        };
      }

      const rewardCode = `invite_${sharer.id}_${friend.id}`;
      const sharerExpireTime = await this.grantVipDays(
        connection,
        sharer,
        INVITE_REWARD_DAYS,
        'invite_reward',
        `${rewardCode}_sharer`
      );
      const friendExpireTime = await this.grantVipDays(
        connection,
        friend,
        INVITE_REWARD_DAYS,
        'invite_reward',
        `${rewardCode}_friend`
      );

      await connection.execute(
        `INSERT INTO invite_rewards (sharer_user_id, sharer_openid, friend_user_id, friend_openid, reward_days)
         VALUES (?, ?, ?, ?, ?)`,
        [sharer.id, sharerOpenid, friend.id, newFriendOpenid, INVITE_REWARD_DAYS]
      );

      await connection.commit();

      logger.info(
        `好友邀请奖励发放成功: sharer=${sharerOpenid}, friend=${newFriendOpenid}, days=${INVITE_REWARD_DAYS}, sharerExpire=${sharerExpireTime.toISOString()}, friendExpire=${friendExpireTime.toISOString()}`
      );

      return {
        success: true,
        message: `邀请成功，双方各获得 ${INVITE_REWARD_DAYS} 天 Pro 会员`,
        rewarded: true,
        rewardDays: INVITE_REWARD_DAYS,
        friendVipExpireTime: friendExpireTime.toISOString()
      };
    } catch (error) {
      await connection.rollback();
      logger.error('处理好友分享失败:', error);
      throw new AppError('处理好友分享失败');
    } finally {
      connection.release();
    }
  }

  /**
   * 记录练习（使用免费次数或解锁机会）
   * @param openid 用户OpenID
   * @returns 是否成功
   */
  async consumePractice(openid: string): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        await connection.rollback();
        return false;
      }

      const user = users[0];
      const today = moment().format('YYYY-MM-DD');

      // 检查是否是会员
      const isMember = user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > new Date();

      if (isMember) {
        await connection.commit();
        return true;
      }

      // 检查是否有免费次数
      let dailyFreeCount = user.daily_free_count || 0;
      if (user.daily_free_date === today && dailyFreeCount >= 3) {
        // 免费次数用完，尝试使用解锁机会
        const [unlockRows] = await connection.execute(
          `SELECT * FROM unlock_records
           WHERE user_id = ?
             AND is_used = 0
             AND expire_date >= ?
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE`,
          [user.id, today]
        );

        const unlocks = unlockRows as any[];

        if (unlocks.length === 0) {
          await connection.rollback();
          return false;
        }

        // 使用解锁机会
        await connection.execute(
          `UPDATE unlock_records SET is_used = 1, used_at = NOW() WHERE id = ?`,
          [unlocks[0].id]
        );

        await connection.commit();
        return true;
      } else {
        // 使用免费次数
        if (user.daily_free_date !== today) {
          dailyFreeCount = 0;
        }

        await connection.execute(
          `UPDATE users SET daily_free_count = daily_free_count + 1, daily_free_date = ? WHERE id = ?`,
          [today, user.id]
        );

        await connection.commit();
        return true;
      }
    } catch (error) {
      await connection.rollback();
      logger.error('消耗练习次数失败:', error);
      return false;
    } finally {
      connection.release();
    }
  }
}

export default new ShareService();
