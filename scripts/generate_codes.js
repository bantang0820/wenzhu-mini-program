const fs = require('fs');
const path = require('path');

/**
 * 兑换码生成脚本 (Node.js)
 * 运行方式: node scripts/generate_codes.js [数量]
 */

const count = process.argv[2] || 100; 
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符

function generateCode() {
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const codes = new Set();
while (codes.size < count) {
  codes.add(generateCode());
}

const codeList = Array.from(codes);

// 1. 生成数据库导入用的 JSON
const dbJson = codeList.map(code => ({
  code: code,
  status: 0,
  type: '1_YEAR_VIP',
  create_time: new Date().toISOString()
}));

// 2. 生成发货用的纯文本 TXT (每行一个码，直接导入发货工具)
const txtContent = codeList.join('\n');

const jsonPath = path.join(__dirname, 'codes_for_db.json');
const txtPath = path.join(__dirname, 'codes_for_delivery.txt');

fs.writeFileSync(jsonPath, JSON.stringify(dbJson, null, 2));
fs.writeFileSync(txtPath, txtContent);

console.log('--- 兑换码生成成功 ---');
console.log('1. 数据库导入文件 (JSON): ' + jsonPath);
console.log('2. 自动发货工具用 (TXT): ' + txtPath);
console.log('--- 共生成 ' + codes.size + ' 个 ---');
