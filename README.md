# 正念家长 SOS 🌿

一个帮助家长在情绪失控时进行自我急救的极简微信小程序。

## 项目简介

当家长情绪崩溃时，打开小程序 → 选择触发场景 → 阅读正念金句 → 情绪平复。同时记录情绪数据，帮助家长建立情绪觉察能力。

### 核心理念

- **极简克制** - 用完即走，不占用用户时间
- **情绪急救** - 在崩溃边缘提供及时的心理干预
- **数据觉察** - 通过可视化数据帮助家长认识情绪规律

## 功能特性

### ✅ 已实现 (MVP v1.0)

- 📱 **场景网格首页** - 2列网格布局，展示情绪触发场景
- 🎯 **急救卡片页** - 全屏沉浸式阅读正念金句
- 💾 **情绪记录** - 自动记录每次急救的详细数据
- 🔒 **会员权限** - 免费用户可使用3个高频场景，付费解锁全部
- 📊 **觉察日记** - 付费用户可查看情绪统计数据（占位页面）

### 🚀 后续计划

- [ ] 会员订阅系统
- [ ] "队友求救"卡片分享功能
- [ ] Canvas图表绘制（替代占位数据）
- [ ] 50+ 场景内容库
- [ ] 情绪评分系统

## 技术栈

- **前端**: 微信小程序原生 (WXML, WXSS, JS)
- **后端**: 微信云开发
- **数据库**: 微信云数据库 (NoSQL)
- **云函数**: logEmotion (记录情绪日志)

## 项目结构

```
正念育儿小程序/
├── pages/                    # 页面目录
│   ├── index/               # 首页（场景网格）
│   ├── detail/              # 急救卡片详情页
│   └── journal/             # 觉察日记（数据统计）
├── cloudfunctions/          # 云函数目录
│   └── logEmotion/          # 记录情绪日志
├── database/                # 数据库初始化文件
│   ├── scenarios.json       # 场景库（12个示例）
│   ├── users.json          # 用户表结构
│   └── emotion_logs.json   # 情绪日志结构
├── utils/                   # 工具函数（待添加）
├── app.js                   # 小程序入口
├── app.json                 # 小程序配置
├── app.wxss                 # 全局样式（莫兰迪色系）
└── project.config.json     # 项目配置
```

## 快速开始

### 1. 准备工作

- 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号
- 开通微信云开发服务

### 2. 导入项目

1. 打开微信开发者工具
2. 选择 "导入项目"
3. 选择项目目录
4. 填写 AppID（测试号或正式号）
5. 点击 "导入"

### 3. 配置云开发

1. 在微信开发者工具中，点击 "云开发" 按钮
2. 开通云开发服务（如果未开通）
3. 在 `project.config.json` 中填入你的环境ID
4. 在 `app.js` 中修改 `env: 'your-env-id'` 为你的环境ID

### 4. 创建数据库集合

在云开发控制台创建以下集合并导入数据：

1. **scenarios** - 场景库
   - 导入 `database/scenarios.json`

2. **users** - 用户表
   - 参考结构 `database/users.json`

3. **emotion_logs** - 情绪日志
   - 参考结构 `database/emotion_logs.json`

### 5. 上传云函数

1. 右键 `cloudfunctions/logEmotion` 目录
2. 选择 "上传并部署：云端安装依赖"
3. 等待部署完成

### 6. 运行项目

点击"编译"按钮，即可在模拟器中查看效果。

## 数据库结构

### scenarios (场景库)

```json
{
  "id": "001",
  "title": "孩子磨蹭",
  "category": "焦虑",
  "content": "正念金句内容...",
  "is_free": true,
  "bg_color": "#E8DFDF",
  "order": 1
}
```

### emotion_logs (情绪日志)

```json
{
  "user_id": "用户OPENID",
  "scenario_id": "001",
  "scenario_title": "孩子磨蹭",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "weekday": 3,
  "duration": 15000
}
```

## UI 设计规范

### 莫兰迪色系

- 红色系: `#B5A8A8` / `#E8DFDF`
- 蓝色系: `#A8B5B5` / `#DFE8E8`
- 绿色系: `#B5C1AA` / `#E8F0E0`
- 黄色系: `#D4C8A8` / `#F0EBE0`
- 背景色: `#F5F3EF`

### 字体规范

- 主标题: 48rpx, 字重 600
- 正文: 32rpx, 字重 400
- 辅助文字: 28rpx, 字重 300
- 行高: 1.6 - 1.8

### 圆角规范

- 卡片: 24rpx
- 按钮: 40-60rpx
- 小元素: 8-16rpx

## 开发说明

### 本地开发模式

项目已内置模拟数据，即使未配置云数据库也可以运行：

- `pages/index/index.js` 中的 `loadMockScenarios()` 方法
- `pages/detail/detail.js` 中的 `loadMockScenario()` 方法

### 数据权限

记得在云开发控制台设置数据库权限：

- scenarios: 所有用户可读
- emotion_logs: 仅创建者可读写
- users: 仅创建者可读写

## 待办事项

- [ ] 配置真实的会员订阅系统
- [ ] 添加更多场景内容（目标50+）
- [ ] 实现Canvas图表绘制
- [ ] 添加情绪评分功能
- [ ] 开发"队友求救"分享功能
- [ ] 优化动画效果

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**做正念的家长，从觉察自己开始。** 🌸
