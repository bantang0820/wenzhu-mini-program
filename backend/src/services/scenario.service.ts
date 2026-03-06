import pool from '../config/database';
import { Scenario } from '../types';
import logger from '../utils/logger';
import { AppError } from '../middlewares/error';
import moment from 'moment';

/**
 * 场景服务类
 */
export class ScenarioService {
  /**
   * 获取所有场景
   * @param isFree 是否只获取免费场景
   * @returns 场景列表
   */
  async getAllScenarios(isFree?: boolean): Promise<Scenario[]> {
    try {
      let sql = 'SELECT * FROM scenarios ORDER BY `order` ASC';
      const params: any[] = [];

      if (isFree !== undefined) {
        sql += ' WHERE is_free = ?';
        params.push(isFree ? 1 : 0);
      }

      const [rows] = await pool.execute(sql, params);
      return rows as Scenario[];
    } catch (error) {
      logger.error('获取场景列表失败:', error);
      throw new AppError('获取场景列表失败');
    }
  }

  /**
   * 通过ID获取场景
   * @param scenarioId 场景ID
   * @returns 场景信息
   */
  async getScenarioById(scenarioId: string): Promise<Scenario | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM scenarios WHERE id = ?',
        [scenarioId]
      );

      const scenarios = rows as any[];
      return scenarios.length > 0 ? scenarios[0] as Scenario : null;
    } catch (error) {
      logger.error('获取场景失败:', error);
      throw new AppError('获取场景失败');
    }
  }

  /**
   * 检查场景访问权限
   * @param scenarioId 场景ID
   * @param isOpenid 用户OpenID
   * @returns 是否有权限
   */
  async checkScenarioAccess(scenarioId: string, openid: string): Promise<boolean> {
    try {
      // 获取场景信息
      const scenario = await this.getScenarioById(scenarioId);
      if (!scenario) {
        return false;
      }

      // 免费场景直接放行
      if (scenario.is_free) {
        return true;
      }

      // 检查用户会员状态
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

      // 检查是否为有效会员
      return user.is_vip === 1 && user.vip_expire_time && new Date(user.vip_expire_time) > now;
    } catch (error) {
      logger.error('检查场景访问权限失败:', error);
      return false;
    }
  }

  /**
   * 记录练习
   * @param openid 用户OpenID
   * @param scenarioId 场景ID
   * @param moodBefore 练习前心情
   * @param moodAfter 练习后心情
   * @param duration 停留时长（毫秒）
   * @param energy 获得的能量
   */
  async recordPractice(
    openid: string,
    scenarioId: string,
    moodBefore: number = 3,
    moodAfter: number = 3,
    duration: number = 0,
    energy: number = 60
  ): Promise<void> {
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
      const practiceDate = moment().format('YYYY-MM-DD');

      // 检查今天是否已经练习过（用于判断是否增加总天数）
      const [existingRows] = await pool.execute(
        'SELECT * FROM practice_records WHERE user_id = ? AND practice_date = ?',
        [user.id, practiceDate]
      );

      const existing = existingRows as any[];
      const isFirstToday = existing.length === 0;

      // 插入新的练习记录（每次练习都插入）
      await pool.execute(
        `INSERT INTO practice_records (user_id, scenario_id, practice_date, energy, mood_before, mood_after, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, scenarioId, practiceDate, energy, moodBefore, moodAfter, duration]
      );

      // 更新用户总次数
      await pool.execute(
        `UPDATE users
         SET total_count = total_count + 1
         WHERE id = ?`,
        [user.id]
      );

      // 如果是今天首次练习，增加总天数
      if (isFirstToday) {
        await pool.execute(
          `UPDATE users
           SET total_days = total_days + 1
           WHERE id = ?`,
          [user.id]
        );
      }

      logger.info(`记录练习成功: openid=${openid}, scenario=${scenarioId}`);
    } catch (error) {
      logger.error('记录练习失败:', error);
      throw new AppError('记录练习失败');
    }
  }

  /**
   * 记录情绪日志
   * @param openid 用户OpenID
   * @param scenarioId 场景ID
   * @param scenarioTitle 场景标题
   * @param moodBefore 练习前心情
   * @param moodAfter 练习后心情
   * @param duration 停留时长（毫秒）
   */
  async logEmotion(
    openid: string,
    scenarioId: string,
    scenarioTitle: string,
    moodBefore: number,
    moodAfter: number,
    duration: number
  ): Promise<void> {
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
      const now = new Date();
      const weekday = now.getDay();

      await pool.execute(
        `INSERT INTO emotion_logs (user_id, scenario_id, scenario_title, timestamp, weekday, duration, mood_before, mood_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, scenarioId, scenarioTitle, now, weekday, duration, moodBefore, moodAfter]
      );

      logger.info(`记录情绪日志成功: openid=${openid}`);
    } catch (error) {
      logger.error('记录情绪日志失败:', error);
      throw new AppError('记录情绪日志失败');
    }
  }

  /**
   * 获取用户的打卡日历
   * @param openid 用户OpenID
   * @returns 打卡记录数组
   */
  async getCheckInCalendar(openid: string): Promise<string[]> {
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

      const [rows] = await pool.execute(
        'SELECT practice_date FROM practice_records WHERE user_id = ? ORDER BY practice_date DESC',
        [user.id]
      );

      const records = rows as any[];
      return records.map(r => moment(r.practice_date).format('YYYY-MM-DD'));
    } catch (error) {
      logger.error('获取打卡日历失败:', error);
      throw new AppError('获取打卡日历失败');
    }
  }

  /**
   * 获取用户的统计信息
   * @param openid 用户OpenID
   * @returns 统计信息
   */
  async getUserStatistics(openid: string): Promise<{
    totalDays: number;
    totalCount: number;
    totalEnergy: number;
    continuousDays: number;
  }> {
    try {
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        return { totalDays: 0, totalCount: 0, totalEnergy: 0, continuousDays: 0 };
      }

      const user = users[0];

      // 获取总能量
      const [energyRows] = await pool.execute(
        'SELECT SUM(energy) as total FROM practice_records WHERE user_id = ?',
        [user.id]
      );

      const energyResult = energyRows as any[];
      const totalEnergy = energyResult[0].total || 0;

      // 计算连续打卡天数
      const [checkinRows] = await pool.execute(
        'SELECT practice_date FROM practice_records WHERE user_id = ? ORDER BY practice_date DESC',
        [user.id]
      );

      const checkins = checkinRows as any[];
      let continuousDays = 0;

      if (checkins.length > 0) {
        let checkDate = moment();

        for (const checkin of checkins) {
          const practiceDate = moment(checkin.practice_date).format('YYYY-MM-DD');

          if (practiceDate === checkDate.format('YYYY-MM-DD')) {
            continuousDays++;
            checkDate.subtract(1, 'day');
          } else if (practiceDate === checkDate.add(1, 'day').format('YYYY-MM-DD')) {
            // 允许中间断一天
            continuousDays++;
            checkDate.subtract(1, 'day');
          } else {
            break;
          }
        }
      }

      return {
        totalDays: user.total_days || 0,
        totalCount: user.total_count || 0,
        totalEnergy,
        continuousDays
      };
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw new AppError('获取统计信息失败');
    }
  }

  /**
   * 获取用户核心统计信息（4个核心指标）
   * @param openid 用户OpenID
   * @returns 核心统计信息
   */
  async getUserCoreStatistics(openid: string): Promise<{
    totalCount: number;
    continuousDays: number;
    topScenarios: Array<{ scenarioId: string; count: number; title?: string }>;
    churnRisk: { hasRisk: boolean; daysSinceLastPractice?: number };
  }> {
    try {
      const [userRows] = await pool.execute(
        'SELECT * FROM users WHERE openid = ?',
        [openid]
      );

      const users = userRows as any[];
      if (users.length === 0) {
        return {
          totalCount: 0,
          continuousDays: 0,
          topScenarios: [],
          churnRisk: { hasRisk: false }
        };
      }

      const user = users[0];

      // 1. 获取总练习次数
      const totalCount = user.total_count || 0;

      // 2. 计算连续练习天数
      const [checkinRows] = await pool.execute(
        'SELECT DISTINCT practice_date FROM practice_records WHERE user_id = ? ORDER BY practice_date DESC',
        [user.id]
      );

      const checkins = checkinRows as any[];
      let continuousDays = 0;

      if (checkins.length > 0) {
        let checkDate = moment();

        for (const checkin of checkins) {
          const practiceDate = moment(checkin.practice_date).format('YYYY-MM-DD');

          if (practiceDate === checkDate.format('YYYY-MM-DD')) {
            continuousDays++;
            checkDate.subtract(1, 'day');
          } else {
            break;
          }
        }
      }

      // 3. 获取最常练的场景Top3
      const [scenarioRows] = await pool.execute(
        `SELECT scenario_id, COUNT(*) as count
         FROM practice_records
         WHERE user_id = ?
         GROUP BY scenario_id
         ORDER BY count DESC
         LIMIT 3`,
        [user.id]
      );

      const topScenarios = scenarioRows as any[];

      // 获取场景标题
      const scenariosWithTitles = await Promise.all(
        topScenarios.map(async (scenario) => {
          const [scenarioInfo] = await pool.execute(
            'SELECT title FROM scenarios WHERE id = ?',
            [scenario.scenario_id]
          );
          const info = scenarioInfo as any[];
          return {
            scenarioId: scenario.scenario_id,
            count: scenario.count,
            title: info.length > 0 ? info[0].title : undefined
          };
        })
      );

      // 4. 流失预警（3天未练习）
      let daysSinceLastPractice = 0;
      let hasRisk = false;

      if (checkins.length > 0) {
        const lastPracticeDate = moment(checkins[0].practice_date);
        const today = moment().startOf('day');
        daysSinceLastPractice = today.diff(lastPracticeDate, 'days');

        // 超过3天未练习，有流失风险
        hasRisk = daysSinceLastPractice >= 3;
      }

      return {
        totalCount,
        continuousDays,
        topScenarios: scenariosWithTitles,
        churnRisk: {
          hasRisk,
          daysSinceLastPractice: hasRisk ? daysSinceLastPractice : undefined
        }
      };
    } catch (error) {
      logger.error('获取核心统计信息失败:', error);
      throw new AppError('获取核心统计信息失败');
    }
  }
}

export default new ScenarioService();
