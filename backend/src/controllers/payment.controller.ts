import { Request, Response } from 'express';
import PaymentService from '../services/payment.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * 支付控制器
 */
export class PaymentController {
  /**
   * 创建支付订单
   * POST /api/payment/create
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const { openid, description, totalAmount, orderNo } = req.body;

      // 参数验证
      if (!openid || !description || !totalAmount || !orderNo) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        } as ApiResponse);
        return;
      }

      // 金额验证（单位：分）
      if (totalAmount <= 0) {
        res.status(400).json({
          success: false,
          error: '金额必须大于0'
        } as ApiResponse);
        return;
      }

      logger.info(`创建支付订单: ${orderNo}, 金额: ${totalAmount}分, 用户: ${openid}`);

      // 创建JSAPI支付订单
      const orderResult = await PaymentService.createJsapiOrder(
        openid,
        description,
        totalAmount,
        orderNo
      );

      if (orderResult.errorCode) {
        res.json({
          success: false,
          error: orderResult.errorMsg
        } as ApiResponse);
        return;
      }

      // 生成小程序支付参数
      const payParams = await PaymentService.getMiniPayParams(
        orderResult.prepayId!
      );

      res.json({
        success: true,
        data: {
          prepayId: orderResult.prepayId,
          payParams: payParams,
          orderNo: orderNo
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('创建支付订单失败:', error);
      res.status(500).json({
        success: false,
        error: '创建支付订单失败'
      } as ApiResponse);
    }
  }

  /**
   * 查询订单
   * POST /api/payment/query
   */
  async queryOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo } = req.body;

      if (!orderNo) {
        res.status(400).json({
          success: false,
          error: '缺少订单号'
        } as ApiResponse);
        return;
      }

      logger.info(`查询订单: ${orderNo}`);

      const orderData = await PaymentService.queryOrder(orderNo);

      res.json({
        success: true,
        data: orderData
      } as ApiResponse);
    } catch (error) {
      logger.error('查询订单失败:', error);
      res.status(500).json({
        success: false,
        error: '查询订单失败'
      } as ApiResponse);
    }
  }

  /**
   * 关闭订单
   * POST /api/payment/close
   */
  async closeOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo } = req.body;

      if (!orderNo) {
        res.status(400).json({
          success: false,
          error: '缺少订单号'
        } as ApiResponse);
        return;
      }

      logger.info(`关闭订单: ${orderNo}`);

      await PaymentService.closeOrder(orderNo);

      res.json({
        success: true,
        data: {
          message: '订单已关闭'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('关闭订单失败:', error);
      res.status(500).json({
        success: false,
        error: '关闭订单失败'
      } as ApiResponse);
    }
  }

  /**
   * 支付回调通知
   * POST /api/payment/callback
   */
  async paymentCallback(req: Request, res: Response): Promise<void> {
    try {
      // 获取微信支付传递的参数
      const timestamp = req.header('Wechatpay-Timestamp');
      const nonce = req.header('Wechatpay-Nonce');
      const signature = req.header('Wechatpay-Signature');
      const serial = req.header('Wechatpay-Serial');

      logger.info('收到支付回调通知');

      if (!timestamp || !nonce || !signature || !serial) {
        logger.error('支付回调缺少必要的头部参数');
        res.status(400).json({
          code: 'FAIL',
          message: '缺少必要的头部参数'
        });
        return;
      }

      // 获取请求体
      const body = JSON.stringify(req.body);

      // 验证签名
      const isValid = await PaymentService.verifyCallbackSignature(
        timestamp,
        nonce,
        body,
        signature,
        serial
      );

      if (!isValid) {
        logger.error('支付回调签名验证失败');
        res.status(401).json({
          code: 'FAIL',
          message: '签名验证失败'
        });
        return;
      }

      // 解密回调数据
      const resource = req.body.resource;
      if (!resource) {
        logger.error('支付回调缺少resource字段');
        res.status(400).json({
          code: 'FAIL',
          message: '缺少resource字段'
        });
        return;
      }

      const decryptedData = PaymentService.decryptPaymentCallback(resource);

      logger.info('支付回调解密数据:', JSON.stringify(decryptedData, null, 2));

      // TODO: 根据业务逻辑处理支付成功后的操作
      // 例如：更新订单状态、开通会员等
      const { out_trade_no, trade_state, transaction_id, amount } = decryptedData;

      if (trade_state === 'SUCCESS') {
        logger.info(`订单 ${out_trade_no} 支付成功，交易流水号: ${transaction_id}，金额: ${amount.total}分`);

        // TODO: 在这里添加你的业务逻辑
        // 1. 更新数据库订单状态
        // 2. 开通会员
        // 3. 发送通知等
      }

      // 返回成功响应（必须返回200状态码和指定格式）
      res.json({
        code: 'SUCCESS',
        message: '处理成功'
      });
    } catch (error) {
      logger.error('处理支付回调失败:', error);
      // 即使处理失败，也要返回200，否则微信会重复推送
      res.json({
        code: 'FAIL',
        message: '处理失败'
      });
    }
  }

  /**
   * 申请退款
   * POST /api/payment/refund
   */
  async refund(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo, refundNo, totalAmount, refundAmount, reason } = req.body;

      // 参数验证
      if (!orderNo || !refundNo || !totalAmount || !refundAmount) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        } as ApiResponse);
        return;
      }

      // 金额验证
      if (refundAmount > totalAmount) {
        res.status(400).json({
          success: false,
          error: '退款金额不能超过订单金额'
        } as ApiResponse);
        return;
      }

      logger.info(`申请退款: 订单${orderNo}, 退款金额${refundAmount}分`);

      const refundResult = await PaymentService.refund(
        orderNo,
        refundNo,
        totalAmount,
        refundAmount,
        reason
      );

      res.json({
        success: true,
        data: refundResult
      } as ApiResponse);
    } catch (error) {
      logger.error('申请退款失败:', error);
      res.status(500).json({
        success: false,
        error: '申请退款失败'
      } as ApiResponse);
    }
  }

  /**
   * 生成订单号
   * GET /api/payment/generate-order-no
   */
  async generateOrderNo(req: Request, res: Response): Promise<void> {
    try {
      // 生成格式: YYYYMMDDHHmmss + 6位随机数
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const orderNo = timestamp + random;

      res.json({
        success: true,
        data: {
          orderNo: orderNo
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('生成订单号失败:', error);
      res.status(500).json({
        success: false,
        error: '生成订单号失败'
      } as ApiResponse);
    }
  }
}

export default new PaymentController();
