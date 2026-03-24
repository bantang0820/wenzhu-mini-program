import axios, { AxiosInstance } from 'axios';
import { config } from '../config/app';
import {
  generatePaySignature,
  generateUserSignature,
  getOfferId,
  getAppId
} from '../utils/virtualPaymentSignature';
import logger from '../utils/logger';

/**
 * 微信虚拟支付服务
 * 文档: https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html
 */

interface VirtualPaymentConfig {
  appId: string;
  appSecret: string;
  offerId: string;
  sandboxAppKey: string;
  prodAppKey: string;
}

interface CreateOrderOptions {
  env: number; // 0-正式环境 1-沙箱环境
  userIp: string;
  productId: string; // 道具ID，如 wenzhu_vip_yearly
  quantity: number; // 购买数量
  outTradeNo: string; // 商户订单号
}

interface OrderQueryOptions {
  env: number;
  openid: string;
  order_id?: string; // 商户订单号
  wx_order_id?: string; // 微信订单号（与order_id二选一）
}

interface VirtualPaymentResponse {
  errcode: number;
  errmsg: string;
  [key: string]: any;
}

// Access Token 缓存
interface AccessTokenCache {
  token: string;
  expiresAt: number; // 过期时间戳
}

let accessTokenCache: AccessTokenCache | null = null;

export class VirtualPaymentService {
  private config: VirtualPaymentConfig;
  private axiosClient: AxiosInstance;

  constructor() {
    this.config = {
      appId: getAppId(),
      appSecret: config.wechat.appSecret, // 从配置中获取AppSecret
      offerId: getOfferId(),
      sandboxAppKey: process.env.SANDBOX_APP_KEY || 'j2Nrg8CpesXNJIYQn6GXhdB3q4TP7cbf',
      prodAppKey: process.env.PROD_APP_KEY || 'BkB08LlSGyk00Txvqyz2LSx3PFutcLsO'
    };

    // 创建axios实例
    this.axiosClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 获取访问令牌（带缓存和自动刷新）
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // 检查缓存是否有效（提前5分钟刷新）
    if (accessTokenCache && accessTokenCache.expiresAt > now + 300000) {
      logger.info('使用缓存的access_token');
      return accessTokenCache.token;
    }

    try {
      logger.info('获取新的access_token');

      const url = `${config.wechat.apiUrl}/cgi-bin/token`;
      const params = {
        grant_type: 'client_credential',
        appid: this.config.appId,
        secret: this.config.appSecret
      };

      const response = await this.axiosClient.get(url, { params });
      const data = response.data as any;

      if (data.errcode) {
        logger.error(`获取access_token失败: ${data.errcode} - ${data.errmsg}`);
        throw new Error(data.errmsg || '获取access_token失败');
      }

      const accessToken = data.access_token;
      const expiresIn = data.expires_in || 7200; // 默认7200秒

      // 缓存access_token（提前5分钟过期）
      accessTokenCache = {
        token: accessToken,
        expiresAt: now + expiresIn * 1000 - 300000
      };

      logger.info('access_token获取成功并已缓存');

      return accessToken;
    } catch (error: any) {
      logger.error('获取access_token异常:', error);

      // 如果有缓存，即使过期也先使用（降级策略）
      if (accessTokenCache) {
        logger.warn('使用过期的access_token作为降级策略');
        return accessTokenCache.token;
      }

      throw new Error('无法获取access_token');
    }
  }

  /**
   * 清除access_token缓存（用于强制刷新）
   */
  public clearAccessTokenCache(): void {
    accessTokenCache = null;
    logger.info('access_token缓存已清除');
  }

  /**
   * 调用微信虚拟支付API
   */
  private async callVirtualPaymentAPI(
    apiUrl: string,
    signData: Record<string, any>,
    uri: string,
    env: number,
    useUserSignature: boolean = false,
    sessionKey?: string
  ): Promise<VirtualPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const appKey = env === 1 ? this.config.sandboxAppKey : this.config.prodAppKey;
      const postBody = JSON.stringify(signData);

      // 生成签名
      let signature: string;
      if (useUserSignature) {
        if (!sessionKey) {
          throw new Error('缺少用户session_key，无法生成用户态签名');
        }
        signature = generateUserSignature(sessionKey, postBody);
      } else {
        signature = generatePaySignature(appKey, postBody, uri);
      }

      // 构建请求URL（添加签名参数）
      const signatureParam = useUserSignature ? 'signature' : 'pay_sig';
      const fullUrl = `${apiUrl}?access_token=${accessToken}&${signatureParam}=${encodeURIComponent(signature)}`;

      logger.info(`调用虚拟支付API: ${uri}`);
      logger.info(`请求数据: ${postBody}`);

