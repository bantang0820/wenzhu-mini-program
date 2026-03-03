import pool from '../config/database';
import { User, CreateUserData, Membership } from '../types';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 通过openid查找用户
   * @param openid 微信OpenID
   * @returns 用户信息或null
   */
  async findUserByOpenid(openid: string): Promise<User | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = rows as any[];
      if (users.length === 0) {
        return null;
      }

      return users[0] as User;
    } catch (error) {
      logger.error('查找用户失败:', error);
      throw new AppError('查找用户失败');
    }
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @returns 创建的用户
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO users (openid, nickname, avatar_url)
         VALUES (?, ?, ?)`,
        [userData.openid, userData.nickname || '', userData.avatar_url || '']
      );

      const insertId = (result as any).insertId;

      // 查询并返回新创建的用户
      const newUser = await this.findUserById(insertId);
      if (!newUser) {
        throw new AppError('创建用户失败');
      }

      logger.info(`创建新用户: openid=${userData.openid}`);
      return newUser;
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw new AppError('创建用户失败');
    }
  }

  /**
   * 通过ID查找用户
   * @param userId 用户ID
   * @returns 用户信息或null
   */
  async findUserById(userId: number): Promise<User | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      const users = rows as any[];
      if (users.length === 0) {
        return null;
      }

      return users[0] as User;
    } catch (error) {
      logger.error('查找用户失败:', error);
      throw new AppError('查找用户失败');
    }
  }

  /**
   * 更新用户信息
   * @param openid 用户OpenID
   * @param updates 更新字段
   * @returns 更新后的用户
   */
  async updateUser(openid: string, updates: Partial<User>): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.nickname !== undefined) {
        fields.push('nickname = ?');
        values.push(updates.nickname);
      }
      if (updates.avatar_url !== undefined) {
        fields.push('avatar_url = ?');
        values.push(updates.avatar_url);
      }

      if (fields.length === 0) {
        return await this.findUserByOpenid(openid);
      }

      values.push(openid);

      await pool.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE openid = ?`,
        values
      );

      return await this.findUserByOpenid(openid);
    } catch (error) {
      logger.error('更新用户失败:', error);
      throw new AppError('更新用户失败');
    }
  }

  /**
   * 更新最后登录时间
   * @param openid 用户OpenID
   */
  async updateLastLoginTime(openid: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE users SET last_login_time = NOW() WHERE openid = ?',
        [openid]
      );
    } catch (error) {
      logger.error('更新登录时间失败:', error);
    }
  }

  /**
   * 同步用户信息（注册/登录）
   * @param openid 用户OpenID
   * @param userInfo 用户信息
   * @returns 用户信息和操作类型
   */
  async syncUserProfile(openid: string, userInfo: { nickname?: string; avatar_url?: string }): Promise<{
    user: User;
    action: 'register' | 'update';
  }> {
    try {
      let user = await this.findUserByOpenid(openid);
      let action: 'register' | 'update';

      if (!user) {
        // 新用户，创建账户
        user = await this.createUser({
          openid,
          nickname: userInfo.nickname,
          avatar_url: userInfo.avatar_url
        });
        action = 'register';
        logger.info(`新用户注册: openid=${openid}`);
      } else {
        // 老用户，更新信息
        user = await this.updateUser(openid, {
          nickname: userInfo.nickname,
          avatar_url: userInfo.avatar_url
        }) as User;
        action = 'update';
        logger.info(`用户登录: openid=${openid}`);
      }

      // 更新最后登录时间
      await this.updateLastLoginTime(openid);

      return { user, action };
    } catch (error) {
      logger.error('同步用户信息失败:', error);
      throw new AppError('同步用户信息失败');
    }
  }

  /**
   * 检查会员状态
   * @param openid 用户OpenID
   * @returns 会员信息
   */
  async checkMembership(openid: string): Promise<{
    isMember: boolean;
    membership: Membership | null;
  }> {
    try {
      const user = await this.findUserByOpenid(openid);
      if (!user) {
        return { isMember: false, membership: null };
      }

      // 检查用户是否为会员且未过期
      const isMember = user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > new Date();

      if (!isMember) {
        return { isMember: false, membership: null };
      }

      // 查找会员记录
      const [rows] = await pool.execute(
        'SELECT * FROM memberships WHERE user_id = ? AND status = "active" ORDER BY end_date DESC LIMIT 1',
        [user.id]
      );

      const memberships = rows as any[];
      const membership = memberships.length > 0 ? memberships[0] as Membership : null;

      return { isMember: true, membership };
    } catch (error) {
      logger.error('检查会员状态失败:', error);
      throw new AppError('检查会员状态失败');
    }
  }

  /**
   * 获取会员详细信息
   * @param openid 用户OpenID
   * @returns 会员详细信息
   */
  async getMembershipInfo(openid: string): Promise<{
    userId: number;
    status: string;
    startDate: Date;
    endDate: Date;
    type: string;
    isActive: boolean;
    remainingDays: number;
  } | null> {
    try {
      const user = await this.findUserByOpenid(openid);
      if (!user || !user.vip_expire_time) {
        return null;
      }

      const now = new Date();
      const endDate = new Date(user.vip_expire_time);
      const isActive = user.is_vip === 1 && endDate > now;

      // 查找会员记录
      const [rows] = await pool.execute(
        'SELECT * FROM memberships WHERE user_id = ? ORDER BY end_date DESC LIMIT 1',
        [user.id]
      );

      const memberships = rows as any[];
      const membership = memberships.length > 0 ? memberships[0] : null;

      if (!membership) {
        return null;
      }

      // 计算剩余天数
      const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        userId: user.id,
        status: isActive ? 'active' : 'inactive',
        startDate: membership.start_date,
        endDate: endDate,
        type: membership.type,
        isActive,
        remainingDays
      };
    } catch (error) {
      logger.error('获取会员信息失败:', error);
      throw new AppError('获取会员信息失败');
    }
  }

  /**
   * 增加打卡次数和天数
   * @param openid 用户OpenID
   */
  async incrementCheckIn(openid: string): Promise<void> {
    try {
      await pool.execute(
        `UPDATE users
         SET total_count = total_count + 1,
             total_days = total_days + 1
         WHERE openid = ?`,
        [openid]
      );
      logger.info(`用户打卡: openid=${openid}`);
    } catch (error) {
      logger.error('增加打卡次数失败:', error);
    }
  }

  /**
   * 增加能量值（通过累计次数间接实现）
   * @param openid 用户OpenID
   * @param energy 能量值
   */
  async addEnergy(openid: string, energy: number): Promise<void> {
    try {
      // 这里可以扩展一个energy字段，目前暂不实现
      logger.info(`用户获得能量: openid=${openid}, energy=${energy}`);
    } catch (error) {
      logger.error('增加能量失败:', error);
    }
  }
}

export default new UserService();
