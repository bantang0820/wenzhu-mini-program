import { Router } from 'express';
import authController from '../controllers/auth.controller';
import membershipController from '../controllers/membership.controller';
import scenarioController from '../controllers/scenario.controller';
import aiController from '../controllers/ai.controller';
import feedbackController from '../controllers/feedback.controller';
import courseController from '../controllers/course.controller';
import shareController from '../controllers/share.controller';
import paymentController from '../controllers/payment.controller';
import { authMiddleware, optionalAuth } from '../middlewares/auth';
import { validate, validationSchemas } from '../middlewares/validate';

const router = Router();

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: '稳住小程序后端服务运行正常' });
});

// ========== 认证相关 ==========
// 微信一键登录
router.post('/auth/wechat-login', validate(validationSchemas.wechatLogin), authController.wechatLogin);

// 保存用户信息
router.post('/auth/save-user-info', validate(validationSchemas.saveUserInfo), authController.saveUserInfo);

// 同步用户信息（需要认证）
router.post('/auth/sync-profile', authMiddleware, authController.syncUserProfile);

// 获取用户信息（需要认证）
router.get('/auth/user-info', authMiddleware, authController.getUserInfo);

// ========== 会员相关 ==========
// 检查会员状态
router.post('/membership/check', validate(validationSchemas.checkMembership), membershipController.checkMembership);

// 获取会员详细信息
router.post('/membership/info', validate(validationSchemas.checkMembership), membershipController.getMembershipInfo);

// 兑换会员码（需要认证）
router.post('/membership/redeem', authMiddleware, validate(validationSchemas.redeemMembership), membershipController.redeemMembership);

// ========== 场景相关 ==========
// 获取所有场景
router.get('/scenarios', scenarioController.getAllScenarios);

// 获取打卡日历（需要认证）- 必须在 /:id 之前
router.get('/scenarios/calendar', authMiddleware, scenarioController.getCheckInCalendar);

// 获取用户统计信息（需要认证）- 必须在 /:id 之前
router.get('/scenarios/statistics', authMiddleware, scenarioController.getUserStatistics);

// 获取用户核心统计信息（需要认证）- 必须在 /:id 之前
router.get('/scenarios/core-statistics', authMiddleware, scenarioController.getUserCoreStatistics);

// 获取场景详情 - 必须放在最后，因为 :id 会匹配任何路径
router.get('/scenarios/:id', scenarioController.getScenarioById);

// 检查场景访问权限（需要认证）
router.post('/scenarios/check-access', authMiddleware, scenarioController.checkScenarioAccess);

// 记录练习（需要认证）
router.post('/scenarios/practice', authMiddleware, scenarioController.recordPractice);

// 记录情绪日志（需要认证）
router.post('/scenarios/emotion-log', authMiddleware, scenarioController.logEmotion);

// ========== AI相关 ==========
// 生成情绪切片文案（需要认证）
router.post('/ai/emotion-slice', authMiddleware, validate(validationSchemas.generateEmotionSlice), aiController.generateEmotionSlice);

// 每句复述反馈（无强制登录，便于练习流畅使用）
router.post('/ai/retell-feedback', validate(validationSchemas.generateRetellFeedback), aiController.generateRetellFeedback);

// 生成正念育儿日记（无强制登录，便于练习流畅使用）
router.post('/ai/mindful-diary', validate(validationSchemas.generateMindfulDiary), aiController.generateMindfulDiary);

// ========== 反馈相关 ==========
// 提交反馈（需要认证）
router.post('/feedbacks', authMiddleware, validate(validationSchemas.submitFeedback), feedbackController.submitFeedback);

// 获取反馈列表（管理员功能，需要认证）
router.get('/feedbacks', authMiddleware, feedbackController.getFeedbackList);

// ========== 课程相关 ==========
// 获取所有专辑
router.get('/albums', courseController.getAllAlbums);

// 获取专辑详情
router.get('/albums/:id', courseController.getAlbumById);

// 获取专辑的章节列表（可选认证）
router.get('/albums/:id/chapters', optionalAuth, courseController.getAlbumChapters);

// 获取章节详情（需要认证）
router.get('/chapters/:chapterId', authMiddleware, courseController.getChapterById);

// 标记章节为已完成（需要认证）
router.post('/chapters/:chapterId/complete', authMiddleware, courseController.markChapterComplete);

// 获取用户的学习进度（需要认证）
router.get('/courses/progress', authMiddleware, courseController.getUserProgress);

// ========== 分享相关 ==========
// 检查练习状态（需要认证）
router.get('/share/check-status', authMiddleware, shareController.checkPracticeStatus);

// 记录分享并解锁（需要认证）
router.post('/share/record', authMiddleware, shareController.recordShare);

// 处理好友通过分享链接进入（需要认证）
router.post('/share/handle-invite', authMiddleware, shareController.handleInviteShare);

// 消耗练习次数（需要认证）
router.post('/share/consume', authMiddleware, shareController.consumePractice);

// ========== 支付相关 ==========
// 生成订单号（需要认证）
router.get('/payment/generate-order-no', authMiddleware, paymentController.generateOrderNo);

// 创建支付订单（需要认证）
router.post('/payment/create', authMiddleware, validate(validationSchemas.createPayment), paymentController.createPayment);

// 查询订单（需要认证）
router.post('/payment/query', authMiddleware, validate(validationSchemas.queryOrder), paymentController.queryOrder);

// 关闭订单（需要认证）
router.post('/payment/close', authMiddleware, validate(validationSchemas.closeOrder), paymentController.closeOrder);

// 支付回调通知（不需要认证，微信直接调用）
router.post('/payment/callback', paymentController.paymentCallback);

// 申请退款（需要认证）
router.post('/payment/refund', authMiddleware, validate(validationSchemas.refund), paymentController.refund);

export default router;
