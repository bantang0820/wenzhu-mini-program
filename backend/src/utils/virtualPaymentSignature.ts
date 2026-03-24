import * as crypto from 'crypto';

/**
 * 微信虚拟支付签名工具
 * 文档参考: https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html#2-4-签名详解
 */

function normalizeSignData(signData: Record<string, any> | string): string {
  return typeof signData === 'string' ? signData : JSON.stringify(signData);
}

/**
 * 计算支付签名
 * @param appKey AppKey（沙箱或现网）
 * @param signData 需要签名的数据对象
 * @param uri API路径，如 /xpay/query_user_balance
 * @returns 签名字符串
 */
export function generatePaySignature(
  appKey: string,
  signData: Record<string, any> | string,
  uri: string
): string {
  const signDataStr = normalizeSignData(signData);
  const fullStr = `${uri}&${signDataStr}`;

  // 微信文档要求返回十六进制小写字符串
  const hmac = crypto.createHmac('sha256', appKey);
  hmac.update(fullStr, 'utf8');
  const signature = hmac.digest('hex');

  return signature;
}

/**
 * 计算用户态签名
 * @param sessionKey 用户的session_key
 * @param signData 需要签名的数据对象
 * @returns 签名字符串
 */
export function generateUserSignature(
  sessionKey: string,
  signData: Record<string, any> | string
): string {
  const signDataStr = normalizeSignData(signData);

  const hmac = crypto.createHmac('sha256', sessionKey);
  hmac.update(signDataStr, 'utf8');
  const signature = hmac.digest('hex');

  return signature;
}

/**
 * 验证签名（用于调试，生产环境一般不需要）
 * @param signature 原签名
 * @param key 密钥（AppKey或session_key）
 * @param signData 签名数据
 * @param uri API路径（用户态签名不需要）
 * @param signatureType 签名类型：'pay' | 'user'
 * @returns 是否匹配
 */
export function verifySignature(
  signature: string,
  key: string,
  signData: Record<string, any> | string,
  uri: string = '',
  signatureType: 'pay' | 'user' = 'pay'
): boolean {
  let computedSignature: string;

  if (signatureType === 'pay') {
    computedSignature = generatePaySignature(key, signData, uri);
  } else {
    computedSignature = generateUserSignature(key, signData);
  }

  return signature.trim() === computedSignature.trim();
}

/**
 * 获取环境对应的AppKey
 * @param env 环境类型：0-正式环境，1-沙箱环境
 * @returns AppKey
 */
export function getAppKey(env: number): string {
  // 从环境变量或配置中读取AppKey
  const SANDBOX_APP_KEY = process.env.SANDBOX_APP_KEY || 'j2Nrg8CpesXNJIYQn6GXhdB3q4TP7cbf';
  const PROD_APP_KEY = process.env.PROD_APP_KEY || 'BkB08LlSGyk00Txvqyz2LSx3PFutcLsO';

  return env === 1 ? SANDBOX_APP_KEY : PROD_APP_KEY;
}

/**
 * 获取OfferId
 * @returns OfferId
 */
export function getOfferId(): string {
  return process.env.OFFER_ID || '1450493122';
}

/**
 * 获取AppId
 * @returns AppId
 */
export function getAppId(): string {
  return process.env.WECHAT_APP_ID || 'wxc271e812faa3f43b';
}
