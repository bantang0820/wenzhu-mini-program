// 用户相关类型
export interface User {
  id: number;
  openid: string;
  nickname: string;
  avatar_url: string;
  is_vip: number;
  vip_expire_time: Date | null;
  create_time: Date;
  last_login_time: Date;
  total_days: number;
  total_count: number;
  updated_at: Date;
}

export interface CreateUserData {
  openid: string;
  nickname?: string;
  avatar_url?: string;
}

// 会员相关类型
export interface Membership {
  id: number;
  user_id: number | null;
  openid: string;
  code: string;
  status: 'active' | 'inactive';
  type: string;
  start_date: Date;
  end_date: Date;
  create_time: Date;
}

// 兑换码相关类型
export interface RedeemCode {
  id: number;
  code: string;
  status: number; // 0=未使用, 1=已使用
  type: string;
  duration: number;
  used_by: string | null;
  used_time: Date | null;
  created_at: Date;
}

export type PaymentOrderStatus = 'pending' | 'paid' | 'closed' | 'refunded' | 'failed';

export interface PaymentOrder {
  id: number;
  order_no: string;
  user_id: number;
  openid: string;
  product_type: string;
  description: string;
  total_amount: number;
  duration_days: number;
  status: PaymentOrderStatus;
  prepay_id: string | null;
  transaction_id: string | null;
  vip_start_date: Date | null;
  vip_end_date: Date | null;
  paid_at: Date | null;
  wechat_payload: string | null;
  create_time: Date;
  update_time: Date;
}

// 反馈相关类型
export interface Feedback {
  id: number;
  user_id: number;
  openid: string;
  content: string;
  contact?: string;
  create_time: Date;
}

// 情绪日志类型
export interface EmotionLog {
  id: number;
  user_id: number;
  scenario_id: string;
  scenario_title: string;
  timestamp: Date;
  weekday: number;
  duration: number;
  mood_before: number;
  mood_after: number;
}

// 场景类型
export interface Scenario {
  id: string;
  title: string;
  category: string;
  modules: {
    module1: string[];
    module2: string[];
    module3: string[];
    module4: string[];
    module5: string[];
  };
  stabilize_text: string;
  mantras: string[];
  healing_quote: string;
  is_free: boolean;
  is_hero: boolean;
  order: number;
}

// 练习记录类型
export interface PracticeRecord {
  id: number;
  user_id: number;
  scenario_id: string;
  practice_date: string;
  energy: number;
  mood_before: number;
  mood_after: number;
  duration: number;
  created_at: Date;
}

// 专辑类型
export interface Album {
  id: string;
  title: string;
  subtitle: string;
  short_desc: string;
  icon: string;
  progress: number;
  color_start: string;
  color_end: string;
  tag: string;
  is_free: boolean;
  order: number;
}

// 章节类型
export interface Chapter {
  id: number;
  album_id: string;
  title: string;
  subtitle: string;
  completed_count: number;
  locked: boolean;
  order: number;
}

// 微信登录响应类型
export interface WechatLoginResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 情绪切片生成类型
export interface EmotionSliceRequest {
  scenario: string;
  mood: string;
  stormTime: Date;
  shiftTime: Date;
  anchorTime: Date;
}

export interface EmotionSliceResponse {
  success: boolean;
  data?: {
    stormText: string;
    shiftText: string;
    anchorText: string;
    timeStart: string;
    timeMid: string;
    timeEnd: string;
  };
  error?: string;
  fallback?: {
    stormText: string;
    shiftText: string;
    anchorText: string;
  };
}

// 每句复述反馈类型
export interface RetellFeedbackRequest {
  scenarioTitle: string;
  readingRound: number;
  totalRounds: number;
  mantraText: string;
  retellText: string;
}

export interface RetellFeedbackResponse {
  success: boolean;
  data?: {
    feedback: string;
  };
  error?: string;
  fallback?: {
    feedback: string;
  };
}

// 最终日记生成类型
export interface MindfulDiaryRequest {
  scenarioTitle: string;
  allMantras: string[];
  roundRetells: string[];
  finalState: string;
  finalStateLabel: string;
  stormTime: Date;
  shiftTime: Date;
  anchorTime: Date;
}

export interface MindfulDiaryResponse {
  success: boolean;
  data?: {
    diaryContent: string;
  };
  error?: string;
  fallback?: {
    diaryContent: string;
  };
}

// JWT Payload类型
export interface JwtPayload {
  userId: number;
  openid: string;
}

export interface AdminJwtPayload {
  username: string;
  role: 'admin';
}
