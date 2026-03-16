import pool from '../config/database';
import { getPaymentProduct } from '../config/paymentProducts';
import { AppError } from '../middlewares/error';
import { PaymentOrder, PaymentOrderStatus, User } from '../types';
import logger from '../utils/logger';

type SyncPaidOrderInput = {
  transactionId?: string;
  paidAt?: string | Date | null;
  wechatPayload?: unknown;
};

export class PaymentOrderService {
  async createPendingOrder(orderNo: string, openid: string, productType: string = 'annual'): Promise<PaymentOrder> {
    const connection = await pool.getConnection();
    const product = getPaymentProduct(productType);

    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        'SELECT * FROM payment_orders WHERE order_no = ? FOR UPDATE',
        [orderNo]
      );

      const existingOrders = existingRows as PaymentOrder[];
      if (existingOrders.length > 0) {
        throw new AppError('订单号已存在，请重试', 409);
      }

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE openid = ? FOR UPDATE',
        [openid]
      );

      const users = userRows as User[];
      if (users.length === 0) {
        throw new AppError('用户不存在', 404);
      }

      const user = users[0];

      await connection.execute(
        `INSERT INTO payment_orders (
          order_no,
          user_id,
          openid,
          product_type,
          description,
          total_amount,
          duration_days,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderNo,
          user.id,
          openid,
          product.type,
          product.description,
          product.totalAmount,
          product.durationDays
        ]
      );

      await connection.commit();

      const createdOrder = await this.getOrderByOrderNo(orderNo);
      if (!createdOrder) {
        throw new AppError('创建支付订单失败');
      }

      return createdOrder;
    } catch (error) {
      await connection.rollback();

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('创建本地支付订单失败:', error);
      throw new AppError('创建支付订单失败');
    } finally {
      connection.release();
    }
  }

  async getOrderByOrderNo(orderNo: string): Promise<PaymentOrder | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM payment_orders WHERE order_no = ? LIMIT 1',
      [orderNo]
    );

    const orders = rows as PaymentOrder[];
    return orders.length > 0 ? orders[0] : null;
  }

  async updatePrepayInfo(orderNo: string, prepayId: string, wechatPayload?: unknown): Promise<void> {
    await pool.execute(
      `UPDATE payment_orders
       SET prepay_id = ?, wechat_payload = ?
       WHERE order_no = ?`,
      [prepayId, this.stringifyPayload(wechatPayload), orderNo]
    );
  }

  async markOrderFailed(orderNo: string, wechatPayload?: unknown): Promise<void> {
    await pool.execute(
      `UPDATE payment_orders
       SET status = 'failed', wechat_payload = ?
       WHERE order_no = ? AND status = 'pending'`,
      [this.stringifyPayload(wechatPayload), orderNo]
    );
  }

  async markOrderClosed(orderNo: string, wechatPayload?: unknown): Promise<void> {
    await pool.execute(
      `UPDATE payment_orders
       SET status = 'closed', wechat_payload = ?
       WHERE order_no = ? AND status IN ('pending', 'failed')`,
      [this.stringifyPayload(wechatPayload), orderNo]
    );
  }

  async markOrderRefunded(orderNo: string, wechatPayload?: unknown): Promise<void> {
    await pool.execute(
      `UPDATE payment_orders
       SET status = 'refunded', wechat_payload = ?
       WHERE order_no = ? AND status = 'paid'`,
      [this.stringifyPayload(wechatPayload), orderNo]
    );
  }

  async syncPaidOrder(orderNo: string, input: SyncPaidOrderInput = {}): Promise<PaymentOrder> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderRows] = await connection.execute(
        'SELECT * FROM payment_orders WHERE order_no = ? FOR UPDATE',
        [orderNo]
      );

      const orders = orderRows as PaymentOrder[];
      if (orders.length === 0) {
        throw new AppError('订单不存在', 404);
      }

      const order = orders[0];

      if (order.status === 'paid') {
        await connection.execute(
          `UPDATE payment_orders
           SET transaction_id = COALESCE(?, transaction_id),
               wechat_payload = COALESCE(?, wechat_payload)
           WHERE id = ?`,
          [input.transactionId || null, this.stringifyPayload(input.wechatPayload), order.id]
        );
        await connection.commit();

        const latestPaidOrder = await this.getOrderByOrderNo(orderNo);
        if (!latestPaidOrder) {
          throw new AppError('支付订单不存在', 404);
        }

        return latestPaidOrder;
      }

      const [userRows] = await connection.execute(
        'SELECT * FROM users WHERE id = ? FOR UPDATE',
        [order.user_id]
      );

      const users = userRows as User[];
      if (users.length === 0) {
        throw new AppError('用户不存在', 404);
      }

      const user = users[0];
      const now = input.paidAt ? new Date(input.paidAt) : new Date();
      const currentExpireTime = user.vip_expire_time ? new Date(user.vip_expire_time) : null;
      const isCurrentVip = user.is_vip === 1 && currentExpireTime !== null && currentExpireTime > now;
      const startDate = isCurrentVip && currentExpireTime ? currentExpireTime : now;
      const endDate = new Date(startDate);

      endDate.setDate(endDate.getDate() + order.duration_days);

      await connection.execute(
        `UPDATE users
         SET is_vip = 1, vip_expire_time = ?
         WHERE id = ?`,
        [endDate, user.id]
      );

      await connection.execute(
        `UPDATE memberships
         SET status = 'inactive'
         WHERE user_id = ? AND status = 'active'`,
        [user.id]
      );

      await connection.execute(
        `INSERT INTO memberships (user_id, openid, code, status, type, start_date, end_date)
         VALUES (?, ?, '', 'active', ?, ?, ?)`,
        [user.id, user.openid, `payment_${order.product_type}`, startDate, endDate]
      );

      await connection.execute(
        `UPDATE payment_orders
         SET status = 'paid',
             transaction_id = COALESCE(?, transaction_id),
             paid_at = COALESCE(?, NOW()),
             vip_start_date = ?,
             vip_end_date = ?,
             wechat_payload = ?
         WHERE id = ?`,
        [
          input.transactionId || null,
          input.paidAt ? new Date(input.paidAt) : null,
          startDate,
          endDate,
          this.stringifyPayload(input.wechatPayload),
          order.id
        ]
      );

      await connection.commit();

      const latestOrder = await this.getOrderByOrderNo(orderNo);
      if (!latestOrder) {
        throw new AppError('支付订单不存在', 404);
      }

      return latestOrder;
    } catch (error) {
      await connection.rollback();

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('同步支付成功状态失败:', error);
      throw new AppError('同步支付状态失败');
    } finally {
      connection.release();
    }
  }

  async syncFromWechatOrder(orderNo: string, wechatOrder: any): Promise<PaymentOrder | null> {
    const tradeState = wechatOrder?.trade_state;

    if (tradeState === 'SUCCESS') {
      return this.syncPaidOrder(orderNo, {
        transactionId: wechatOrder.transaction_id,
        paidAt: wechatOrder.success_time || null,
        wechatPayload: wechatOrder
      });
    }

    if (tradeState === 'CLOSED' || tradeState === 'REVOKED') {
      await this.markOrderClosed(orderNo, wechatOrder);
    } else if (tradeState === 'PAYERROR') {
      await this.markOrderFailed(orderNo, wechatOrder);
    } else if (tradeState === 'REFUND') {
      await this.markOrderRefunded(orderNo, wechatOrder);
    }

    return this.getOrderByOrderNo(orderNo);
  }

  async assertOrderOwner(orderNo: string, openid: string): Promise<PaymentOrder> {
    const order = await this.getOrderByOrderNo(orderNo);

    if (!order) {
      throw new AppError('订单不存在', 404);
    }

    if (order.openid !== openid) {
      throw new AppError('无权访问该订单', 403);
    }

    return order;
  }

  private stringifyPayload(payload?: unknown): string | null {
    if (payload === undefined) {
      return null;
    }

    try {
      return JSON.stringify(payload);
    } catch (error) {
      logger.warn('序列化支付回包失败:', error);
      return null;
    }
  }
}

export default new PaymentOrderService();
