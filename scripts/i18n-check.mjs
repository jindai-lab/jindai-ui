#!/usr/bin/env node
/**
 * i18n-check.mjs — 程序性检查 jindai-ui 源码（src 目录下所有 .js/.jsx 文件）中
 * t()/i18n.t() 使用到的翻译 key 是否在 locales (zh-CN.json / en.json) 中遗漏，
 * 并可自动补齐中英文翻译。
 *
 * 语义与项目根目录 i18next.config.js 保持一致:
 *   - functions: t / i18n.t（字符串字面量实参才计为 key）
 *   - keySeparator: false（扁平 key）
 *   - t(key, { count }) 会额外推导 `${key}_one` / `${key}_other` 复数 key（与 i18next-cli 对齐）
 *
 * 用法:
 *   node scripts/i18n-check.mjs          # 检查：打印缺失/疑似未翻译/疑似冗余报告（带 文件:行号）
 *   node scripts/i18n-check.mjs --fix    # 修复：把缺失 key 写入各 locale JSON（优先取 scripts/i18n-fill.json 词典）
 *
 * 退出码: 存在未解决问题 → 1；全部就绪 → 0。可直接用于 CI。
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';

const scriptDir = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

/* ------------------------------------------------------------------ */
/* 0. 加载 @babel/parser: 优先正式依赖, 否则回退到 pnpm 虚拟仓库中的副本 */
/* ------------------------------------------------------------------ */
async function loadBabelParser() {
  try {
    const mod = await import('@babel/parser');
    return mod.default ?? mod;
  } catch { /* fallthrough */ }
  const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const candidates = fs.readdirSync(pnpmDir)
      .filter((d) => d.startsWith('@babel+parser@'))
      .sort()
      .reverse();
    for (const dir of candidates) {
      const file = path.join(pnpmDir, dir, 'node_modules', '@babel', 'parser', 'lib', 'index.js');
      if (fs.existsSync(file)) {
        const mod = await import(url.pathToFileURL(file).href);
        return mod.default ?? mod;
      }
    }
  }
  throw new Error('找不到 @babel/parser，请先执行: pnpm add -D @babel/parser');
}

/* ------------------------------------------------ */
/* 1. 读取 i18next.config.js，推导 locales 与文件路径 */
/* ------------------------------------------------ */
async function loadConfig() {
  const cfgPath = path.join(rootDir, 'i18next.config.js');
  const mod = await import(url.pathToFileURL(cfgPath).href);
  const cfg = mod.default ?? mod;
  const ex = cfg.extract ?? {};
  const primary = ex.primaryLanguage ?? cfg.locales?.[0] ?? 'zh-CN';
  const secondary = ex.secondaryLanguages ?? (cfg.locales ?? []).filter((l) => l !== primary);
  return {
    locales: [primary, ...secondary],
    primary,
    input: ex.input ?? 'src/**/*.{js,jsx}',
    output: ex.output ?? 'src/locales/{{language}}.json',
    functions: ex.functions ?? ['t', 'i18n.t'],
  };
}

/** 极简 glob → RegExp（支持 **、*、?、{a,b}） */
function globToRegex(glob) {
  const esc = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      const alts = glob.slice(i + 1, end).split(',').map((a) => a.trim());
      re += `(?:${alts.map((a) => esc(a).replace(/\\\*/g, '[^/]*').replace(/\\\?/g, '[^/]')).join('|')})`;
      i = end;
    } else if (c === '?') re += '[^/]';
    else re += esc(c);
  }
  return new RegExp(`^${re}$`);
}

/** 递归收集匹配 glob 的源码文件（跳过 node_modules / .git / dist / locales） */
function collectFiles(glob) {
  const rx = globToRegex(glob);
  const skip = new Set(['node_modules', '.git', 'dist', 'locales', '.vite']);
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        const rel = path.relative(rootDir, path.join(dir, entry.name)).split(path.sep).join('/');
        if (rx.test(rel)) out.push(rel);
      }
    }
  };
  walk(rootDir);
  return out.sort();
}

/* ------------------------------------------------ */
/* 2. AST 提取 t()/i18n.t() 的 key                   */
/* ------------------------------------------------ */
function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property?.type === 'Identifier') {
    const obj = calleeName(node.object);
    return obj ? `${obj}.${node.property.name}` : null;
  }
  return null;
}

function staticString(node) {
  if (!node) return undefined;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  return undefined;
}

