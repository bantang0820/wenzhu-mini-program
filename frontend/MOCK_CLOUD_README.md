# 微信云开发模拟系统使用说明

## 概述

本项目已完成微信云开发的剥离工作，使用本地 Mock 数据层替代云开发环境。所有业务逻辑保持不变，所有页面和交互都使用模拟数据。

## 已完成的修改

### 1. 创建的核心文件

#### `utils/mockData.js`
Mock 数据管理模块，负责：
- 模拟用户数据
- 模拟会员数据
- 模拟兑换码数据
- 数据的本地存储管理

#### `utils/mockCloud.js`
微信云开发 SDK 模拟层，实现：
- `wx.cloud.init()` - 云开发初始化
- `wx.cloud.callFunction()` - 云函数调用
- `wx.cloud.database()` - 数据库操作
- `wx.cloud.getWXContext()` - 微信上下文

### 2. 模拟的云函数

| 云函数名称 | 功能说明 |
|----------|---------|
| `login` | 获取用户 OpenID |
| `saveUserInfo` | 保存/更新用户信息 |
| `syncUserProfile` | 同步用户信息（注册/登录） |
| `checkMembership` | 检查会员状态 |
| `getMembershipInfo` | 获取会员详细信息 |
| `redeemMembership` | 兑换会员码 |
| `generateEmotionalSlice` | 生成情绪切片（使用默认文案） |

### 3. 模拟的数据库集合

| 集合名称 | 功能说明 |
|---------|---------|
| `users` | 用户表 |
| `memberships` | 会员记录表 |
| `redeem_codes` | 兑换码表 |
| `feedbacks` | 反馈表 |

## 默认配置

### 默认用户
```javascript
{
  openid: 'mock_openid_12345678',
  nickname: '正念家长',
  is_vip: false,  // 默认不是会员
  vip_expire_time: null
}
```

### 可用的测试兑换码
- `DEMO12345678` - 演示用兑换码（兑换365天会员）
- `TEST87654321` - 测试用兑换码（兑换365天会员）

## 使用方法

### 正常使用
无需任何修改，直接在小程序开发工具中运行即可。系统会自动使用模拟云开发环境。

### 测试会员功能
1. 启动小程序
2. 进入「个人中心」
3. 点击「兑换中心」
4. 输入测试兑换码：`DEMO12345678`
5. 即可获得365天会员权限

### 重置数据
如需重置所有 mock 数据，在控制台执行：
```javascript
const mockData = require('./utils/mockData.js');
mockData.resetMockData();
```

## 数据存储

所有 mock 数据存储在本地 Storage 中：
- `mock_user` - 用户数据
- `mock_memberships` - 会员数据
- `mock_redeem_codes` - 兑换码数据
- `mock_feedbacks` - 反馈数据

其他业务数据保持原有存储位置：
- `openid` - 用户 OpenID
- `checkInMap` - 打卡记录
- `totalDays` - 总打卡天数
- `totalCount` - 总打卡次数
- `energyData` - 能量数据
- 等等...

## 云函数调用示例

### 登录
```javascript
const res = await wx.cloud.callFunction({
  name: 'login'
});
// 返回: { result: { openid: 'mock_openid_12345678' } }
```

### 同步用户信息
```javascript
const res = await wx.cloud.callFunction({
  name: 'syncUserProfile',
  data: { userInfo: { nickname: '正念家长', avatarUrl: '' } }
});
// 返回: { result: { success: true, user: {...} } }
```

### 检查会员状态
```javascript
const res = await wx.cloud.callFunction({
  name: 'checkMembership',
  data: { openid: 'mock_openid_12345678' }
});
// 返回: { result: { isMember: true/false } }
```

### 兑换会员码
```javascript
const res = await wx.cloud.callFunction({
  name: 'redeemMembership',
  data: { code: 'DEMO12345678' }
});
// 返回: { result: { success: true, expireDate: '2026.03.02' } }
```

