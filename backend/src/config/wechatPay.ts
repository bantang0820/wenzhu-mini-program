import WxPay from 'wechatpay-node-v3';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

/**
 * 微信支付配置
 */
class WechatPayConfig {
  private static instance: WxPay | null = null;
  private static platformCerts: any[] = [];

  /**
   * 获取微信支付实例（单例模式）
   * 自动提取证书序列号
   */
  static getInstance(): WxPay {
    if (this.instance) {
      return this.instance;
    }

    try {
      const appId = process.env.WECHAT_APP_ID;
      const mchId = process.env.WECHAT_MCHID;
      const apiV3Key = process.env.WECHAT_APIV3_KEY;
      const certPath = process.env.WECHAT_CERT_PATH;
      const keyPath = process.env.WECHAT_KEY_PATH;

      if (!appId || !mchId || !apiV3Key || !certPath || !keyPath) {
        throw new Error('微信支付配置不完整，请检查环境变量');
      }

      // 读取证书内容
      const certContent = fs.readFileSync(path.resolve(certPath));
      const keyContent = fs.readFileSync(path.resolve(keyPath));

      // 初始化微信支付SDK
      // SDK会自动从证书中提取序列号
      this.instance = new WxPay({
        appid: appId,
        mchid: mchId,
        publicKey: certContent,
        privateKey: keyContent,
        key: apiV3Key, // APIv3密钥
      });

      logger.info('微信支付SDK初始化成功');
      return this.instance;
    } catch (error) {
      logger.error('微信支付SDK初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台证书列表
   * 用于验证支付回调
   * 注意：不依赖SDK缓存，每次都重新获取
   */
  static async getPlatformCertificates(): Promise<any[]> {
    try {
      const wxpay = this.getInstance();
      const apiV3Key = process.env.WECHAT_APIV3_KEY!;

      // 获取平台证书列表 - 返回直接是证书数组
      const certificates = await wxpay.get_certificates(apiV3Key);

      if (!certificates || certificates.length === 0) {
        logger.error('获取平台证书失败：响应数据格式错误');
        return [];
      }

      logger.info(`成功获取 ${certificates.length} 个平台证书`);

      // 缓存平台证书
      this.platformCerts = certificates;

      return certificates;
    } catch (error) {
      logger.error('获取平台证书失败:', error);
      throw error;
    }
  }

  /**
   * 验证支付回调签名
   */
  static async verifySignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serial: string
  ): Promise<boolean> {
    try {
      const wxpay = this.getInstance();
      const apiV3Key = process.env.WECHAT_APIV3_KEY!;

      // 使用SDK的verifySign方法验证签名
      // SDK会自动处理证书验证
      const isValid = await wxpay.verifySign({
        timestamp: timestamp,
        nonce: nonce,
        body: body,
        serial: serial,
        signature: signature,
        apiSecret: apiV3Key
      });

      return isValid;
    } catch (error) {
      logger.error('验证签名失败:', error);
      return false;
    }
  }

  /**
   * 解密回调数据
   */
  static decryptCallbackData(
    ciphertext: string,
    associated_data: string,
    nonce: string
  ): any {
    try {
      const wxpay = this.getInstance();
      const apiV3Key = process.env.WECHAT_APIV3_KEY!;

      // 解密数据
      const decrypted: any = wxpay.decipher_gcm(
        ciphertext,
        associated_data,
        nonce,
        apiV3Key
      );

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('解密回调数据失败:', error);
      throw error;
    }
  }
}

export default WechatPayConfig;
