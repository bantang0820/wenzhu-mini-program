const fs = require('fs');

// 读取markdown文件
const content = fs.readFileSync('./data/场景文案合集.md', 'utf-8');

// 按场景分割
const scenarioBlocks = content.split(/^# 场景ID:/m).filter(block => block.trim());

const scenarios = {};

scenarioBlocks.forEach(block => {
  const lines = block.trim().split('\n');
  const id = lines[0].trim();
  const titleMatch = lines[1].match(/场景名称: (.+)/);

  if (!titleMatch) return;

  const title = titleMatch[1];

  // 提取各层内容
  const module1 = [];
  const module2 = [];
  const module3 = [];
  const module4 = [];
  const module5 = [];
  let healingQuote = '';

  let currentModule = null;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('## 第一层')) {
      currentModule = module1;
    } else if (line.startsWith('## 第二层')) {
      currentModule = module2;
    } else if (line.startsWith('## 第三层')) {
      currentModule = module3;
    } else if (line.startsWith('## 第四层')) {
      currentModule = module4;
    } else if (line.startsWith('## 第五层')) {
      currentModule = module5;
    } else if (line.startsWith('## 治愈的话')) {
      // 提取治愈的话
      const quoteLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() && !lines[j].startsWith('#')) {
          quoteLines.push(lines[j].trim());
        }
      }
      healingQuote = quoteLines.join('');
      break;
    } else if (line && !line.startsWith('#') && currentModule) {
      currentModule.push(line);
    }
  }

  scenarios[id] = {
    id,
    title,
    modules: {
      module1,
      module2,
      module3,
      module4,
      module5
    },
    healingQuote
  };
});

// 生成JS文件
const jsContent = `// 场景数据文件
// 自动生成于 ${new Date().toLocaleString()}

module.exports = ${JSON.stringify(scenarios, null, 2)};
`;

fs.writeFileSync('./data/scenarios.js', jsContent, 'utf-8');

console.log('转换完成！生成了以下场景：');
Object.keys(scenarios).forEach(id => {
  console.log(`- ${id}: ${scenarios[id].title}`);
});
