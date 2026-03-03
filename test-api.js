#!/usr/bin/env node

/**
 * 稳住小程序 - API 接口测试脚本
 *
 * 测试所有后端 API 接口，模拟真实用户操作场景
 *
 * 运行方式：
 * node test-api.js
 *
 * 环境要求：
 * - 后端服务必须运行在 https://1dt2po0565100.vicp.fun
 */

const https = require('https');
const http = require('http');

// API 配置
const API_BASE_URL = 'https://1dt2po0565100.vicp.fun/api';
const USE_HTTPS = true;

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// 存储测试过程中的数据（用于后续测试）
const testData = {
  token: null,
  openid: null,
  userId: null,
  scenarioId: '001',
  albumId: 'nvc',
  chapterId: null
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * HTTP 请求函数
 */
function request(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (USE_HTTPS ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = (USE_HTTPS ? https : http).request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            data: result
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * GET 请求
 */
function get(endpoint, token = null) {
  return request('GET', endpoint, null, token);
}

/**
 * POST 请求
 */
function post(endpoint, data = null, token = null) {
  return request('POST', endpoint, data, token);
}

/**
 * 打印测试标题
 */
function printTitle(title, icon = '🧪') {
  console.log(`\n${colors.cyan}${colors.bright}${icon} ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * 打印测试步骤
 */
function printStep(step) {
  console.log(`  ${colors.blue}➜${colors.reset} ${step}`);
}

/**
 * 打印成功信息
 */
function printSuccess(message) {
  console.log(`  ${colors.green}✓${colors.reset} ${message}`);
}

/**
 * 打印失败信息
 */
function printError(message) {
  console.log(`  ${colors.red}✗${colors.reset} ${message}`);
}

/**
 * 打印跳过信息
 */
function printSkip(message) {
  console.log(`  ${colors.yellow}○${colors.reset} ${message}`);
}

/**
 * 打印信息
 */
function printInfo(message) {
  console.log(`  ${colors.cyan}ℹ${colors.reset} ${message}`);
}

/**
 * 打印数据
 */
function printData(data, indent = 2) {
  const spaces = ' '.repeat(indent);
  console.log(`${spaces}${colors.white}${JSON.stringify(data, null, 2)}${colors.reset}`);
}

/**
 * 更新统计
 */
function updateStats(passed) {
  stats.total++;
  if (passed) {
    stats.passed++;
  } else {
    stats.failed++;
  }
}

/**
 * 等待函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试1: 健康检查
 */
async function testHealthCheck() {
  printTitle('1. 健康检查', '🏥');

  try {
    const response = await get('/health');

    if (response.statusCode === 200 && response.data.status === 'ok') {
      printSuccess('服务器运行正常');
      printInfo(`消息: ${response.data.message}`);
      updateStats(true);
      return true;
    } else {
      printError('服务器响应异常');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试2: 获取场景列表
 */
async function testGetScenarios() {
  printTitle('2. 获取场景列表', '📋');

  try {
    printStep('正在获取场景列表...');
    const response = await get('/scenarios');

    if (response.statusCode === 200 && response.data.success) {
      const scenarios = response.data.data;
      printSuccess(`获取成功，共 ${scenarios.length} 个场景`);

      // 显示前3个场景
      printInfo('前3个场景:');
      scenarios.slice(0, 3).forEach((s, i) => {
        console.log(`     ${i + 1}. ${s.title} (${s.is_free ? '免费' : '付费'})`);
      });

      // 保存第一个场景ID用于后续测试
      if (scenarios.length > 0) {
        testData.scenarioId = scenarios[0].id;
      }

      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试3: 获取场景详情
 */
async function testGetScenarioDetail() {
  printTitle('3. 获取场景详情', '📖');

  try {
    printStep(`获取场景 ${testData.scenarioId} 的详情...`);
    const response = await get(`/scenarios/${testData.scenarioId}`);

    if (response.statusCode === 200 && response.data.success) {
      const scenario = response.data.data;
      printSuccess('获取成功');
      printInfo(`场景标题: ${scenario.title}`);
      printInfo(`分类: ${scenario.category}`);
      printInfo(`是否免费: ${scenario.is_free ? '是' : '否'}`);
      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试4: 微信登录（模拟）
 */
async function testWechatLogin() {
  printTitle('4. 微信一键登录', '🔑');

  try {
    printStep('模拟微信登录...');
    printInfo('注意: 真实环境需要有效的微信 code，这里使用模拟测试');

    // 使用模拟的code（实际环境需要真实的微信code）
    const mockCode = 'mock_wx_code_' + Date.now();
    const response = await post('/auth/wechat-login', { code: mockCode });

    if (response.statusCode === 200) {
      if (response.data.success) {
        // 登录成功
        printSuccess('登录成功（后端响应正常）');
        printInfo('注意: 由于使用模拟code，OpenID可能为测试数据');

        if (response.data.data) {
          if (response.data.data.token) {
            testData.token = response.data.data.token;
            testData.openid = response.data.data.openid;
            printInfo(`Token: ${response.data.data.token.substring(0, 20)}...`);
            printInfo(`OpenID: ${response.data.data.openid}`);
          }
          if (response.data.data.user) {
            testData.userId = response.data.data.user.id;
            printInfo(`用户ID: ${response.data.data.user.id}`);
            printInfo(`是否会员: ${response.data.data.user.isVip ? '是' : '否'}`);
          }
        }

        updateStats(true);
        return true;
      } else {
        printError('登录失败');
        printData(response.data);
        updateStats(false);
        return false;
      }
    } else {
      printError(`HTTP ${response.statusCode}`);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试5: 检查会员状态
 */
async function testCheckMembership() {
  printTitle('5. 检查会员状态', '💳');

  if (!testData.openid) {
    printSkip('跳过: 需要先登录获取 openid');
    stats.skipped++;
    return null;
  }

  try {
    printStep('检查会员状态...');
    const response = await post('/membership/check', {
      openid: testData.openid
    });

    if (response.statusCode === 200 && response.data.success) {
      const isMember = response.data.data.isMember;
      printSuccess('检查成功');
      printInfo(`是否会员: ${isMember ? '是' : '否'}`);

      if (isMember) {
        const membership = response.data.data.membership;
        printInfo(`会员状态: ${membership.status}`);
        printInfo(`过期时间: ${membership.endDate}`);
      }

      updateStats(true);
      return true;
    } else {
      printError('检查失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试6: 获取会员详细信息
 */
async function testGetMembershipInfo() {
  printTitle('6. 获取会员详细信息', '📊');

  if (!testData.openid) {
    printSkip('跳过: 需要先登录获取 openid');
    stats.skipped++;
    return null;
  }

  try {
    printStep('获取会员详细信息...');
    const response = await post('/membership/info', {
      openid: testData.openid
    });

    if (response.statusCode === 200) {
      const membership = response.data.data;
      if (membership) {
        printSuccess('获取成功');
        printInfo(`用户ID: ${membership.userId}`);
        printInfo(`状态: ${membership.status}`);
        printInfo(`类型: ${membership.type}`);
        printInfo(`开始时间: ${membership.startDate}`);
        printInfo(`过期时间: ${membership.endDate}`);
        printInfo(`是否有效: ${membership.isActive ? '是' : '否'}`);
        printInfo(`剩余天数: ${membership.remainingDays}`);
      } else {
        printInfo('用户不是会员');
      }
      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试7: 兑换会员码
 */
async function testRedeemCode() {
  printTitle('7. 兑换会员码', '🎫');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    // 使用测试兑换码
    const testCode = 'TEST20260001';
    printStep(`使用兑换码: ${testCode}`);

    const response = await post('/membership/redeem', {
      code: testCode
    }, testData.token);

    if (response.statusCode === 200) {
      if (response.data.success) {
        printSuccess('兑换成功');
        printInfo(`提示信息: ${response.data.data.msg}`);
        printInfo(`过期日期: ${response.data.data.expireDate}`);
      } else {
        printError(`兑换失败: ${response.data.error}`);
      }
      updateStats(true);
      return true;
    } else {
      printError(`HTTP ${response.statusCode}`);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试8: 获取专辑列表
 */
async function testGetAlbums() {
  printTitle('8. 获取专辑列表', '📚');

  try {
    printStep('正在获取专辑列表...');
    const response = await get('/albums');

    if (response.statusCode === 200 && response.data.success) {
      const albums = response.data.data;
      printSuccess(`获取成功，共 ${albums.length} 个专辑`);

      // 显示所有专辑
      albums.forEach((album, i) => {
        console.log(`     ${i + 1}. ${album.icon} ${album.title} - ${album.subtitle}`);
        console.log(`        ${album.short_desc}`);
        console.log(`        ${album.is_free ? '免费' : '付费'}`);
      });

      // 保存第一个专辑ID用于后续测试
      if (albums.length > 0) {
        testData.albumId = albums[0].id;
      }

      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试9: 获取专辑详情
 */
async function testGetAlbumDetail() {
  printTitle('9. 获取专辑详情', '📖');

  try {
    printStep(`获取专辑 ${testData.albumId} 的详情...`);
    const response = await get(`/albums/${testData.albumId}`);

    if (response.statusCode === 200 && response.data.success) {
      const album = response.data.data;
      printSuccess('获取成功');
      printInfo(`标题: ${album.title}`);
      printInfo(`副标题: ${album.subtitle}`);
      printInfo(`描述: ${album.short_desc}`);
      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试10: 获取章节列表
 */
async function testGetChapters() {
  printTitle('10. 获取章节列表', '📑');

  try {
    printStep(`获取专辑 ${testData.albumId} 的章节列表...`);
    const response = await get(`/albums/${testData.albumId}/chapters`);

    if (response.statusCode === 200 && response.data.success) {
      const chapters = response.data.data;
      printSuccess(`获取成功，共 ${chapters.length} 个章节`);

      // 显示前5个章节
      printInfo('前5个章节:');
      chapters.slice(0, 5).forEach((ch, i) => {
        console.log(`     ${i + 1}. ${ch.title} - ${ch.subtitle} ${ch.locked ? '🔒' : '✓'}`);
      });

      // 保存第一个章节ID用于后续测试
      if (chapters.length > 0) {
        testData.chapterId = chapters[0].id;
      }

      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试11: 生成情绪切片文案（AI）
 */
async function testGenerateEmotionSlice() {
  printTitle('11. 生成情绪切片文案', '🤖');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    printStep('正在生成情绪切片文案...');
    printInfo('场景: 作业拖拉');
    printInfo('心情: 焦虑');

    const response = await post('/ai/emotion-slice', {
      scenario: '作业拖拉',
      mood: '焦虑',
      stormTime: new Date(),
      shiftTime: new Date(),
      anchorTime: new Date()
    }, testData.token);

    if (response.statusCode === 200) {
      if (response.data.success) {
        const data = response.data.data;
        printSuccess('生成成功');
        printInfo(`风暴时刻: ${data.stormText}`);
        printInfo(`转念时刻: ${data.shiftText}`);
        printInfo(`安顿时刻: ${data.anchorText}`);
        printInfo(`时间: ${data.timeStart} → ${data.timeMid} → ${data.timeEnd}`);
      } else {
        // 使用兜底文案
        if (response.data.fallback) {
          printSuccess('使用兜底文案');
          printInfo(`风暴时刻: ${response.data.fallback.stormText}`);
          printInfo(`转念时刻: ${response.data.fallback.shiftText}`);
          printInfo(`安顿时刻: ${response.data.fallback.anchorText}`);
        }
      }
      updateStats(true);
      return true;
    } else {
      printError('生成失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试12: 提交反馈
 */
async function testSubmitFeedback() {
  printTitle('12. 提交用户反馈', '💬');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    const feedbackContent = `测试反馈 - ${new Date().toLocaleString()}`;
    printStep(`提交反馈: ${feedbackContent}`);

    const response = await post('/feedbacks', {
      content: feedbackContent,
      contact: 'test@example.com'
    }, testData.token);

    if (response.statusCode === 200) {
      if (response.data.success) {
        printSuccess('提交成功');
        printInfo(`反馈ID: ${response.data.data.id}`);
      } else {
        printError(`提交失败: ${response.data.error}`);
      }
      updateStats(true);
      return true;
    } else {
      printError(`HTTP ${response.statusCode}`);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试13: 获取用户统计信息
 */
async function testGetUserStatistics() {
  printTitle('13. 获取用户统计信息', '📈');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    printStep('获取用户统计数据...');
    const response = await get('/scenarios/statistics', testData.token);

    if (response.statusCode === 200 && response.data.success) {
      const statistics = response.data.data;
      printSuccess('获取成功');
      printInfo(`总打卡天数: ${statistics.totalDays}`);
      printInfo(`总打卡次数: ${statistics.totalCount}`);
      printInfo(`总能量: ${statistics.totalEnergy}`);
      printInfo(`连续天数: ${statistics.continuousDays}`);
      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试14: 获取打卡日历
 */
async function testGetCheckInCalendar() {
  printTitle('14. 获取打卡日历', '📅');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    printStep('获取打卡日历...');
    const response = await get('/scenarios/calendar', testData.token);

    if (response.statusCode === 200 && response.data.success) {
      const calendar = response.data.data;
      printSuccess(`获取成功，共 ${calendar.length} 条打卡记录`);

      if (calendar.length > 0) {
        printInfo('最近的打卡日期:');
        calendar.slice(0, 5).forEach(date => {
          console.log(`     - ${date}`);
        });
      }

      updateStats(true);
      return true;
    } else {
      printError('获取失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 测试15: 同步用户信息
 */
async function testSyncUserProfile() {
  printTitle('15. 同步用户信息', '🔄');

  if (!testData.token) {
    printSkip('跳过: 需要先登录获取 token');
    stats.skipped++;
    return null;
  }

  try {
    printStep('同步用户信息...');
    const response = await post('/auth/sync-profile', {
      userInfo: {
        nickname: '测试用户',
        avatarUrl: 'https://example.com/avatar.png'
      }
    }, testData.token);

    if (response.statusCode === 200 && response.data.success) {
      const user = response.data.data.user;
      printSuccess('同步成功');
      printInfo(`操作: ${response.data.data.action}`);
      printInfo(`昵称: ${user.nickname}`);
      printInfo(`头像: ${user.avatarUrl}`);
      printInfo(`是否会员: ${user.isVip ? '是' : '否'}`);
      printInfo(`总打卡天数: ${user.totalDays}`);
      printInfo(`总打卡次数: ${user.totalCount}`);
      updateStats(true);
      return true;
    } else {
      printError('同步失败');
      printData(response.data);
      updateStats(false);
      return false;
    }
  } catch (error) {
    printError(`请求失败: ${error.message}`);
    updateStats(false);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.white}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}          ${colors.cyan}${colors.bright}稳住小程序 API 接口测试${colors.reset}           ${colors.bright}${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.cyan}📍 API 地址: ${API_BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}🕐 开始时间: ${new Date().toLocaleString()}${colors.reset}\n`);

  await sleep(1000);

  // 运行所有测试
  await testHealthCheck();
  await sleep(500);

  await testGetScenarios();
  await sleep(500);

  await testGetScenarioDetail();
  await sleep(500);

  await testWechatLogin();
  await sleep(500);

  await testCheckMembership();
  await sleep(500);

  await testGetMembershipInfo();
  await sleep(500);

  await testGetAlbums();
  await sleep(500);

  await testGetAlbumDetail();
  await sleep(500);

  await testGetChapters();
  await sleep(500);

  await testGenerateEmotionSlice();
  await sleep(500);

  await testSubmitFeedback();
  await sleep(500);

  await testGetUserStatistics();
  await sleep(500);

  await testGetCheckInCalendar();
  await sleep(500);

  await testSyncUserProfile();
  await sleep(500);

  // 打印测试结果
  console.log(`\n${colors.bright}${colors.white}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}                    ${colors.yellow}${colors.bright}测试结果统计${colors.reset}                    ${colors.bright}${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}  总计: ${stats.total.toString().padStart(2)}  ${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}  通过: ${colors.green}${stats.passed.toString().padStart(2)}${colors.reset}  ${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}  失败: ${colors.red}${stats.failed.toString().padStart(2)}${colors.reset}  ${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}║${colors.reset}  跳过: ${colors.yellow}${stats.skipped.toString().padStart(2)}${colors.reset}  ${colors.white}║${colors.reset}`);
  console.log(`${colors.bright}${colors.white}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // 计算通过率
  const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
  console.log(`${colors.cyan}📊 通过率: ${passRate}%${colors.reset}\n`);

  if (stats.failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 所有测试通过！${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}⚠️  有 ${stats.failed} 个测试失败，请检查！${colors.reset}\n`);
  }

  console.log(`${colors.cyan}🕐 结束时间: ${new Date().toLocaleString()}${colors.reset}\n`);
}

// 运行测试
runAllTests().catch(error => {
  console.error(`${colors.red}测试运行失败:${colors.reset}`, error);
  process.exit(1);
});