function objectProps(node) {
  const props = { keys: [], values: {} };
  if (node?.type !== 'ObjectExpression') return props;
  for (const p of node.properties) {
    if (p.type !== 'ObjectProperty') continue;
    const k = p.key?.type === 'Identifier' ? p.key.name
      : p.key?.type === 'StringLiteral' ? p.key.value : undefined;
    if (k === undefined) continue;
    props.keys.push(k);
    const v = staticString(p.value);
    if (v !== undefined) props.values[k] = v;
  }
  return props;
}

const SKIP_WALK_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range', 'tokens']);

/** @returns {{found: Map<string, Array<{file: string, line: number, plural?: boolean}>>, parseErrors: string[]}} */
function extractKeys(files, functions, parser) {
  const funcSet = new Set(functions);
  const found = new Map();
  const parseErrors = [];
  const add = (key, file, line, plural = false) => {
    if (!found.has(key)) found.set(key, []);
    const refs = found.get(key);
    if (!refs.some((r) => r.file === file && r.line === line && r.plural === plural)) {
      refs.push({ file, line, plural });
    }
  };

  for (const rel of files) {
    const abs = path.join(rootDir, rel);
    let ast;
    try {
      ast = parser.parse(fs.readFileSync(abs, 'utf8'), {
        sourceType: 'module',
        errorRecovery: false,
        plugins: ['jsx'],
      });
    } catch (err) {
      parseErrors.push(`${rel}: ${err.message?.split('\n')[0] ?? err}`);
      continue;
    }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'CallExpression') {
        const name = calleeName(node.callee);
        if (name && funcSet.has(name)) {
          const key = staticString(node.arguments[0]);
          if (key !== undefined && key !== '') {
            const line = node.loc?.start?.line ?? 0;
            add(key, rel, line);
            const opts = objectProps(node.arguments[1]);
            if (opts.keys.includes('count')) {
              add(`${key}_one`, rel, line, true);
              add(`${key}_other`, rel, line, true);
            }
          }
        }
      }
      for (const [k, v] of Object.entries(node)) {
        if (SKIP_WALK_KEYS.has(k)) continue;
        if (Array.isArray(v)) { v.forEach(visit); continue; }
        if (v && typeof v === 'object' && v.type) visit(v);
      }
    };
    visit(ast.program ?? ast);
  }
  return { found, parseErrors };
}

/* ---------------------------------------- */
/* 3. locale JSON 读写（兼容 translation 包裹） */
/* ---------------------------------------- */
function localeFilePath(outputTpl, locale) {
  return path.join(rootDir, outputTpl.replace(/\{\{language\}\}/g, locale));
}

function loadLocale(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  if (doc && typeof doc === 'object' && doc.translation && typeof doc.translation === 'object') {
    return { doc, table: doc.translation, wrapped: true };
  }
  return { doc, table: doc, wrapped: false };
}

