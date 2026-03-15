const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(__dirname, '场景文案合集.md');
const outputPaths = [
  path.join(__dirname, 'scenarios.js'),
  path.join(__dirname, '../utils/scenarios.js')
];
const existingDataPath = path.join(__dirname, '../utils/scenarios.js');
const dailySourcePath = path.join(__dirname, 'daily-final.js');

const content = fs.readFileSync(sourcePath, 'utf-8');
const scenarioBlocks = content.split(/^# 场景ID:/m).filter(block => block.trim());
const scenarios = {};
const moduleKeys = ['module1', 'module2', 'module3', 'module4', 'module5'];
let existingScenarios = {};
const warnings = [];

if (fs.existsSync(existingDataPath)) {
  try {
    delete require.cache[require.resolve(existingDataPath)];
    existingScenarios = require(existingDataPath);
  } catch (error) {
    console.warn('读取现有场景数据失败，将仅按源文案生成：', error.message);
  }
}

function loadDailyScenario() {
  if (!fs.existsSync(dailySourcePath)) {
    return null;
  }

  try {
    const dailyCode = fs.readFileSync(dailySourcePath, 'utf-8');
    const sandbox = {
      module: { exports: {} },
      exports: {},
      console: { log: () => {} }
    };

    vm.runInNewContext(`${dailyCode}\nmodule.exports = dailyScenario;`, sandbox, {
      filename: dailySourcePath
    });

    return sandbox.module.exports || null;
  } catch (error) {
    console.warn('读取日常场景失败，将保留现有运行时内容：', error.message);
    return existingScenarios.daily || null;
  }
}

function getModuleByHeading(line, modules) {
  if (!line.startsWith('## ')) return null;

  if (line.includes('情绪接纳') || line.includes('生理机能觉察')) {
    return modules.module1;
  }

  if (line.includes('课题分离')) {
    return modules.module2;
  }

  if (line.includes('成长型思维')) {
    return modules.module3;
  }

  if (line.includes('具体行动')) {
    return modules.module4;
  }

  if (line.includes('身份确认')) {
    return modules.module5;
  }

  if (line.startsWith('## 第一层')) return modules.module1;
  if (line.startsWith('## 第二层')) return modules.module2;
  if (line.startsWith('## 第三层')) return modules.module3;
  if (line.startsWith('## 第四层')) return modules.module4;
  if (line.startsWith('## 第五层')) return modules.module5;

  return null;
}

scenarioBlocks.forEach(block => {
  const lines = block.trim().split('\n');
  const id = lines[0].trim();
  const titleMatch = lines[1].match(/场景名称: (.+)/);

  if (!titleMatch) return;

  const title = titleMatch[1].trim();
  const modules = {
    module1: [],
    module2: [],
    module3: [],
    module4: [],
    module5: []
  };

  let currentModule = null;

  for (let i = 2; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (!line) continue;

    const headingModule = getModuleByHeading(line, modules);
    if (headingModule) {
      currentModule = headingModule;
      continue;
    }

    if (!line.startsWith('#') && currentModule) {
      currentModule.push(line);
    }
  }

  const totalLines = moduleKeys.reduce((sum, key) => sum + modules[key].length, 0);
  const existingScenario = existingScenarios[id];

  if (totalLines === 0 && existingScenario) {
    warnings.push(`${id} 源文案为空，已保留现有运行时内容`);
    scenarios[id] = {
      ...existingScenario,
      id,
      title
    };
  } else {
    scenarios[id] = { id, title, modules };
  }
});

Object.entries(scenarios).forEach(([id, scenario]) => {
  moduleKeys.forEach(key => {
    const lineCount = Array.isArray(scenario.modules[key]) ? scenario.modules[key].length : 0;
    if (lineCount === 0) {
      warnings.push(`${id} ${key} 当前为空`);
    } else if (lineCount !== 20) {
      warnings.push(`${id} ${key} 句数为 ${lineCount}`);
    }
  });
});

const dailyScenario = loadDailyScenario();
if (dailyScenario) {
  scenarios.daily = dailyScenario;
}

const jsContent = `// 场景数据文件
// 源文件: frontend/data/场景文案合集.md
// 自动生成，请勿手改

module.exports = ${JSON.stringify(scenarios, null, 2)};
`;

outputPaths.forEach(outputPath => {
  fs.writeFileSync(outputPath, jsContent, 'utf-8');
});

console.log(`转换完成，共生成 ${Object.keys(scenarios).length} 个场景：`);
Object.keys(scenarios).forEach(id => {
  console.log(`- ${id}: ${scenarios[id].title}`);
});
console.log('已同步到：');
outputPaths.forEach(outputPath => {
  console.log(`- ${path.relative(process.cwd(), outputPath)}`);
});

if (warnings.length > 0) {
  console.warn('同步完成，但有这些提醒：');
  warnings.forEach(warning => {
    console.warn(`- ${warning}`);
  });
}
