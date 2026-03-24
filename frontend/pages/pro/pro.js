const api = require('../../utils/api.js');
const virtualPayment = require('../../utils/virtualPayment.js');
const app = getApp();

const ANNUAL_PRODUCT_TYPE = 'annual';

Page({
  data: {
    isPro: false,
    loading: false
  },

  onLoad() {
    console.log('=== Pro 页面 onLoad ===');
    console.log('当前文件: frontend/pages/pro/pro.js (新版支付)');

    // 🔴 测试模式：强制显示支付按钮（测试完成后改回原代码）
    this.setData({
      isPro: false  // 强制设为false，显示支付按钮
    });

    // 正式代码（测试完成后用这个）：
    // this.setData({
    //   isPro: !!app.globalData.isMember
    // });
  },

  // 立即开通 - 调用虚拟支付
  async onPayTap() {
    console.log('=== onPayTap 被调用 ===');
    wx.vibrateShort({ type: 'medium' });

    const openid = wx.getStorageSync('openid');
    const token = wx.getStorageSync('token');
    console.log('当前 openid:', openid);

    if (!openid || !token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 400);
      return;
    }

    this.setData({ loading: true });

    try {
      wx.showLoading({ title: '创建订单...' });

      // 1. 生成订单号
      const orderRes = await api.get('/payment/generate-order-no', null, true);
      if (!orderRes.success) {
        throw new Error('生成订单号失败');
      }

      const orderNo = orderRes.data.orderNo;
      console.log('订单号:', orderNo);

      // 2. 调用云函数获取虚拟支付签名
      const signRes = await wx.cloud.callFunction({
        name: 'getVirtualPaymentSign',
        data: {
          orderNo: orderNo,
          productId: 'wenzhu_coin_100',     // ⚠️ 改为代币ID（需要在后台配置）
          quantity: 100,                    // 购买100个代币
          mode: 'short_series_coin',        // ⚠️ 使用代币充值模式
          env: 1 // 沙箱环境测试
        }
      });

      wx.hideLoading();

      console.log('云函数完整返回:', signRes);
      console.log('云函数result:', signRes.result);

      if (!signRes.result || !signRes.result.success) {
        throw new Error(signRes.result?.error || '获取支付签名失败');
      }

      const { signData, paySig, mode } = signRes.result.data;
      console.log('=== 调试信息 ===');
      console.log('解构后的 signData:', signData);
      console.log('解构后的 paySig:', paySig);
      console.log('支付模式:', mode);
      console.log('paySig 类型:', typeof paySig);
      console.log('paySig 长度:', paySig ? paySig.length : 'undefined');

      // 3. 调起虚拟支付
      if (!paySig || typeof paySig !== 'string') {
        console.error('❌ paySig 无效，无法调起支付');
        wx.showModal({
          title: '调试信息',
          content: `paySig: ${paySig}, 类型: ${typeof paySig}`,
          showCancel: false
        });
        return;
      }

      wx.requestVirtualPayment({
        mode: mode || 'short_series_coin',   // 使用代币充值模式
        env: signData.env,                  // 环境配置
        signData: JSON.stringify(signData), // signData必须是JSON字符串
        paySig: paySig,                     // 支付签名（由云函数生成）
        signature: paySig,                  // ⚠️ 用户态签名（沙箱环境可使用相同值）
        success: () => {
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });

          setTimeout(() => {
            this.checkPaymentStatus(orderNo, 0);
          }, 1200);
        },
        fail: (err) => {
          console.error('虚拟支付失败:', err);
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({
              title: '已取消支付',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      });

    } catch (error) {
      wx.hideLoading();
      console.error('支付流程错误:', error);
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查支付状态
  async checkPaymentStatus(orderNo, attempt = 0) {
    try {
      // 使用云函数查询虚拟支付订单
      const res = await wx.cloud.callFunction({
        name: 'queryVirtualPaymentOrder',
        data: {
          orderNo: orderNo,
          env: 1 // 沙箱环境
        }
      });

      const result = res.result;

      if (result.success && (result.data.trade_state === 'SUCCESS' || result.data.isPaid)) {
        const token = wx.getStorageSync('token');
        const openid = wx.getStorageSync('openid');
        const cachedUser = wx.getStorageSync('userInfo') || app.globalData.userInfo || {};
        const vipExpireTime = res.data.vipExpireTime;

        // TODO: 需要调用后端API或云函数来更新用户会员状态
        // 这里暂时只更新本地状态
        app.globalData.isMember = true;
        if (cachedUser) {
          cachedUser.isVip = true;
          cachedUser.vip_expire_time = vipExpireTime;
        }

        if (typeof app.setAuthSession === 'function') {
          app.setAuthSession({
            token,
            openid,
            user: {
              ...cachedUser,
              openid,
              isVip: true,
              vipExpireTime
            }
          });
        }

        // 调用后端API同步会员状态
        try {
          await api.post('/auth/sync-profile', {}, true);
        } catch (syncError) {
          console.warn('支付成功后刷新会员状态失败', syncError);
        }

        this.setData({
          isPro: true
        });

        let modalContent = '恭喜您成为稳住Pro会员！';

        if (vipExpireTime) {
          const expireDate = new Date(vipExpireTime);
          const year = expireDate.getFullYear();
          const month = String(expireDate.getMonth() + 1).padStart(2, '0');
          const day = String(expireDate.getDate()).padStart(2, '0');
          modalContent = `恭喜您成为稳住Pro会员！\n有效期至：${year}.${month}.${day}`;
        }

        wx.showModal({
          title: '开通成功',
          content: modalContent,
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        });
        return;
      }

      if (attempt < 9) {
        setTimeout(() => {
          this.checkPaymentStatus(orderNo, attempt + 1);
        }, 1800);
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);

      if (attempt < 9) {
        setTimeout(() => {
          this.checkPaymentStatus(orderNo, attempt + 1);
        }, 1800);
      } else {
        wx.showModal({
          title: '支付结果确认中',
          content: '款项已提交，如果没有自动跳转，请稍后到个人中心查看会员状态。',
          showCancel: false,
          success: () => {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        });
      }
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
