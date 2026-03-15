import axios from 'axios';
import { config } from '../config/app';
import { WechatLoginResponse } from '../types';
import logger from '../utils/logger';

/**
 * 微信服务类
 */
export class WechatService {
  private getDevelopmentMockSession() {
    const mockOpenid = config.wechat.devMockOpenid || 'test_openid_local_user';
    logger.warn(`使用稳定测试用户 openid: ${mockOpenid}`);

    return {
      openid: mockOpenid,
      session_key: 'mock_session_key',
      unionid: 'mock_unionid'
    };
  }

  /**
   * 通过code获取session信息
   * @param code 微信登录码
   * @returns session信息
   */
  async code2Session(code: string): Promise<WechatLoginResponse> {
    try {
      const url = `${config.wechat.apiUrl}/sns/jscode2session`;
      const params = {
        appid: config.wechat.appId,
        secret: config.wechat.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      };

      logger.info(`微信登录请求: code=${code.substring(0, 10)}...`);

      const response = await axios.get<{ openid: string; session_key: string; unionid?: string; errcode?: number; errmsg?: string }>(
        url,
        { params }
      );

      const data = response.data;

      // 检查是否有错误
      if (data.errcode) {
        logger.error(`微信登录失败: errcode=${data.errcode}, errmsg=${data.errmsg}`);

        // 开发/测试环境：使用模拟用户
        if (config.nodeEnv === 'development' || code.startsWith('mock_')) {
          return this.getDevelopmentMockSession();
        }

        throw new Error(data.errmsg || '微信登录失败');
      }

      logger.info(`微信登录成功: openid=${data.openid}`);

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid
      };
    } catch (error) {
      logger.error('微信登录异常:', error);

      // 开发/测试环境：返回模拟用户
      if (config.nodeEnv === 'development') {
        logger.warn('微信API调用失败，回退到稳定测试用户');
        return this.getDevelopmentMockSession();
      }

      throw new Error('微信登录服务异常');
    }
  }

  /**
   * 验证access_token（如果需要）
   * @param accessToken 微信access_token
   * @returns 是否有效
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const url = `${config.wechat.apiUrl}/auth/checkAccessToken`;
      const response = await axios.get(url, {
        params: { access_token: accessToken }
      });
      return response.data.errcode === 0;
    } catch (error) {
      logger.error('验证access_token失败:', error);
      return false;
    }
  }
}

export default new WechatService();
