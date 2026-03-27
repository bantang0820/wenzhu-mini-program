#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到环境文件: $ENV_FILE"
  echo "用法: bash scripts/emergency_rotate_admin.sh [env-file-path]"
  exit 1
fi

timestamp="$(date +%Y%m%d%H%M%S)"
backup_file="${ENV_FILE}.bak.${timestamp}"
cp "$ENV_FILE" "$backup_file"

admin_username="admin_${timestamp:4:8}"
admin_password="$(openssl rand -hex 16)"
admin_jwt_secret="$(openssl rand -hex 32)"
jwt_secret="$(openssl rand -hex 32)"

upsert_env() {
  local key="$1"
  local value="$2"
  local tmp_file
  tmp_file="$(mktemp)"

  awk -v k="$key" -v v="$value" '
    BEGIN { updated = 0 }
    $0 ~ ("^" k "=") {
      print k "=" v
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) print k "=" v
    }
  ' "$ENV_FILE" > "$tmp_file"

  mv "$tmp_file" "$ENV_FILE"
}

# 轮换管理员与JWT相关配置
upsert_env "ADMIN_USERNAME" "$admin_username"
upsert_env "ADMIN_PASSWORD" "$admin_password"
upsert_env "ADMIN_JWT_SECRET" "$admin_jwt_secret"
upsert_env "ADMIN_JWT_EXPIRES_IN" "12h"
upsert_env "JWT_SECRET" "$jwt_secret"
upsert_env "ADMIN_LOGIN_MAX_FAILURES" "5"
upsert_env "ADMIN_LOGIN_WINDOW_MS" "600000"
upsert_env "ADMIN_LOGIN_BLOCK_MS" "1800000"
upsert_env "TRUST_PROXY" "true"

echo "已更新: $ENV_FILE"
echo "备份文件: $backup_file"
echo
echo "新的管理员账号: $admin_username"
echo "新的管理员密码: $admin_password"
echo
echo "下一步请重启后端服务使配置生效。"
