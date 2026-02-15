#!/usr/bin/env node

/**
 * ext-pack Testing Checklist Command
 *
 * Displays the systematic testing guide and marks testing as complete
 * when all tests pass.
 */

import chalk from 'chalk';
import boxen from 'boxen';

console.log(boxen(
  chalk.bold.yellow('🧪 ext-pack Systematic Testing Checklist'),
  { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
));

console.log('\n' + chalk.bold('📋 MANDATORY TESTING PROTOCOL\n'));
console.log(chalk.gray('All tests must pass before committing code.\n'));

console.log(chalk.cyan('Full testing guide:'));
console.log(chalk.white('  .claude/skills/testing-checklist/SKILL.md\n'));

console.log(chalk.bold.yellow('Required Tests:\n'));
console.log('  ✅ Test 1: Create Flow (end-to-end)');
console.log('  ✅ Test 2: Install Flow (end-to-end)');
console.log('  ✅ Test 3: List Flow (end-to-end)');
console.log('  ✅ Test 4: Publish Flow (end-to-end)');
console.log('  ✅ Test 5: Error Handling & Edge Cases\n');

console.log(chalk.bold.green('Before testing:\n'));
console.log(chalk.white('  npm link') + chalk.gray('  # Install changes globally\n'));

console.log(chalk.bold.green('After ALL tests pass:\n'));
console.log(chalk.white('  touch .testing-verified') + chalk.gray('  # Mark testing complete'));
console.log(chalk.white('  git add .'));
console.log(chalk.white('  git commit -m "Your message"') + chalk.gray('  # Pre-commit hook will verify\n'));

console.log(boxen(
  chalk.bold.red('⚠️  NO EXCEPTIONS\n\n') +
  'Every test must pass.\n' +
  'Every checkbox must be checked.\n' +
  'Systematic approach = Zero gaps.',
  { padding: 1, borderColor: 'red', borderStyle: 'double' }
));

console.log('');
