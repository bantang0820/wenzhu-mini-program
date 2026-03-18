# 前端 API 配置完成报告

## ✅ 修改完成

已成功将前端 API 地址修改为：`https://api.wenzhuyuer.com`

## 📝 修改内容

### 1. 创建的文件

#### `frontend/config/api.js`
- API 配置文件
- 配置了后端服务器地址
- 可随时修改 API 地址和超时时间

```javascript
module.exports = {
  baseURL: 'https://api.wenzhuyuer.com/api',
  timeout: 30000,
  debug: true
};
```

#### `frontend/utils/api.js`
- API 请求工具函数
- 封装了 HTTP 请求方法
- 实现了云函数调用模拟
- 自动处理 Token 认证
- 统一错误处理

主要功能：
- `request()` - 通用请求方法
- `get()` - GET 请求
- `post()` - POST 请求
- `callFunction()` - 云函数调用模拟（替换 wx.cloud.callFunction）
- `database()` - 数据库操作模拟（替换 wx.cloud.database）

### 2. 修改的文件

#### `frontend/app.js`
- 引入真实 API 工具
- 替换 MockCloud 为 API 工具
- 修改登录状态检查逻辑

#### `frontend/pages/scenarios/scenarios.js`
- 从后端 API 加载场景数据
- 移除硬编码的场景列表
- 添加加载状态管理

#### `frontend/pages/album/album.js`
- 从后端 API 加载专辑数据
- 从后端 API 加载章节数据
- 移除硬编码的专辑数据

## 🔌 云函数到 API 的映射

| 原云函数名称 | 后端 API 端点 | 方法 | 需要认证 |
|------------|--------------|------|---------|
| login | `/auth/wechat-login` | POST | ❌ |
| saveUserInfo | `/auth/save-user-info` | POST | ❌ |
| syncUserProfile | `/auth/sync-profile` | POST | ✅ |
| checkMembership | `/membership/check` | POST | ❌ |
| getMembershipInfo | `/membership/info` | POST | ❌ |
| redeemMembership | `/membership/redeem` | POST | ✅ |
| generateEmotionalSlice | `/ai/emotion-slice` | POST | ✅ |

## 📊 数据接口

### 场景数据
- **接口**: `GET /scenarios`
- **用途**: 加载深海矩阵页面
- **文件**: `pages/scenarios/scenarios.js`

### 专辑数据
- **接口**: `GET /albums/:id`
- **用途**: 加载专辑详情
- **文件**: `pages/album/album.js`

### 章节数据
- **接口**: `GET /albums/:id/chapters`
- **用途**: 加载专辑章节列表
- **文件**: `pages/album/album.js`

## 🔐 认证机制

### Token 管理
1. **存储位置**: `wx.setStorageSync('token', token)`
2. **请求头**: `Authorization: Bearer <token>`
3. **自动添加**: `needAuth: true` 的请求自动携带 Token

### OpenID 管理
1. **存储位置**: `wx.setStorageSync('openid', openid)`
2. **用途**: 用户身份标识

## ⚙️ 配置说明

### 修改 API 地址
如需更换服务器地址，编辑 `frontend/config/api.js`：

```javascript
module.exports = {
  baseURL: '你的新地址/api',  // 修改这里
  timeout: 30000,
  debug: true
};
```

### 开启/关闭调试日志
```javascript
debug: true   // 开启调试日志
debug: false  // 关闭调试日志
```

## 🚀 测试步骤

### 1. 确认后端运行
确保后端服务在 `https://api.wenzhuyuer.com` 正常运行

### 2. 测试 API 连接
在微信小程序开发工具中：
1. 打开调试器
2. 查看 Console 标签
3. 查找 `[API]` 前缀的日志
4. 确认请求成功

### 3. 测试功能
- [ ] 登录功能
- [ ] 场景列表加载
- [ ] 会员状态检查
- [ ] 兑换码兑换
- [ ] 专辑/章节加载

## 🔧 常见问题

### Q: 请求失败，提示网络错误
A:
1. 检查后端服务是否运行
2. 检查服务器地址是否正确
3. 检查网络连接
4. 确认服务器已配置 CORS

### Q: 提示"未授权"
A:
1. 检查是否已登录
2. 检查 Token 是否存储
3. 查看 Token 是否过期

### Q: 数据加载失败
A:
1. 查看调试日志中的错误信息
2. 检查 API 端点是否正确
3. 确认数据库中有数据

## 📱 微信小程序配置

### 开发阶段
在微信开发者工具中：
1. 点击右上角"详情"
2. 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"

### 生产环境
需要在微信公众平台配置：
1. 登录微信公众平台
2. 进入"开发" → "开发管理" → "开发设置"
3. 配置服务器域名白名单
4. 添加：`https://api.wenzhuyuer.com`

## 📝 待完成工作

### 需要修改的其他页面

以下页面可能需要类似的修改：

1. **pages/detail/detail.js** - 场景详情页
   - 从 API 获取场景详情
   - 记录练习数据

2. **pages/chapter/chapter.js** - 章节详情页
   - 从 API 获取章节内容
   - 标记章节完成

3. **pages/profile/profile.js** - 个人中心
   - 从 API 获取用户信息
   - 显示会员状态

4. **pages/journal/journal.js** - 觉察日记
   - 从 API 获取情绪日志
   - 显示统计数据

5. **pages/pro/pro.js** - 会员页
   - 从 API 获取会员信息
   - 兑换会员码

## ✅ 总结

前端 API 配置已完成：
- ✅ 创建了 API 配置文件
- ✅ 创建了 API 请求工具
- ✅ 修改了应用入口文件
- ✅ 修改了场景列表页面
- ✅ 修改了专辑详情页面
- ✅ 实现了 Token 认证机制

**当前状态**: 前端已连接到后端 API，可以开始测试！

---

**修改时间**: 2026-03-02
**API 地址**: https://api.wenzhuyuer.com