      // 发送请求
      const response = await this.axiosClient.post(fullUrl, postBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info(`API响应: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: any) {
      logger.error('调用虚拟支付API失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 查询用户余额（代币模式用）
   * GET /xpay/query_user_balance
   */
  async queryUserBalance(
    openid: string,
    env: number,
    userIp: string,
    sessionKey: string
  ): Promise<VirtualPaymentResponse> {
    const signData = {
      openid,
      env,
      user_ip: userIp
    };

    return await this.callVirtualPaymentAPI(
      'https://api.weixin.qq.com/xpay/query_user_balance',
      signData,
      '/xpay/query_user_balance',
      env,
      true, // 使用用户态签名
      sessionKey
    );
  }

  /**
   * 查询订单
   * POST /xpay/query_order
   */
  async queryOrder(options: OrderQueryOptions): Promise<VirtualPaymentResponse> {
    const { env, openid, order_id, wx_order_id } = options;

    if (!order_id && !wx_order_id) {
      throw new Error('order_id和wx_order_id必须提供一个');
    }

    const signData: any = {
      openid,
      env
    };

    if (order_id) {
      signData.order_id = order_id;
    }
    if (wx_order_id) {
      signData.wx_order_id = wx_order_id;
    }

    return await this.callVirtualPaymentAPI(
      'https://api.weixin.qq.com/xpay/query_order',
      signData,
      '/xpay/query_order',
      env
    );
  }

  /**
   * 代币扣款（代币模式用）
   * POST /xpay/currency_pay
   */
  async currencyPay(
    openid: string,
    env: number,
    userIp: string,
    amount: number,
    orderId: string,
    payitem: string,
    sessionKey: string,
    remark?: string
  ): Promise<VirtualPaymentResponse> {
    const signData = {
      openid,
      env,
      user_ip: userIp,
      amount,
      order_id: orderId,
      payitem,
      remark: remark || ''
    };

    return await this.callVirtualPaymentAPI(
      'https://api.weixin.qq.com/xpay/currency_pay',
      signData,
      '/xpay/currency_pay',
      env,
      true,
      sessionKey
    );
  }

  /**
   * 申请退款
   * POST /xpay/refund_order
   */
  async refundOrder(
    openid: string,
    orderId: string,
    refundOrderId: string,
    leftFee: number,
    refundFee: number,
    env: number,
    bizMeta?: string,
    refundReason?: number,
    reqFrom?: string
  ): Promise<VirtualPaymentResponse> {
    const signData = {
      openid,
      order_id: orderId,
      refund_order_id: refundOrderId,
      left_fee: leftFee,
      refund_fee: refundFee,
      biz_meta: bizMeta || '',
      refund_reason: refundReason || 0,
      req_from: reqFrom || '2',
      env
    };

    return await this.callVirtualPaymentAPI(
      'https://api.weixin.qq.com/xpay/refund_order',
      signData,
      '/xpay/refund_order',
      env
    );
  }

  /**
   * 通知发货完成
   * POST /xpay/notify_provide_goods
   */
  async notifyProvideGoods(
    orderId: string,
    env: number
  ): Promise<VirtualPaymentResponse> {
    const signData = {
      order_id: orderId,
      env
    };

    return await this.callVirtualPaymentAPI(
      'https://api.weixin.qq.com/xpay/notify_provide_goods',
      signData,
      '/xpay/notify_provide_goods',
      env
    );
  }

  /**
   * 生成前端调起支付需要的签名数据
   * 这个签名在前端用wx.requestVirtualPayment时需要
   */
  generateFrontendSignData(
    productId: string,
    quantity: number,
    outTradeNo: string,
    env: number,
    attach: string,
    mode: 'short_series_goods' | 'short_series_coin' = 'short_series_goods',
    goodsPrice?: number
  ): Record<string, any> {
    const signData: Record<string, any> = {
      offerId: this.config.offerId,
      buyQuantity: quantity,
      env,
      currencyType: 'CNY',
      productId,
      outTradeNo,
      attach
    };

    if (mode === 'short_series_goods' && typeof goodsPrice === 'number') {
      signData.goodsPrice = goodsPrice;
    }

    return signData;
  }

  /**
   * 生成前端调起 wx.requestVirtualPayment 需要的 paySig / signature
   */
  generateFrontendSignatures(
    signData: Record<string, any>,
    env: number,
    sessionKey: string
  ): { paySig: string; signature: string } {
    const appKey = env === 1 ? this.config.sandboxAppKey : this.config.prodAppKey;
    const signDataStr = JSON.stringify(signData);
    const uri = 'requestVirtualPayment';

    return {
      paySig: generatePaySignature(appKey, signDataStr, uri),
      signature: generateUserSignature(sessionKey, signDataStr)
    };
  }

  /**
   * 验证是否来自微信的推送通知
   * 用于服务器端消息推送的签名验证
   */
  validateNotificationSignature(
    signature: string,
    data: Record<string, any>
  ): boolean {
    // TODO: 实现推送通知的签名验证
    // 具体实现参考微信文档的推送验证部分
    return true;
  }
}

export default new VirtualPaymentService();
