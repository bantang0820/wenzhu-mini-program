# 稳住小程序 - 后端服务

基于 Node.js + TypeScript + Express + MySQL 的稳住小程序后端API服务。

## 技术栈

- **运行环境**: Node.js
- **开发语言**: TypeScript
- **Web框架**: Express.js
- **数据库**: MySQL 8.0
- **认证**: JWT
- **第三方API**:
  - 微信小程序登录 API
  - DeepSeek AI API (情绪文案生成)

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── app.ts       # 应用配置
│   │   └── database.ts  # 数据库配置
│   ├── controllers/     # 控制器层
│   ├── services/        # 业务逻辑层
│   ├── routes/          # 路由配置
│   ├── middlewares/     # 中间件
│   ├── types/           # TypeScript类型定义
│   ├── utils/           # 工具函数
│   ├── database/        # 数据库脚本
│   │   ├── migrate.ts   # 数据库迁移
│   │   └── seed.ts      # 种子数据
│   └── server.ts        # 服务入口
├── logs/                # 日志目录
├── .env                 # 环境变量
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件，配置以下变量：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=mindful_parenting

# 微信小程序配置
WECHAT_APP_ID=wxc271e812faa3f43b
WECHAT_APP_SECRET=3e098c09e000867b29ff95b12d5867f5

# JWT配置
JWT_SECRET=请替换为32位以上随机字符串
JWT_EXPIRES_IN=30d

# 管理员配置（必填）
ADMIN_USERNAME=请替换管理员账号
ADMIN_PASSWORD=请替换12位以上强密码
ADMIN_JWT_SECRET=请替换为32位以上随机字符串
ADMIN_JWT_EXPIRES_IN=12h

# 管理员登录安全策略（可选）
ADMIN_LOGIN_MAX_FAILURES=5
ADMIN_LOGIN_WINDOW_MS=600000
ADMIN_LOGIN_BLOCK_MS=1800000

# 如果服务在反向代理（Nginx/Caddy）后，建议开启
TRUST_PROXY=true

# DeepSeek AI配置（可选）
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 3. 创建数据库

确保MySQL服务正在运行，然后运行数据库迁移：

```bash
# 创建数据库表
npm run migrate

# 插入种子数据（可选）
npm run seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. 构建生产版本

```bash
npm run build
npm start
```

## 安全应急（管理员泄露）

如果怀疑管理员地址/凭据泄露，可以先在服务器执行：

```bash
npm run security:rotate-admin
```

脚本会自动：
- 备份当前 `.env`
- 轮换 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_JWT_SECRET`
- 轮换 `JWT_SECRET`（立即使旧 token 失效）
- 设置管理员登录限流相关环境变量
- 提示你新的管理员账号密码

## API 接口文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token

### 接口列表

#### 认证相关

- `POST /api/auth/wechat-login` - 微信一键登录
- `POST /api/auth/save-user-info` - 保存用户信息
- `POST /api/auth/sync-profile` - 同步用户信息 (需要认证)
- `GET /api/auth/user-info` - 获取用户信息 (需要认证)

#### 会员相关

- `POST /api/membership/check` - 检查会员状态
- `POST /api/membership/info` - 获取会员详细信息
- `POST /api/membership/redeem` - 兑换会员码 (需要认证)

#### 场景相关

- `GET /api/scenarios` - 获取所有场景
- `GET /api/scenarios/:id` - 获取场景详情
- `POST /api/scenarios/check-access` - 检查场景访问权限 (需要认证)
- `POST /api/scenarios/practice` - 记录练习 (需要认证)
- `POST /api/scenarios/emotion-log` - 记录情绪日志 (需要认证)
- `GET /api/scenarios/calendar` - 获取打卡日历 (需要认证)
- `GET /api/scenarios/statistics` - 获取用户统计信息 (需要认证)

#### AI相关

- `POST /api/ai/emotion-slice` - 生成情绪切片文案 (需要认证)

#### 反馈相关

- `POST /api/feedbacks` - 提交反馈 (需要认证)
- `GET /api/feedbacks` - 获取反馈列表 (需要认证)

#### 课程相关

