import { NextFunction, Request, Response } from 'express';
import { config } from '../config/app';
import { getClientIp } from '../utils/clientIp';

interface FailedLoginState {
  failedCount: number;
  firstFailedAt: number;
  blockedUntil: number;
}

const failedLoginAttempts = new Map<string, FailedLoginState>();

const getFreshState = (key: string, now: number): FailedLoginState | undefined => {
  const state = failedLoginAttempts.get(key);
  if (!state) return undefined;

  const windowExpired = now - state.firstFailedAt > config.security.adminLoginWindowMs;
  const blockExpired = state.blockedUntil > 0 && now >= state.blockedUntil;

  if (windowExpired && blockExpired) {
    failedLoginAttempts.delete(key);
    return undefined;
  }

  if (windowExpired && state.blockedUntil <= now) {
    failedLoginAttempts.delete(key);
    return undefined;
  }

  return state;
};

export const adminLoginRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const key = getClientIp(req);
  const now = Date.now();
  const state = getFreshState(key, now);

  if (state && state.blockedUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      success: false,
      error: `登录尝试过多，请 ${retryAfterSeconds} 秒后再试`
    });
    return;
  }

  res.on('finish', () => {
    if (res.statusCode < 400) {
      failedLoginAttempts.delete(key);
      return;
    }

    // 只统计账号密码错误，避免把参数校验/服务器错误也算入暴力尝试
    if (res.statusCode !== 401) return;

    const attemptTime = Date.now();
    const existing = getFreshState(key, attemptTime);
    const baseState: FailedLoginState = existing && attemptTime - existing.firstFailedAt <= config.security.adminLoginWindowMs
      ? existing
      : {
          failedCount: 0,
          firstFailedAt: attemptTime,
          blockedUntil: 0
        };

    baseState.failedCount += 1;

    if (baseState.failedCount >= config.security.adminLoginMaxFailures) {
      baseState.blockedUntil = attemptTime + config.security.adminLoginBlockMs;
    }

    failedLoginAttempts.set(key, baseState);
  });

  next();
};
