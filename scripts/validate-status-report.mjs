import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const reportPath = resolve(process.argv[2] ?? 'LeafSeamer_Project_Status_Report.html');
const requiredBundles = [
  'platform',
  'seamer',
  'logger',
  'schedule',
  'vb-matrix',
  'obs',
  'atem',
  'mixer',
  'graphics',
  'backup',
  'data-sync',
  'adapters',
];
const requiredFields = [
  'evidence',
  'risk',
  'impact',
  'mitigation',
  'improvement',
  'implementation',
  'acceptance',
  'related',
];

const html = await readFile(reportPath, 'utf8');
const failures = [];

// 静态报告不引入 HTML 解析依赖，检查器仅验证本报告约定的稳定标记。
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const idSet = new Set(ids);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

if (duplicateIds.length > 0) {
  failures.push(`存在重复 id：${duplicateIds.join(', ')}`);
}

const anchorTargets = [...html.matchAll(/\bhref=["']#([^"']+)["']/g)].map((match) => match[1]);
const missingAnchors = [...new Set(anchorTargets.filter((target) => !idSet.has(target)))];
if (missingAnchors.length > 0) {
  failures.push(`存在无效内部锚点：${missingAnchors.join(', ')}`);
}

for (const bundle of requiredBundles) {
  const marker = new RegExp(`<section[^>]+data-bundle=["']${bundle}["']`, 'i');
  if (!marker.test(html)) {
    failures.push(`缺少 Bundle 章节：${bundle}`);
  }
}

const issueCards = [...html.matchAll(/<article\b(?=[^>]*\bclass=["'][^"']*\bissue-card\b[^"']*["'])(?=[^>]*\bdata-issue=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/article>/gi)];
if (issueCards.length === 0) {
  failures.push('没有找到符合约定的 .issue-card 问题卡片');
}

const issueIds = issueCards.map((match) => match[1]);
const duplicateIssues = [...new Set(issueIds.filter((id, index) => issueIds.indexOf(id) !== index))];
if (duplicateIssues.length > 0) {
  failures.push(`存在重复问题编号：${duplicateIssues.join(', ')}`);
}

for (const [, issueId, body] of issueCards) {
  if (!/\bdata-priority=["']p[012]["']/i.test(issueCards.find((match) => match[1] === issueId)?.[0] ?? '')) {
    failures.push(`${issueId} 缺少有效 data-priority`);
  }

  for (const field of requiredFields) {
    const fieldMarker = new RegExp(`\\bdata-field=["']${field}["']`, 'i');
    if (!fieldMarker.test(body)) {
      failures.push(`${issueId} 缺少字段：${field}`);
    }
  }
}

for (const filter of ['all', 'p0', 'p1', 'p2']) {
  const filterMarker = new RegExp(`\\bdata-filter=["']${filter}["']`, 'i');
  if (!filterMarker.test(html)) {
    failures.push(`缺少优先级筛选控件：${filter}`);
  }
}

if (!/@media\s*\(max-width:\s*900px\)/i.test(html)) {
  failures.push('缺少 900px 窄屏响应式样式');
}

if (!/@media\s+print/i.test(html)) {
  failures.push('缺少打印样式');
}

if (!/<noscript[\s>]/i.test(html)) {
  failures.push('缺少 JavaScript 禁用时的说明');
}

if (failures.length > 0) {
  console.error(`报告结构检查失败：${reportPath}`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`报告结构检查通过：${reportPath}`);
  console.log(`Bundle：${requiredBundles.length}`);
  console.log(`问题：${issueCards.length}`);
  console.log(`内部锚点：${anchorTargets.length}`);
  console.log('重复 id：0');
}
