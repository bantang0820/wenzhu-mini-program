import pool from '../config/database';
import { RedeemCode } from '../types';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';

/**
 * 会员服务类
 */
export class MembershipService {
  /**
   * 兑换会员码
   * @param openid 用户OpenID
   * @param code 兑换码
   * @returns 兑换结果
   */
  async redeemCode(openid: string, code: string): Promise<{
    success: boolean;
    msg: string;
    expireDate: string;
  }> {
    const connection = await pool.getConnection();

    try {
      // 开始事务
      await connection.beginTransaction();

      // 1. 查找兑换码并加锁
      const [redeemRows] = await connection.execute(
        'SELECT * FROM redeem_codes WHERE code = ? FOR UPDATE',
        [code.toUpperCase()]
      );

      const redeemCodes = redeemRows as any[];
      if (redeemCodes.length === 0) {
        await connection.rollback();
        return { success: false, msg: '兑换码不存在', expireDate: '' };
      }

      const redeemCode = redeemCodes[0] as RedeemCode;

      // 2. 检查兑换码状态
      if (redeemCode.status === 1) {
        await connection.rollback();
        return { success: false, msg: '兑换码已被使用', expireDate: '' };
      }

      // 3. 查找用户
      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        await connection.rollback();
        return { success: false, msg: '用户不存在', expireDate: '' };
      }

      const user = users[0];

      // 4. 计算过期时间
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > now) {
        // 已是会员，在原有过期时间基础上累加
        startDate = new Date(user.vip_expire_time);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + redeemCode.duration);
      } else {
        // 新会员或已过期，从现在开始计算
        startDate = now;
        endDate = new Date(now);
        endDate.setDate(endDate.getDate() + redeemCode.duration);
      }

      // 5. 更新用户会员状态
      await connection.execute(
        `UPDATE users
         SET is_vip = 1, vip_expire_time = ?
         WHERE id = ?`,
        [endDate, user.id]
      );

      // 6. 标记兑换码为已使用
      await connection.execute(
        `UPDATE redeem_codes
         SET status = 1, used_by = ?, used_time = NOW()
         WHERE id = ?`,
        [openid, redeemCode.id]
      );

      // 7. 插入会员记录
      await connection.execute(
        `INSERT INTO memberships (user_id, status, type, start_date, end_date)
         VALUES (?, 'active', ?, ?, ?)`,
        [user.id, redeemCode.type, startDate, endDate]
      );

      // 提交事务
      await connection.commit();

      logger.info(`兑换成功: openid=${openid}, code=${code}, endDate=${endDate.toISOString()}`);

      // 格式化过期日期为 YYYY.MM.DD
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');

      return {
        success: true,
        msg: '兑换成功！',
        expireDate: `${year}.${month}.${day}`
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      logger.error('兑换码失败:', error);
      throw new AppError('兑换失败，请稍后重试');
    } finally {
      connection.release();
    }
  }

  /**
   * 批量生成兑换码
   * @param count 生成数量
   * @param type 兑换类型
   * @param duration 天数
   * @returns 生成的兑换码列表
   */
  async generateCodes(count: number, type: string = 'annual', duration: number = 365): Promise<string[]> {
    const codes: string[] = [];

    try {
      for (let i = 0; i < count; i++) {
        // 生成12位大写字母+数字的兑换码
        const code = this.generateRandomCode(12);

        await pool.execute(
          `INSERT INTO redeem_codes (code, status, type, duration)
           VALUES (?, 0, ?, ?)`,
          [code, type, duration]
        );

        codes.push(code);
      }

      logger.info(`批量生成兑换码: count=${count}, type=${type}`);
      return codes;
    } catch (error) {
      logger.error('生成兑换码失败:', error);
      throw new AppError('生成兑换码失败');
    }
  }

  /**
   * 生成随机兑换码
   * @param length 长度
   * @returns 兑换码
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
    let code = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }

    return code;
  }

  /**
   * 查询兑换码状态
   * @param code 兑换码
   * @returns 兑换码信息
   */
  async getCodeInfo(code: string): Promise<RedeemCode | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM redeem_codes WHERE code = ?',
        [code.toUpperCase()]
      );

      const codes = rows as any[];
      return codes.length > 0 ? codes[0] as RedeemCode : null;
    } catch (error) {
      logger.error('查询兑换码失败:', error);
      throw new AppError('查询兑换码失败');
    }
  }
}

export default new MembershipService();
