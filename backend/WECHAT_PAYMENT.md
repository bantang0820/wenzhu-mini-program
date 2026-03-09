# 微信支付JSAPI对接说明

## 已完成的配置

### 1. 安装依赖
```bash
npm install wechatpay-node-v3@2.1.8
```

### 2. 环境变量配置
已在 `backend/.env` 中添加以下配置：

```env
# 微信支付配置
WECHAT_MCHID=1106921980
WECHAT_APIV3_KEY=8Zk3Pq7Xt2Rf5Sv9Bn4Hg6Mj1Lc8Dw2Y
WECHAT_CERT_PATH=./certs/apiclient_cert.pem
WECHAT_KEY_PATH=./certs/apiclient_key.pem
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/callback
```

**重要提醒**：请将 `WECHAT_NOTIFY_URL` 修改为你的实际服务器域名！

### 3. 文件结构

```
backend/src/
├── config/
│   └── wechatPay.ts          # 微信支付配置（自动提取证书序列号）
├── services/
│   └── payment.service.ts    # 支付服务（下单、查询、退款等）
├── controllers/
│   └── payment.controller.ts # 支付控制器（HTTP接口）
├── middlewares/
│   └── validate.ts           # 已添加支付相关验证规则
└── routes/
    └── index.ts              # 已添加支付路由
```

## API接口说明

### 1. 生成订单号
```
GET /api/payment/generate-order-no
需要认证: 是
```

响应：
```json
{
  "success": true,
  "data": {
    "orderNo": "20260309123456123456"
  }
}
```

### 2. 创建支付订单
```
POST /api/payment/create
需要认证: 是

请求体:
{
  "openid": "用户openid",
  "description": "商品描述",
  "totalAmount": 100,  // 单位：分
  "orderNo": "订单号"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "prepayId": "wx...",
    "payParams": {
      "timeStamp": "1234567890",
      "nonceStr": "abc123",
      "package": "prepay_id=wx...",
      "signType": "RSA",
      "paySign": "签名"
    },
    "orderNo": "订单号"
  }
}
```

### 3. 查询订单
```
POST /api/payment/query
需要认证: 是

请求体:
{
  "orderNo": "订单号"
}
```

### 4. 关闭订单
```
POST /api/payment/close
需要认证: 是

请求体:
{
  "orderNo": "订单号"
}
```

### 5. 支付回调通知
```
POST /api/payment/callback
需要认证: 否（微信直接调用）
```

**注意**：此接口需要配置在微信公众平台，确保微信可以访问到。

### 6. 申请退款
```
POST /api/payment/refund
需要认证: 是

请求体:
{
  "orderNo": "订单号",
  "refundNo": "退款单号",
  "totalAmount": 100,  // 订单总金额（分）
  "refundAmount": 100, // 退款金额（分）
  "reason": "退款原因（可选）"
}
```

## 小程序端调用示例

```javascript
// 1. 生成订单号
const orderRes = await wx.request({
  url: 'https://your-domain.com/api/payment/generate-order-no',
  method: 'GET',
  header: {
    'Authorization': 'Bearer ' + token
  }
});
const orderNo = orderRes.data.data.orderNo;

// 2. 创建支付订单
const payRes = await wx.request({
  url: 'https://your-domain.com/api/payment/create',
  method: 'POST',
  data: {
    openid: '用户openid',
    description: '稳住会员-月度会员',
    totalAmount: 9900, // 99元（单位：分）
    orderNo: orderNo
  },
  header: {
    'Authorization': 'Bearer ' + token
  }
});

// 3. 调起微信支付
const payParams = payRes.data.data.payParams;
wx.requestPayment({
  timeStamp: payParams.timeStamp,
  nonceStr: payParams.nonceStr,
  package: payParams.package,
  signType: payParams.signType,
  paySign: payParams.paySign,
  success: (res) => {
    console.log('支付成功', res);
  },
  fail: (err) => {
    console.error('支付失败', err);
  }
});
```

## 支付回调处理

在 `backend/src/controllers/payment.controller.ts` 的 `paymentCallback` 方法中，你需要根据业务需求添加处理逻辑：

```typescript
// TODO: 根据业务逻辑处理支付成功后的操作
if (trade_state === 'SUCCESS') {
  // 1. 更新数据库订单状态
  // 2. 开通会员
  // 3. 发送通知等
}
```

## 测试建议

### 1. 本地测试
使用微信支付沙箱环境进行测试：
- 沙箱文档: https://pay.weixin.qq.com/wiki/doc/apiv3/open/pay/chapter2_8_1.shtml

### 2. 生产环境检查清单
- [ ] 修改 `WECHAT_NOTIFY_URL` 为实际域名
- [ ] 确保服务器可以公网访问
- [ ] 在微信公众平台配置支付回调URL
- [ ] 测试支付流程（小额测试）
- [ ] 测试退款流程
- [ ] 测试回调处理逻辑

## 注意事项

1. **金额单位**：所有金额单位都是"分"，需要在前端进行转换（元×100=分）

2. **证书序列号**：SDK会自动从证书中提取，无需手动配置

3. **签名验证**：支付回调会自动验证签名，确保请求来自微信

4. **回调重复推送**：微信可能会重复推送回调，需要确保业务逻辑的幂等性

5. **订单号唯一性**：确保每个订单号都是唯一的

6. **错误处理**：所有支付相关的错误都会记录在日志中，方便排查问题

## 常见问题

### Q1: 提示"签名验证失败"
A: 检查APIv3密钥是否正确，确保证书文件路径正确

### Q2: 支付成功但没有收到回调
A:
1. 检查回调URL是否可公网访问
2. 检查服务器防火墙配置
3. 在微信商户平台查看回调记录

### Q3: 小程序调起支付失败
A:
1. 确认小程序已开通支付功能
2. 检查appid和商户号是否匹配
3. 确认用户openid正确

## 日志位置
支付相关日志会输出到 `backend/logs/` 目录，文件名为 `combined-日期.log` 和 `error-日期.log`