- `GET /api/albums` - 获取所有专辑
- `GET /api/albums/:id` - 获取专辑详情
- `GET /api/albums/:id/chapters` - 获取专辑章节列表 (可选认证)
- `GET /api/chapters/:chapterId` - 获取章节详情 (需要认证)
- `POST /api/chapters/:chapterId/complete` - 标记章节完成 (需要认证)
- `GET /api/courses/progress` - 获取学习进度 (需要认证)

## 数据库表结构

### users (用户表)
- id: 用户ID
- openid: 微信OpenID (唯一)
- nickname: 用户昵称
- avatar_url: 头像URL
- is_vip: 是否为会员
- vip_expire_time: 会员过期时间
- create_time: 注册时间
- last_login_time: 最后登录时间
- total_days: 累计打卡天数
- total_count: 累计打卡次数

### memberships (会员记录表)
- id: 记录ID
- user_id: 用户ID
- status: 会员状态 (active/inactive)
- type: 会员类型
- start_date: 开始时间
- end_date: 过期时间

### redeem_codes (兑换码表)
- id: 兑换码ID
- code: 兑换码 (12位，唯一)
- status: 状态 (0=未使用, 1=已使用)
- type: 兑换类型
- duration: 天数
- used_by: 使用者openid
- used_time: 使用时间

### scenarios (场景表)
- id: 场景ID
- title: 场景标题
- category: 分类
- modules: 模块文案 (JSON)
- stabilize_text: 稳住引导语
- mantras: 金句数组 (JSON)
- healing_quote: 治愈的话
- is_free: 是否免费
- is_hero: 是否高频场景
- order: 排序

### practice_records (练习记录表)
- id: 记录ID
- user_id: 用户ID
- scenario_id: 场景ID
- practice_date: 练习日期
- energy: 获得的能量
- mood_before: 练习前心情
- mood_after: 练习后心情
- duration: 停留时长(毫秒)

### emotion_logs (情绪日志表)
- id: 日志ID
- user_id: 用户ID
- scenario_id: 场景ID
- scenario_title: 场景标题
- timestamp: 时间戳
- weekday: 星期几
- duration: 停留时长
- mood_before: 练习前心情
- mood_after: 练习后心情

### albums (专辑表)
- id: 专辑ID
- title: 专辑标题
- subtitle: 副标题
- short_desc: 简短描述
- icon: 图标emoji
- progress: 进度
- color_start: 渐变起始色
- color_end: 渐变结束色
- tag: 标签
- is_free: 是否免费
- order: 排序

### chapters (章节表)
- id: 章节ID
- album_id: 专辑ID
- title: 章节标题
- subtitle: 副标题
- content: 章节内容
- completed_count: 已完成微课数
- locked: 是否锁定
- order: 排序

### learning_progress (学习进度表)
- id: 进度ID
- user_id: 用户ID
- chapter_id: 章节ID
- completed: 是否完成
- completed_at: 完成时间

### feedbacks (反馈表)
- id: 反馈ID
- user_id: 用户ID
- openid: 用户OpenID
- content: 反馈内容
- contact: 联系方式
- create_time: 创建时间

## 测试兑换码

以下是预设的测试兑换码（有效期365天）：

- TEST20260001
- TEST20260002
- TEST20260003
- DEMO20260001
- DEMO20260002

## 开发注意事项

1. **环境变量**: 生产环境请修改 `.env` 中的敏感配置
2. **JWT密钥**: 生产环境必须使用强密钥
3. **数据库密码**: 生产环境使用强密码
4. **日志**: 日志文件存储在 `logs/` 目录
5. **错误处理**: 所有API返回统一的 `{ success, data/error }` 格式

## 故障排除

### 数据库连接失败
- 检查MySQL服务是否运行
- 检查 `.env` 中的数据库配置是否正确
- 确保数据库 `mindful_parenting` 已创建

### 微信登录失败
- 检查 `.env` 中的微信小程序配置
- 确保微信小程序已正确配置服务器域名

### AI生成失败
- DeepSeek API Key为可选项，未配置时会使用兜底文案
- 检查API Key是否有效

## 许可证

MIT