### 数据库操作
```javascript
const db = wx.cloud.database();

// 添加反馈
await db.collection('feedbacks').add({
  data: {
    content: '测试反馈',
    contact: 'test@example.com',
    createTime: new Date()
  }
});

// 查询反馈
const res = await db.collection('feedbacks').where({}).get();
```

## 页面功能验证

### ✅ 已验证的页面
- [x] 登录页 (`pages/login/login`)
- [x] 首页 (`pages/index/index`)
- [x] 个人中心 (`pages/profile/profile`)
- [x] 会员页 (`pages/pro/pro`)
- [x] 详情页 (`pages/detail/detail`)
- [x] 统计页 (`pages/stats/stats`)
- [x] 日记页 (`pages/journal/journal`)
- [x] 卡片页 (`pages/card/card`)

### 核心功能测试
1. **用户登录**
   - 使用一键登录功能
   - 自动获取 mock OpenID
   - 自动创建 mock 用户

2. **会员系统**
   - 兑换码功能正常
   - 会员状态检查正常
   - 付费场景拦截正常
   - 免费场景可正常访问

3. **情绪练习**
   - 场景选择正常
   - 5轮朗读功能正常
   - 能量累积正常
   - 打卡记录正常

4. **数据统计**
   - 日历打卡显示正常
   - 能量统计正常
   - 勋章系统正常

## 注意事项

### 1. 云函数延迟
所有云函数调用都有模拟的 300-500ms 网络延迟，以真实模拟网络请求。

### 2. 数据持久化
所有 mock 数据保存在本地 Storage 中，清除缓存会丢失数据。

### 3. 兑换码限制
- 每个兑换码只能使用一次
- 兑换码不区分大小写
- 使用后会被标记为已使用

### 4. 会员时间计算
- 新用户兑换：从当前时间开始计算365天
- 续费用户：在原有过期时间基础上累加365天

## 恢复真实云开发

如需恢复真实云开发环境，只需修改 `app.js`：

```javascript
// app.js
App({
  onLaunch() {
    // 1. 注释掉 mock 引入
    // const mockCloud = require('./utils/mockCloud.js');

    // 2. 恢复真实云开发初始化
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true,
      });
    }

    // ...
  }
});
```

## 技术实现细节

### Mock Cloud 类结构
```
MockCloud
├── init()              // 初始化
├── callFunction()      // 云函数调用
├── database()          // 获取数据库实例
├── getWXContext()      // 获取微信上下文
└── [云函数实现]
    ├── _login()
    ├── _saveUserInfo()
    ├── _syncUserProfile()
    ├── _checkMembership()
    ├── _getMembershipInfo()
    ├── _redeemMembership()
    └── _generateEmotionalSlice()
```

### Mock Database 类结构
```
MockDatabase
├── collection()        // 获取集合
├── serverDate()        // 服务器时间
└── command             // 数据库命令

MockCollection
├── where()             // 查询条件
├── limit()             // 限制数量
├── skip()              // 跳过数量
├── orderBy()           // 排序
├── get()               // 获取数据
├── add()               // 添加数据
├── update()            // 更新数据
└── remove()            // 删除数据
```

## 开发建议

1. **调试模式**
   - 打开调试控制台查看 `[MockCloud]` 日志
   - 所有云函数调用都会打印详细日志

2. **数据测试**
   - 使用 `resetMockData()` 重置数据
   - 使用测试兑换码快速开通会员

3. **功能验证**
   - 按照页面功能验证列表逐项测试
   - 确保所有交互逻辑正常

## 更新日志

### 2025-03-02
- ✅ 完成云开发剥离
- ✅ 创建 Mock 数据层
- ✅ 实现所有云函数模拟
- ✅ 实现数据库操作模拟
- ✅ 验证所有页面功能

## 联系方式

如有问题或建议，请联系开发团队。
