interface WechatSessionItem {
  sessionKey: string;
  expiresAt: number;
}

const DEFAULT_SESSION_TTL_SECONDS = 7200;
const REFRESH_BUFFER_SECONDS = 300;

class WechatSessionService {
  private sessionMap = new Map<string, WechatSessionItem>();

  setSessionKey(openid: string, sessionKey: string, ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS): void {
    if (!openid || !sessionKey) {
      return;
    }

    const safeTtl = Math.max(60, ttlSeconds - REFRESH_BUFFER_SECONDS);
    const expiresAt = Date.now() + safeTtl * 1000;

    this.sessionMap.set(openid, {
      sessionKey,
      expiresAt
    });
  }

  getSessionKey(openid: string): string | null {
    if (!openid) {
      return null;
    }

    const item = this.sessionMap.get(openid);
    if (!item) {
      return null;
    }

    if (item.expiresAt <= Date.now()) {
      this.sessionMap.delete(openid);
      return null;
    }

    return item.sessionKey;
  }

  clearSessionKey(openid: string): void {
    this.sessionMap.delete(openid);
  }
}

export default new WechatSessionService();
