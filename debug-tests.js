#!/usr/bin/env node

/**
 * 调试脚本 - 测试3个失败的接口
 */

const https = require('https');

const API_BASE_URL = 'https://api.wenzhuyuer.com/api';

function request(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`\n请求: ${method} ${url}`);
    if (token) console.log(`Token: ${token.substring(0, 20)}...`);

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`响应状态: ${res.statusCode}`);
          console.log(`响应数据:`, JSON.stringify(result, null, 2));
          resolve({
            statusCode: res.statusCode,
            data: result
          });
        } catch (e) {
          console.log(`响应状态: ${res.statusCode}`);
          console.log(`响应数据: ${body}`);
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error('请求错误:', err.message);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('调试测试 - 3个失败的接口');
  console.log('='.repeat(60));

  // 先登录获取token
  console.log('\n1. 登录获取 token...');
  const loginResult = await request('POST', '/auth/wechat-login', {
    code: 'mock_test_debug_' + Date.now()
  });

  if (!loginResult.data.success || !loginResult.data.data.token) {
    console.error('登录失败！');
    return;
  }

  const token = loginResult.data.data.token;
  const openid = loginResult.data.data.openid;
  console.log(`✓ 登录成功! openid=${openid}`);
  console.log(`  token=${token.substring(0, 30)}...`);

  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 500));

  // 测试1: 提交反馈
  console.log('\n' + '='.repeat(60));
  console.log('测试1: 提交反馈');
  console.log('='.repeat(60));
  try {
    const feedbackResult = await request('POST', '/feedbacks', {
      content: '测试反馈 - 调试脚本 ' + new Date().toISOString(),
      contact: 'test@example.com'
    }, token);
    console.log(feedbackResult.statusCode === 200 ? '✓ 成功' : '✗ 失败');
  } catch (error) {
    console.error('✗ 请求失败:', error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 测试2: 获取用户统计
  console.log('\n' + '='.repeat(60));
  console.log('测试2: 获取用户统计');
  console.log('='.repeat(60));
  try {
    const statsResult = await request('GET', '/scenarios/statistics', null, token);
    console.log(statsResult.statusCode === 200 ? '✓ 成功' : '✗ 失败');
  } catch (error) {
    console.error('✗ 请求失败:', error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 测试3: 获取打卡日历
  console.log('\n' + '='.repeat(60));
  console.log('测试3: 获取打卡日历');
  console.log('='.repeat(60));
  try {
    const calendarResult = await request('GET', '/scenarios/calendar', null, token);
    console.log(calendarResult.statusCode === 200 ? '✓ 成功' : '✗ 失败');
  } catch (error) {
    console.error('✗ 请求失败:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('调试完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
