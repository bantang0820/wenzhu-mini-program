import { Request, Response } from 'express';
import { AppError } from '../middlewares/error';
import VirtualPaymentService from '../services/virtualPayment.service';
import PaymentOrderService from '../services/payment-order.service';
import WechatSessionService from '../services/wechatSession.service';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

function getVirtualPaymentProduct(productType: string) {
  const products = {
    annual: {
      type: 'annual',
      description: '稳住正念育儿年卡会员',
      totalAmount: 9900, // 99元（分）
      virtualProductId: 'wenzhu_vip_yearly' // 虚拟支付道具ID
    }
  };

  return products[productType as keyof typeof products];
}

/**
 * 虚拟支付控制器
 * 处理虚拟支付相关的HTTP请求
 */
export class VirtualPaymentController {
  private async syncDeliveredOrder(orderNo: string, wechatOrder: any): Promise<void> {
    const order = wechatOrder.order;

    await PaymentOrderService.syncPaidOrder(orderNo, {
      transactionId: order.wxpay_order_id || order.wx_order_id,
      paidAt: order.paid_time ? new Date(order.paid_time * 1000).toISOString() : undefined,
      wechatPayload: wechatOrder
    });
  }

  /**
   * 创建虚拟支付订单（生成签名数据供前端调用）
   * POST /api/virtual-payment/create
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const { productType, orderNo } = req.body;
      const openid = req.user?.openid;

      if (!openid || !orderNo) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        } as ApiResponse);
        return;
      }

      // 定义产品信息
      const product = getVirtualPaymentProduct(productType);
      if (!product) {
        res.status(400).json({
          success: false,
          error: '无效的产品类型'
        } as ApiResponse);
        return;
      }

      logger.info(`创建虚拟支付订单: ${orderNo}, 商品: ${product.type}, 用户: ${openid}`);

      // 在数据库中创建待支付订单
      await PaymentOrderService.createPendingOrder(orderNo, openid, product.type);

      const sessionKey = WechatSessionService.getSessionKey(openid);
      if (!sessionKey) {
        res.status(401).json({
          success: false,
          error: '登录态已过期，请重新登录后再发起支付'
        } as ApiResponse);
        return;
      }

      // 生成前端签名数据（env=1 表示沙箱环境）
      const env = process.env.NODE_ENV === 'production' ? 0 : 1;
      const mode: 'short_series_goods' = 'short_series_goods';
      const signData = VirtualPaymentService.generateFrontendSignData(
        product.virtualProductId, // 虚拟支付道具ID
        1, // 数量
        orderNo,
        env,
        openid,
        mode,
        product.totalAmount
      );

      const { paySig, signature } = VirtualPaymentService.generateFrontendSignatures(
        signData,
        env,
        sessionKey
      );

      res.json({
        success: true,
        data: {
          orderNo,
          productType: product.type,
          mode,
          signData,
          paySig,
          signature,
          env, // 环境：0-正式，1-沙箱
          offerId: process.env.OFFER_ID || '1450493122',
          appId: process.env.WECHAT_APP_ID || 'wxc271e812faa3f43b'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('创建虚拟支付订单失败:', error);
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof AppError ? error.message : '创建支付订单失败'
      } as ApiResponse);
    }
  }

  /**
   * 查询虚拟支付订单状态
   * POST /api/virtual-payment/query
   */
  async queryOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo } = req.body;
      const openid = req.user?.openid;

      if (!orderNo || !openid) {
        res.status(400).json({
          success: false,
          error: '缺少订单号'
        } as ApiResponse);
        return;
      }

      logger.info(`查询虚拟支付订单: ${orderNo}`);

      // 验证订单所有权
      let localOrder = await PaymentOrderService.assertOrderOwner(orderNo, openid);

      // 如果本地已支付，直接返回
      if (localOrder.status === 'paid') {
        res.json({
          success: true,
          data: {
            orderNo,
            isPaid: true,
            trade_state: 'SUCCESS',
            vipExpireTime: localOrder.vip_end_date
          }
        } as ApiResponse);
        return;
      }

      // 调用微信虚拟支付API查询订单状态
      const env = process.env.NODE_ENV === 'production' ? 0 : 1;
      const wechatOrder = await VirtualPaymentService.queryOrder({
        env,
        openid,
        order_id: orderNo
      });

      if (wechatOrder.errcode !== 0) {
        logger.error(`查询订单失败: ${wechatOrder.errcode} - ${wechatOrder.errmsg}`);
        res.json({
          success: true,
          data: {
            orderNo,
            isPaid: false,
            trade_state: 'NOTPAY',
            error: wechatOrder.errmsg
          }
        } as ApiResponse);
        return;
      }

      let latestWechatOrder = wechatOrder;
      let order = latestWechatOrder.order;

      // 沙箱调试时常见情况：用户已支付，但因为没走到发货回调，订单停在 2/3。
      // 对于会员这类虚拟商品，我们主动补一次发货完成，把订单推进到已发货。
      if (order.status === 2 || order.status === 3) {
        logger.info(`订单 ${orderNo} 已支付，尝试补发货完成，当前状态=${order.status}`);

        const provideResult = await VirtualPaymentService.notifyProvideGoods(orderNo, env);
        logger.info(`notify_provide_goods 响应: ${JSON.stringify(provideResult)}`);

        if (provideResult.errcode === 0) {
          latestWechatOrder = await VirtualPaymentService.queryOrder({
            env,
            openid,
            order_id: orderNo
          });

          if (latestWechatOrder.errcode === 0) {
            order = latestWechatOrder.order;
          }
        }
      }

      const isPaid = order.status === 4;

      // 如果已支付，更新本地订单状态
      if (isPaid) {
        await this.syncDeliveredOrder(orderNo, latestWechatOrder);
        localOrder = await PaymentOrderService.assertOrderOwner(orderNo, openid);
      }

      res.json({
        success: true,
        data: {
          orderNo,
          isPaid,
          trade_state: isPaid ? 'SUCCESS' : (order.paid_time ? 'USERPAYING' : 'NOTPAY'),
          transaction_id: order.wxpay_order_id,
          vipExpireTime: localOrder.vip_end_date,
          wechatOrder: order
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('查询虚拟支付订单失败:', error);
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof AppError ? error.message : '查询订单失败'
      } as ApiResponse);
    }
  }

  /**
   * 处理虚拟支付发货通知
   * POST /api/virtual-payment/notify
   * 注意：这是微信服务器主动调用的接口
   */
  async paymentNotify(req: Request, res: Response): Promise<void> {
    try {
      logger.info('收到虚拟支付发货通知');
      logger.info('通知内容:', JSON.stringify(req.body, null, 2));

      const {
        OpenId,
        OutTradeNo,
        Env,
        WeChatPayInfo,
        GoodsInfo
      } = req.body;

      if (!OutTradeNo || !OpenId) {
        logger.error('发货通知缺少必要参数');
        res.status(400).json({
          ErrCode: -1,
          ErrMsg: '缺少必要参数'
        });
        return;
      }

      // 查询订单验证
      const env = Env || 0;
      const wechatOrder = await VirtualPaymentService.queryOrder({
        env,
        openid: OpenId,
        order_id: OutTradeNo
      });

      if (wechatOrder.errcode === 0 && wechatOrder.order?.status === 4) {
        // 订单已发货，更新本地订单状态
        await PaymentOrderService.syncPaidOrder(OutTradeNo, {
          transactionId: WeChatPayInfo?.TransactionId || '',
          paidAt: WeChatPayInfo?.PaidTime
            ? new Date(WeChatPayInfo.PaidTime * 1000).toISOString()
            : new Date().toISOString(),
          wechatPayload: req.body
        });

        logger.info(`订单 ${OutTradeNo} 发货成功`);

        // 返回成功响应给微信
        res.json({
          ErrCode: 0,
          ErrMsg: 'success'
        });
        return;
      }

      logger.error(`订单 ${OutTradeNo} 发货失败，状态不正确`);

      res.json({
        ErrCode: -1,
        ErrMsg: '订单状态异常'
      });
    } catch (error) {
      logger.error('处理虚拟支付发货通知失败:', error);
      res.status(500).json({
        ErrCode: -1,
        ErrMsg: '处理失败'
      });
    }
  }

  /**
   * 申请退款
   * POST /api/virtual-payment/refund
   */
  async refund(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo, refundReason } = req.body;
      const openid = req.user?.openid;

      if (!orderNo || !openid) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        } as ApiResponse);
        return;
      }

      logger.info(`申请虚拟支付退款: 订单${orderNo}, 用户${openid}`);

      // 验证订单所有权并获取订单信息
      const order = await PaymentOrderService.assertOrderOwner(orderNo, openid);

      if (order.status !== 'paid') {
        res.status(400).json({
          success: false,
          error: '只能退款已支付的订单'
        } as ApiResponse);
        return;
      }

      // 生成退款单号
      const refundNo = `RF${Date.now()}${Math.floor(Math.random() * 10000)}`;

      // 调用退款接口
      const env = process.env.NODE_ENV === 'production' ? 0 : 1;
      const refundResult = await VirtualPaymentService.refundOrder(
        openid,
        orderNo,
        refundNo,
        order.total_amount || 9900, // 订单总金额（分）
        order.total_amount || 9900, // 退款金额（分），这里全额退款
        env,
        '',
        refundReason || 0,
        '2'
      );

      if (refundResult.errcode !== 0) {
        throw new Error(refundResult.errmsg || '退款失败');
      }

      // 更新本地订单状态
      await PaymentOrderService.markOrderRefunded(orderNo, refundResult);

      res.json({
        success: true,
        data: {
          refundNo,
          message: '退款申请已提交'
        }
      } as ApiResponse);
    } catch (error) {
      logger.error('申请虚拟支付退款失败:', error);
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof AppError ? error.message : '申请退款失败'
      } as ApiResponse);
    }
  }

}

export default new VirtualPaymentController();
