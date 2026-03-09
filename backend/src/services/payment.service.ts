import WechatPayConfig from '../config/wechatPay';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * 支付订单接口
 */
interface PaymentOrder {
  appid?: string;
  mchid?: string;
  description: string;      // 商品描述
  out_trade_no: string;     // 商户订单号
  notify_url: string;       // 支付回调地址
  time_expire?: string;
  attach?: string;
  goods_tag?: string;
  amount: {
    total: number;          // 订单总金额（单位：分）
    currency: string;       // 货币类型
  };
  payer: {
    openid: string;         // 用户openid
  };
  detail?: any;
  scene_info?: {
    payer_client_ip: string;
    device_id?: string;
    store_info?: any;
  };
}

/**
 * 支付结果接口
 */
interface PaymentResult {
  prepayId?: string;        // 预支付交易会话标识
  codeUrl?: string;         // 二维码链接（PC扫码支付）
  errorCode?: string;       // 错误代码
  errorMsg?: string;        // 错误信息
}

/**
 * 小程序支付参数接口
 */
interface MiniPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

/**
 * 支付服务
 */
class PaymentService {
  /**
   * 创建JSAPI支付订单
   */
  async createJsapiOrder(
    openid: string,
    description: string,
    totalAmount: number,
    orderNo: string,
    clientIp?: string
  ): Promise<PaymentResult> {
    try {
      const wxpay = WechatPayConfig.getInstance();
      const notifyUrl = process.env.WECHAT_NOTIFY_URL;

      if (!notifyUrl) {
        throw new Error('未配置支付回调地址');
      }

      // 构建订单参数
      const order: PaymentOrder = {
        description: description,
        out_trade_no: orderNo,
        notify_url: notifyUrl,
        amount: {
          total: totalAmount, // 单位：分
          currency: 'CNY'
        },
        payer: {
          openid: openid
        }
      };

      logger.info('创建JSAPI支付订单:', order);

      // 调用JSAPI下单接口
      const result = await wxpay.transactions_jsapi(order);

      // 添加回调URL
      if (result.status === 200 && result.data) {
        // 下单成功，需要用新订单号再次请求以设置notify_url
        // 或者直接在第一次请求时包含在扩展参数中
        logger.info('微信支付下单响应:', JSON.stringify(result, null, 2));
      }

      if (result.status !== 200) {
        return {
          errorCode: result.status.toString(),
          errorMsg: `下单失败: HTTP ${result.status}`
        };
      }

      const data = result.data;

      if (!data.prepay_id) {
        return {
          errorCode: 'NO_PREPAY_ID',
          errorMsg: '未获取到预支付交易会话标识'
        };
      }

      // 返回预支付ID
      return {
        prepayId: data.prepay_id
      };
    } catch (error: any) {
      logger.error('创建JSAPI支付订单失败:', error);
      return {
        errorCode: error.code || 'CREATE_ORDER_ERROR',
        errorMsg: error.message || '创建支付订单失败'
      };
    }
  }

  /**
   * 生成小程序支付参数
   * 用于前端调起支付
   */
  async getMiniPayParams(prepayId: string): Promise<MiniPayParams> {
    try {
      const wxpay = WechatPayConfig.getInstance();
      const appId = process.env.WECHAT_APP_ID!;

      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const pkg = `prepay_id=${prepayId}`;

      // 构建签名串
      const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;

      // 使用SDK的签名方法
      const paySign = wxpay.getSignature('POST', nonceStr, timeStamp, '/v3/pay/transactions/jsapi', pkg);

      const payParams: MiniPayParams = {
        timeStamp: timeStamp,
        nonceStr: nonceStr,
        package: pkg,
        signType: 'RSA',
        paySign: paySign
      };

      logger.info('生成小程序支付参数成功');
      return payParams;
    } catch (error: any) {
      logger.error('生成小程序支付参数失败:', error);
      throw error;
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(outTradeNo: string): Promise<any> {
    try {
      const wxpay = WechatPayConfig.getInstance();

      // 查询订单 - 使用商户订单号查询
      const result = await wxpay.query({
        out_trade_no: outTradeNo
      });

      logger.info('查询订单结果:', JSON.stringify(result, null, 2));

      if (result.status !== 200) {
        throw new Error(`查询订单失败: HTTP ${result.status}`);
      }

      return result.data;
    } catch (error) {
      logger.error('查询订单失败:', error);
      throw error;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo: string): Promise<boolean> {
    try {
      const wxpay = WechatPayConfig.getInstance();

      const result = await wxpay.close(outTradeNo);

      if (result.status !== 200 && result.status !== 204) {
        throw new Error(`关闭订单失败: HTTP ${result.status}`);
      }

      logger.info(`订单 ${outTradeNo} 已关闭`);
      return true;
    } catch (error) {
      logger.error('关闭订单失败:', error);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(
    outTradeNo: string,
    outRefundNo: string,
    totalAmount: number,
    refundAmount: number,
    reason?: string
  ): Promise<any> {
    try {
      const wxpay = WechatPayConfig.getInstance();

      const refundParams: any = {
        out_trade_no: outTradeNo,
        out_refund_no: outRefundNo,
        amount: {
          refund: refundAmount,
          total: totalAmount,
          currency: 'CNY'
        }
      };

      if (reason) {
        refundParams.reason = reason;
      }

      logger.info('申请退款:', refundParams);

      const result = await wxpay.refunds(refundParams);

      logger.info('退款申请响应:', JSON.stringify(result, null, 2));

      if (result.status !== 200) {
        throw new Error(`退款申请失败: HTTP ${result.status}`);
      }

      return result.data;
    } catch (error) {
      logger.error('申请退款失败:', error);
      throw error;
    }
  }

  /**
   * 解密支付回调通知
   */
  decryptPaymentCallback(resource: any): any {
    try {
      const { ciphertext, associated_data, nonce } = resource;
      const decrypted = WechatPayConfig.decryptCallbackData(
        ciphertext,
        associated_data,
        nonce
      );

      logger.info('解密支付回调成功:', decrypted);
      return decrypted;
    } catch (error) {
      logger.error('解密支付回调失败:', error);
      throw error;
    }
  }

  /**
   * 验证回调签名
   */
  async verifyCallbackSignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serial: string
  ): Promise<boolean> {
    return await WechatPayConfig.verifySignature(
      timestamp,
      nonce,
      body,
      signature,
      serial
    );
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default new PaymentService();
