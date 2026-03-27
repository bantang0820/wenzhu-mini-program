import jwt from 'jsonwebtoken';
import { config } from '../config/app';
import { AdminJwtPayload, JwtPayload } from '../types';

/**
 * 生成JWT token
 * @param payload token负载
 * @returns token字符串
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(
    payload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
};

/**
 * 验证JWT token
 * @param token token字符串
 * @returns 解码后的payload
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

/**
 * 生成管理员JWT token
 * @param payload 管理员token负载
 * @returns token字符串
 */
export const generateAdminToken = (payload: AdminJwtPayload): string => {
  return jwt.sign(
    payload,
    config.admin.jwtSecret,
    { expiresIn: config.admin.tokenExpiresIn } as jwt.SignOptions
  );
};

/**
 * 验证管理员JWT token
 * @param token token字符串
 * @returns 解码后的payload
 */
export const verifyAdminToken = (token: string): AdminJwtPayload => {
  return jwt.verify(token, config.admin.jwtSecret) as AdminJwtPayload;
};
