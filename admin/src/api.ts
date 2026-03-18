import { clearAdminToken, getAdminToken } from './auth';
import type {
  AdminProfile,
  ApiResponse,
  GenerateCodesPayload,
  GenerateCodesResult,
  LoginPayload,
  LoginResult,
  MemberItem,
  RedeemCodeItem,
  UpdateMembershipPayload,
  UpdateMembershipResult,
  UserItem
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.wenzhuyuer.com').replace(/\/$/, '');

const buildApiUrl = (path: string): string => `${API_BASE_URL}/api${path}`;

const redirectToLogin = (): void => {
  clearAdminToken();
  if (window.location.hash !== '#/login') {
    window.location.hash = '#/login';
  }
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers
  });

  const result = await response.json().catch(() => null) as ApiResponse<T> | null;

  if (response.status === 401) {
    redirectToLogin();
    throw new Error(result?.error || '登录已失效，请重新登录');
  }

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || result?.message || '请求失败');
  }

  return result.data as T;
};

export const adminLogin = (payload: LoginPayload): Promise<LoginResult> => {
  return request<LoginResult>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const fetchAdminProfile = (): Promise<AdminProfile> => {
  return request<AdminProfile>('/admin/profile');
};

export const fetchUsers = (keyword: string): Promise<UserItem[]> => {
  const query = new URLSearchParams();
  if (keyword.trim()) {
    query.set('keyword', keyword.trim());
  }

  return request<UserItem[]>(`/admin/users${query.toString() ? `?${query.toString()}` : ''}`);
};

export const fetchRedeemCodes = (used: 'all' | 'used' | 'unused'): Promise<RedeemCodeItem[]> => {
  const query = new URLSearchParams();
  if (used !== 'all') {
    query.set('used', used);
  }

  return request<RedeemCodeItem[]>(`/admin/redeem-codes${query.toString() ? `?${query.toString()}` : ''}`);
};

export const generateRedeemCodes = (
  payload: GenerateCodesPayload
): Promise<GenerateCodesResult> => {
  return request<GenerateCodesResult>('/admin/redeem-codes/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const fetchMembers = (keyword: string): Promise<MemberItem[]> => {
  const query = new URLSearchParams();
  if (keyword.trim()) {
    query.set('keyword', keyword.trim());
  }

  return request<MemberItem[]>(`/admin/members${query.toString() ? `?${query.toString()}` : ''}`);
};

export const updateMembership = (
  payload: UpdateMembershipPayload
): Promise<UpdateMembershipResult> => {
  return request<UpdateMembershipResult>('/admin/memberships/update', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};
