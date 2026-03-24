import { Request, Response } from 'express';
import WechatService from '../services/wechat.service';
import WechatSessionService from '../services/wechatSession.service';
import UserService from '../services/user.service';
import { generateToken } from '../utils/jwt';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

/**
 * 认证控制器
 */
export class AuthController {
  /**
   * 微信一键登录
   */
  async wechatLogin(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        res.status(400).json({
          success: false,
          error: '缺少微信登录码'
        } as ApiResponse);
        return;
      }

      // 1. 通过code换取openid
      const session = await WechatService.code2Session(code);

      // 缓存session_key，供虚拟支付用户态签名使用
      WechatSessionService.setSessionKey(session.openid, session.session_key);

      // 2. 同步用户信息
      const { user, action } = await UserService.syncUserProfile(session.openid, {});

      // 3. 生成JWT token
      const token = generateToken({
        userId: user.id,
        openid: user.openid
      });

      logger.info(`用户${action === 'register' ? '注册' : '登录'}成功: openid=${session.openid}`);

      res.json({
        success: true,
        data: {
          token,
          openid: session.openid,
          user: {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatarUrl: user.avatar_url,
            isVip: user.is_vip === 1,
            vipExpireTime: user.vip_expire_time,
            totalDays: user.total_days,
            totalCount: user.total_count
          },
          action
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('微信登录失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '微信登录失败'
      } as ApiResponse);
    }
  }

  /**
   * 保存用户信息
   */
  async saveUserInfo(req: Request, res: Response): Promise<void> {
    try {
      const { openid, userInfo } = req.body;

      if (!openid) {
        res.status(400).json({
          success: false,
          error: '缺少OpenID'
        } as ApiResponse);
        return;
      }

      // 同步用户信息
      const { user, action } = await UserService.syncUserProfile(openid, {
        nickname: userInfo?.nickName,
        avatar_url: userInfo?.avatarUrl
      });

      res.json({
        success: true,
        data: {
          userId: user.id,
          isNewUser: action === 'register'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('保存用户信息失败:', error);
      res.status(500).json({
        success: false,
        error: '保存用户信息失败'
      } as ApiResponse);
    }
  }

  /**
   * 同步用户信息（注册/登录）
   */
  async syncUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userInfo } = req.body;
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      // 同步用户信息
      const { user, action } = await UserService.syncUserProfile(openid, {
        nickname: userInfo?.nickname,
        avatar_url: userInfo?.avatarUrl
      });

      res.json({
        success: true,
        data: {
          action,
          user: {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatarUrl: user.avatar_url,
            isVip: user.is_vip === 1,
            vipExpireTime: user.vip_expire_time,
            createTime: user.create_time,
            lastLoginTime: user.last_login_time,
            totalDays: user.total_days,
            totalCount: user.total_count
          }
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('同步用户信息失败:', error);
      res.status(500).json({
        success: false,
        error: '同步用户信息失败'
      } as ApiResponse);
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(req: Request, res: Response): Promise<void> {
    try {
      const openid = req.user?.openid;

      if (!openid) {
        res.status(401).json({
          success: false,
          error: '未授权'
        } as ApiResponse);
        return;
      }

      const user = await UserService.findUserByOpenid(openid);

      if (!user) {
        res.status(404).json({
          success: false,
          error: '用户不存在'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: user.avatar_url,
          isVip: user.is_vip === 1,
          vipExpireTime: user.vip_expire_time,
          createTime: user.create_time,
          lastLoginTime: user.last_login_time,
          totalDays: user.total_days,
          totalCount: user.total_count
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      res.status(500).json({
        success: false,
        error: '获取用户信息失败'
      } as ApiResponse);
    }
  }
}

export default new AuthController();
