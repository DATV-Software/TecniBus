#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const MEMORY_DIR = path.join(process.env.HOME || process.env.APPDATA, '.claude', 'projects', 'C--Users-diego-Desktop-tecnibus', 'memory');
const REQUIRED_FILES = [
  'user_profile.md',
  'tech_architecture.md',
  'project_state.md',
  'errors.md',
  'feedback_commits.md',
  'superpowers_workflows.md'
];

const MEMORY_INDEX = path.join(MEMORY_DIR, 'MEMORY.md');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  try {
    const fm = yaml.load(match[1]);
    return { frontmatter: fm, body: match[2] };
  } catch (e) {
    return { frontmatter: null, body: content, error: `Invalid YAML: ${e.message}` };
  }
}

function validateFile(filePath) {
  const issues = [];

  if (!fs.existsSync(filePath)) {
    return { missing: true, issues: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, error } = parseFrontmatter(content);

  if (error) issues.push(error);

  if (!frontmatter) {
    issues.push(`Missing frontmatter in ${path.basename(filePath)}`);
  } else {
    if (!frontmatter.name) issues.push(`Missing 'name' field in frontmatter`);
    if (!frontmatter.description) issues.push(`Missing 'description' field in frontmatter`);
    if (!frontmatter.type) issues.push(`Missing 'type' field in frontmatter`);
    if (!['user', 'feedback', 'project', 'reference'].includes(frontmatter.type)) {
      issues.push(`Invalid type: ${frontmatter.type}`);
    }
  }

  return { missing: false, issues };
}

function validateMemoryIndex() {
  const issues = [];

  if (!fs.existsSync(MEMORY_INDEX)) {
    return { missing: true, issues: [`MEMORY.md not found at ${MEMORY_INDEX}`] };
  }

  const content = fs.readFileSync(MEMORY_INDEX, 'utf-8');

  for (const file of REQUIRED_FILES) {
    if (!content.includes(`[${file.replace('.md', '')}]`) && !content.includes(file)) {
      issues.push(`MEMORY.md does not reference ${file}`);
    }
  }

  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  for (const match of linkMatches) {
    const linkMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkedFile = path.join(MEMORY_DIR, linkMatch[2]);
      if (!fs.existsSync(linkedFile)) {
        issues.push(`Dead link in MEMORY.md: ${linkMatch[2]}`);
      }
    }
  }

  return { missing: false, issues };
}

function runCheck() {
  console.log(`🔍 Validating memory file structure...\n`);

  let totalIssues = 0;

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(MEMORY_DIR, file);
    const result = validateFile(filePath);

    if (result.missing) {
      console.log(`❌ ${file}: MISSING`);
      totalIssues++;
    } else if (result.issues.length > 0) {
      console.log(`⚠️  ${file}: ${result.issues.length} issue(s)`);
      result.issues.forEach(issue => console.log(`   → ${issue}`));
      totalIssues += result.issues.length;
    } else {
      console.log(`✅ ${file}: OK`);
    }
  }

  console.log('');

  const indexResult = validateMemoryIndex();
  if (indexResult.missing) {
    console.log(`❌ MEMORY.md: MISSING`);
    totalIssues++;
  } else if (indexResult.issues.length > 0) {
    console.log(`⚠️  MEMORY.md: ${indexResult.issues.length} issue(s)`);
    indexResult.issues.forEach(issue => console.log(`   → ${issue}`));
    totalIssues += indexResult.issues.length;
  } else {
    console.log(`✅ MEMORY.md: OK`);
  }

  console.log(`\n${'='.repeat(50)}`);
  if (totalIssues === 0) {
    console.log(`✅ Memory structure validation PASSED\n`);
    process.exit(0);
  } else {
    console.log(`❌ Memory structure validation FAILED (${totalIssues} issue(s))\n`);
    process.exit(1);
  }
}

runCheck();
