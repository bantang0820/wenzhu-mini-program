import { Request } from 'express';
import { config } from '../config/app';

export const getClientIp = (req: Request): string => {
  if (config.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};
