const app = getApp();

Page({
  data: {
    isPro: false
  },

  onLoad() {
    this.setData({
      isPro: app.globalData.isMember
    });
  },

  onPayTap() {
    wx.vibrateShort({ type: 'medium' });
    
    wx.showModal({
      title: '关于付费',
      content: '当前为演示版本，暂不支持微信支付。您可以返回个人中心，使用“兑换码”功能开启 Pro 权益。',
      confirmText: '去兑换',
      confirmColor: '#D4AF37',
      cancelText: '知道了',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  },

  onBack() {
    wx.navigateBack();
  }
});