function saveLocale(file, { doc, table, wrapped }) {
  // 保持既有 key 顺序，新增 key 追加在末尾；2 空格缩进 + 末尾换行
  const body = wrapped ? { ...doc, translation: table } : table;
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

const hasCJK = (s) => /[\u3400-\u4dbf\u4e00-\u9fff]/.test(s ?? '');

function humanizeKey(key) {
  const m = key.match(/^e_g_(.+)$/);
  const rest = m ? m[1] : key;
  const text = rest.split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  return m ? `e.g. ${text}` : text;
}

/* ---------------------------------------- */
/* 4. 主流程                                 */
/* ---------------------------------------- */
const FIX = process.argv.includes('--fix');
const dictFile = path.join(scriptDir, 'i18n-fill.json');

const config = await loadConfig();
const parser = await loadBabelParser();

const files = collectFiles(config.input);
const { found: codeKeys, parseErrors } = extractKeys(files, config.functions, parser);

let unresolved = 0;
const reports = [];

for (const locale of config.locales) {
  const file = localeFilePath(config.output, locale);
  const store = loadLocale(file);
  const tableKeys = new Set(Object.keys(store.table));

  const missing = [...codeKeys.keys()].filter((k) => !tableKeys.has(k)).sort();
  const empty = [...tableKeys].filter((k) => store.table[k] == null || String(store.table[k]).trim() === '');
  // 疑似未翻译: 值与 key 完全相同
  //   - 中文原文 key: 主语言正常, 次语言未翻译
  //   - 蛇形命名 key: 值等于 key 基本都是没填
  //   - 整句 key(英文句子等): 主语言值=key 说明没翻译, 次语言值=key 属正常
  const sameAsKey = [...tableKeys].filter((k) => {
    const v = store.table[k];
    if (typeof v !== 'string' || v !== k) return false;
    if (hasCJK(k)) return locale !== config.primary;
    if (/^[a-z][a-z0-9_]*$/.test(k)) return true;
    return locale === config.primary;
  });
  // 疑似串语言: 次语言值里出现中文
  const cjkValue = locale !== config.primary
    ? [...tableKeys].filter((k) => typeof store.table[k] === 'string' && hasCJK(store.table[k]))
    : [];
  // 疑似冗余: locale 有而代码无（仅提示，不自动删除——key 可能被 window.i18nInstance 等外部使用）
  const unused = [...tableKeys].filter((k) => !codeKeys.has(k)).sort();

  unresolved += missing.length + empty.length + sameAsKey.length + cjkValue.length;
  reports.push({ locale, file: path.relative(rootDir, file), missing, empty, sameAsKey, cjkValue, unused });

  if (FIX) {
    const dict = fs.existsSync(dictFile) ? JSON.parse(fs.readFileSync(dictFile, 'utf8')) : {};
    const touched = [];
    const apply = (key) => {
      let value = dict[key]?.[locale];
      let todo = false;
      if (value == null) {
        if (hasCJK(key)) {
          value = key; // 中文原文 key: 主语言直接用原文, 次语言需人工翻译
          todo = locale !== config.primary;
        } else if (locale === config.primary) {
          value = key; // 整句英文 key: 主语言(中文)需人工翻译
          todo = true;
        } else {
          const snake = /^[a-z][a-z0-9_]*$/.test(key);
          value = snake ? humanizeKey(key) : key; // 次语言: 蛇形 key 自动派生需复核, 整句 key 即原文
          todo = snake;
        }
      }
      store.table[key] = value;
      touched.push({ key, value, todo });
      if (todo) unresolved += 1;
    };
    for (const k of [...missing, ...empty]) apply(k);
    if (touched.length > 0) {
      saveLocale(file, store);
      console.log(`\n[fix] ${locale}: 新增/补齐 ${touched.length} 个 key → ${path.relative(rootDir, file)}`);
      for (const t of touched) {
        console.log(`  + ${t.key} = ${JSON.stringify(t.value)}${t.todo ? '   (TODO: 请人工确认并回填 scripts/i18n-fill.json)' : ''}`);
      }
    } else {
      console.log(`\n[fix] ${locale}: 无需改动`);
    }
  }
}

/* ---------------- 报告 ---------------- */
const refStr = (key, max = 3) => {
  const refs = codeKeys.get(key) ?? [];
  const head = refs.slice(0, max).map((r) => `${r.file}:${r.line}`).join(', ');
  return refs.length > max ? `${head} 等${refs.length}处` : head;
};

console.log(`\ni18n 检查报告  (源码文件 ${files.length} 个, 代码 key ${codeKeys.size} 个, locales: ${config.locales.join(', ')})`);
for (const r of reports) {
  console.log(`\n── ${r.locale}  (${r.file}) ──`);
  console.log(`   缺失 key: ${r.missing.length}`);
  for (const k of r.missing) console.log(`     ✗ ${k}    ← ${refStr(k)}`);
  for (const [label, flag, keys] of [
    ['值为空', '✗', r.empty],
    ['值与 key 相同(疑似未翻译)', '?', r.sameAsKey],
    ['值包含中文(疑似串语言)', '?', r.cjkValue],
  ]) {
    if (keys.length) {
      console.log(`   ${label}: ${keys.length}`);
      for (const k of keys) console.log(`     ${flag} ${k}`);
    }
  }
  if (r.unused.length) {
    console.log(`   未被代码引用(仅提示, 不自动删除): ${r.unused.length}`);
    for (const k of r.unused) console.log(`     · ${k}`);
  }
}
if (parseErrors.length) {
  console.log(`\n解析失败(未纳入统计, 请修复): ${parseErrors.length}`);
  for (const e of parseErrors) console.log(`     ! ${e}`);
  unresolved += parseErrors.length;
}

if (!FIX) {
  console.log(`\n结论: ${unresolved === 0 ? '✅ 所有翻译均已就绪' : `❌ 有 ${unresolved} 项待处理。运行 node scripts/i18n-check.mjs --fix 可按 scripts/i18n-fill.json 词典补齐`}`);
}
process.exit(unresolved === 0 ? 0 : 1);

