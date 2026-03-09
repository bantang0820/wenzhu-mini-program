import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// 验证中间件工厂函数
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);

    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }

    next();
  };
};

// 常用验证规则
export const validationSchemas = {
  // 用户登录
  wechatLogin: Joi.object({
    code: Joi.string().required().messages({
      'string.empty': '微信登录码不能为空',
      'any.required': '缺少微信登录码'
    })
  }),

  // 保存用户信息
  saveUserInfo: Joi.object({
    openid: Joi.string().required().messages({
      'string.empty': 'OpenID不能为空',
      'any.required': '缺少OpenID'
    }),
    userInfo: Joi.object({
      nickName: Joi.string().allow(''),
      avatarUrl: Joi.string().allow('')
    }).required()
  }),

  // 同步用户信息
  syncUserProfile: Joi.object({
    userInfo: Joi.object({
      nickname: Joi.string().allow(''),
      avatarUrl: Joi.string().allow('')
    }).required()
  }),

  // 检查会员状态
  checkMembership: Joi.object({
    openid: Joi.string().required()
  }),

  // 兑换会员码
  redeemMembership: Joi.object({
    code: Joi.string().length(12).required().messages({
      'string.length': '兑换码必须是12位',
      'any.required': '缺少兑换码'
    })
  }),

  // 生成情绪切片
  generateEmotionSlice: Joi.object({
    scenario: Joi.string().required(),
    mood: Joi.string().required(),
    stormTime: Joi.date().required(),
    shiftTime: Joi.date().required(),
    anchorTime: Joi.date().required()
  }),

  // 每句复述反馈
  generateRetellFeedback: Joi.object({
    scenarioTitle: Joi.string().required(),
    readingRound: Joi.number().integer().min(1).max(5).required(),
    totalRounds: Joi.number().integer().min(1).max(10).required(),
    mantraText: Joi.string().allow('').max(3000),
    retellText: Joi.string().min(1).max(3000).required()
  }),

  // 生成正念日记
  generateMindfulDiary: Joi.object({
    scenarioTitle: Joi.string().required(),
    allMantras: Joi.array().items(Joi.string()).required(),
    roundRetells: Joi.array().items(Joi.string().allow('')).required(),
    finalState: Joi.string().required(),
    finalStateLabel: Joi.string().required(),
    stormTime: Joi.date().required(),
    shiftTime: Joi.date().required(),
    anchorTime: Joi.date().required()
  }),

  // 提交反馈
  submitFeedback: Joi.object({
    content: Joi.string().min(1).max(1000).required().messages({
      'string.min': '反馈内容至少1个字符',
      'string.max': '反馈内容不能超过1000个字符',
      'any.required': '缺少反馈内容'
    }),
    contact: Joi.string().allow('').max(100)
  }),

  // 创建支付订单
  createPayment: Joi.object({
    openid: Joi.string().required().messages({
      'string.empty': 'OpenID不能为空',
      'any.required': '缺少OpenID'
    }),
    description: Joi.string().min(1).max(127).required().messages({
      'string.min': '商品描述至少1个字符',
      'string.max': '商品描述不能超过127个字符',
      'any.required': '缺少商品描述'
    }),
    totalAmount: Joi.number().integer().min(1).required().messages({
      'number.min': '金额必须大于0',
      'any.required': '缺少金额'
    }),
    orderNo: Joi.string().min(1).max(32).required().messages({
      'string.min': '订单号至少1个字符',
      'string.max': '订单号不能超过32个字符',
      'any.required': '缺少订单号'
    })
  }),

  // 查询订单
  queryOrder: Joi.object({
    orderNo: Joi.string().required().messages({
      'string.empty': '订单号不能为空',
      'any.required': '缺少订单号'
    })
  }),

  // 关闭订单
  closeOrder: Joi.object({
    orderNo: Joi.string().required().messages({
      'string.empty': '订单号不能为空',
      'any.required': '缺少订单号'
    })
  }),

  // 申请退款
  refund: Joi.object({
    orderNo: Joi.string().required().messages({
      'string.empty': '订单号不能为空',
      'any.required': '缺少订单号'
    }),
    refundNo: Joi.string().required().messages({
      'string.empty': '退款单号不能为空',
      'any.required': '缺少退款单号'
    }),
    totalAmount: Joi.number().integer().min(1).required().messages({
      'number.min': '订单金额必须大于0',
      'any.required': '缺少订单金额'
    }),
    refundAmount: Joi.number().integer().min(1).required().messages({
      'number.min': '退款金额必须大于0',
      'any.required': '缺少退款金额'
    }),
    reason: Joi.string().allow('').max(127)
  })
};
