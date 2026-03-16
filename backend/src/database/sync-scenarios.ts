import path from 'path';
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

type ModuleKey = 'module1' | 'module2' | 'module3' | 'module4' | 'module5';

type RuntimeScenario = {
  id: string;
  title: string;
  modules?: Partial<Record<ModuleKey, string[]>>;
};

type ScenarioMeta = {
  id: string;
  category: string;
  is_free: number;
  is_hero: number;
  order: number;
};

const moduleKeys: ModuleKey[] = ['module1', 'module2', 'module3', 'module4', 'module5'];

const scenarioCatalog: ScenarioMeta[] = [
  { id: '001', category: '愤怒', is_free: 1, is_hero: 1, order: 1 },
  { id: '002', category: '焦虑', is_free: 1, is_hero: 1, order: 2 },
  { id: '003', category: '焦虑', is_free: 0, is_hero: 1, order: 3 },
  { id: '004', category: '焦虑', is_free: 0, is_hero: 1, order: 4 },
  { id: '005', category: '焦虑', is_free: 0, is_hero: 1, order: 5 },
  { id: '006', category: '焦虑', is_free: 0, is_hero: 1, order: 6 },
  { id: '007', category: '无助', is_free: 0, is_hero: 0, order: 7 },
  { id: '008', category: '愤怒', is_free: 0, is_hero: 0, order: 8 },
  { id: '009', category: '无助', is_free: 0, is_hero: 0, order: 9 },
  { id: '010', category: '焦虑', is_free: 0, is_hero: 0, order: 10 },
  { id: '011', category: '焦虑', is_free: 0, is_hero: 0, order: 11 },
  { id: '012', category: '焦虑', is_free: 0, is_hero: 0, order: 12 },
  { id: '014', category: '焦虑', is_free: 0, is_hero: 0, order: 13 },
  { id: '015', category: '愤怒', is_free: 0, is_hero: 0, order: 14 },
  { id: '016', category: '愤怒', is_free: 0, is_hero: 0, order: 15 },
  { id: '017', category: '愤怒', is_free: 0, is_hero: 0, order: 16 }
];

function loadRuntimeScenarios(): Record<string, RuntimeScenario> {
  const sourcePath = path.resolve(__dirname, '../../../frontend/utils/scenarios.js');
  delete require.cache[require.resolve(sourcePath)];
  return require(sourcePath) as Record<string, RuntimeScenario>;
}

function normalizeModules(modules?: Partial<Record<ModuleKey, string[]>>): Record<ModuleKey, string[]> {
  return moduleKeys.reduce<Record<ModuleKey, string[]>>((result, key) => {
    result[key] = Array.isArray(modules?.[key])
      ? modules![key]!.filter((line): line is string => Boolean(line && line.trim()))
      : [];
    return result;
  }, {
    module1: [],
    module2: [],
    module3: [],
    module4: [],
    module5: []
  });
}

function flattenModules(modules: Record<ModuleKey, string[]>): string[] {
  return moduleKeys.flatMap((key) => modules[key]);
}

function buildMantras(modules: Record<ModuleKey, string[]>): string[] {
  const mantras = moduleKeys
    .map((key) => modules[key][0])
    .filter((line): line is string => Boolean(line && line.trim()));

  if (mantras.length > 0) {
    return mantras.slice(0, 5);
  }

  return flattenModules(modules).slice(0, 5);
}

function buildStabilizeText(title: string, modules: Record<ModuleKey, string[]>, mantras: string[]): string {
  return modules.module1[0] || mantras[0] || `${title}，先稳住自己。`;
}

function buildHealingQuote(title: string, modules: Record<ModuleKey, string[]>, mantras: string[]): string {
  const closingLines = modules.module5.filter(Boolean);
  const fallback = mantras[mantras.length - 1];
  return closingLines[closingLines.length - 1] || fallback || `${title}，慢慢来。`;
}

export async function syncScenariosToDatabase(): Promise<number> {
  const runtimeScenarios = loadRuntimeScenarios();

  for (const meta of scenarioCatalog) {
    const scenario = runtimeScenarios[meta.id];

    if (!scenario) {
      throw new Error(`未找到场景 ${meta.id} 的运行时数据`);
    }

    const modules = normalizeModules(scenario.modules);
    const mantras = buildMantras(modules);
    const stabilizeText = buildStabilizeText(scenario.title, modules, mantras);
    const healingQuote = buildHealingQuote(scenario.title, modules, mantras);

    await pool.execute(
      `INSERT INTO scenarios (
        id,
        title,
        category,
        modules,
        stabilize_text,
        mantras,
        healing_quote,
        is_free,
        is_hero,
        \`order\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        modules = VALUES(modules),
        stabilize_text = VALUES(stabilize_text),
        mantras = VALUES(mantras),
        healing_quote = VALUES(healing_quote),
        is_free = VALUES(is_free),
        is_hero = VALUES(is_hero),
        \`order\` = VALUES(\`order\`)`,
      [
        meta.id,
        scenario.title,
        meta.category,
        JSON.stringify(modules),
        stabilizeText,
        JSON.stringify(mantras),
        healingQuote,
        meta.is_free,
        meta.is_hero,
        meta.order
      ]
    );
  }

  return scenarioCatalog.length;
}

async function runSync() {
  try {
    await pool.getConnection();
    const count = await syncScenariosToDatabase();
    console.log(`✅ 已同步 ${count} 个场景到数据库`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步场景数据失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runSync();
}
