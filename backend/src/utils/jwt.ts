import jwt from 'jsonwebtoken';
import { config } from '../config/app';
import { JwtPayload } from '../types';

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
