export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AdminProfile {
  username: string;
}

export interface UserItem {
  id: number;
  nickname: string;
  openid: string;
  is_member: number;
  vip_expire_time: string | null;
  create_time: string;
  last_login_time: string;
}

export interface RedeemCodeItem {
  id: number;
  code: string;
  status: number;
  type: string;
  duration: number;
  used_by: string | null;
  used_time: string | null;
  created_at: string;
}

export interface MemberItem {
  id: number;
  nickname: string;
  openid: string;
  vip_expire_time: string;
  last_login_time: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  username: string;
}

export interface GenerateCodesPayload {
  count: number;
  type: string;
  duration: number;
}

export interface GenerateCodesResult {
  codes: string[];
}

export interface UpdateMembershipPayload {
  userId: number;
  duration: number;
  action: 'grant' | 'extend';
  type?: string;
}

export interface UpdateMembershipResult {
  userId: number;
  nickname: string;
  openid: string;
  endDate: string;
  isExtended: boolean;
}
