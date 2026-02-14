/**
 * Interactive wizard for publishing packs to registry
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import { colors, successBox, errorBox, clearScreen, pause } from './helpers.js';
import { readPackFile } from '../core/pack-codec.js';
import { publishPack, hasGitHubAuth } from '../core/github-publisher.js';

/**
 * Run the publish wizard
 * @param {string} packPath - Path to pack file (optional)
 * @param {Object} options - Publish options
 */
export async function runPublishWizard(packPath = null, options = {}) {
  clearScreen();

  console.log(colors.bold('\n  📦 Publish to Registry\n'));

  // Step 1: Select pack file if not provided
  if (!packPath) {
    const { selectedFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'selectedFile',
        message: 'Pack file path:',
        validate: (input) => {
          if (!input) return 'Pack file is required';
          const path = resolve(input);
          if (!existsSync(path)) return 'File not found';
          if (!path.endsWith('.extpack')) return 'Must be an .extpack file';
          return true;
        }
      }
    ]);

    packPath = resolve(selectedFile);
  } else {
    packPath = resolve(packPath);

    if (!existsSync(packPath)) {
      console.log(errorBox(`Pack file not found: ${packPath}`));
      await pause();
      return;
    }
  }

  // Step 2: Read and validate pack
  const loadSpinner = ora('Reading pack file...').start();

  let pack;
  try {
    pack = await readPackFile(packPath);
    loadSpinner.succeed('Pack loaded');
  } catch (error) {
    loadSpinner.fail('Failed to read pack');
    console.log(errorBox(`Invalid pack file: ${error.message}`));
    await pause();
    return;
  }

  // Step 3: Show pack info
  console.log(colors.bold('\n  Pack Information:\n'));
  console.log(`  Name:        ${colors.highlight(pack.name)}`);
  console.log(`  Description: ${pack.description || colors.muted('none')}`);
  console.log(`  Version:     ${pack.version || '1.0.0'}`);
  console.log(`  Extensions:  ${pack.extensions.length}`);
  console.log(`  Tags:        ${pack.tags?.join(', ') || colors.muted('none')}`);
  console.log();

  // Step 4: Check GitHub authentication
  const authSpinner = ora('Checking GitHub authentication...').start();

  const isAuthenticated = await hasGitHubAuth();

  if (!isAuthenticated) {
    authSpinner.fail('GitHub authentication required');
    console.log(errorBox(
      'You need to authenticate with GitHub to publish packs.\n\n' +
      'Run one of the following:\n' +
      colors.highlight('  gh auth login') + '\n' +
      colors.highlight('  export GITHUB_TOKEN=<your-token>') + '\n'
    ));
    await pause();
    return;
  }

  authSpinner.succeed('GitHub authenticated');

  // Step 5: Add/update tags if missing
  if (!pack.tags || pack.tags.length === 0) {
    console.log(colors.warning('\n⚠️  No tags specified. Tags help users discover your pack.\n'));

    const suggestedTags = [
      'productivity',
      'privacy',
      'dev-tools',
      'social',
      'entertainment',
      'accessibility',
      'security',
      'design'
    ];

    const { selectedTags } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTags',
        message: 'Select tags (optional):',
        choices: suggestedTags
      }
    ]);

    pack.tags = selectedTags;
  }

  // Step 6: Confirm publish
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Publish "${pack.name}" to public registry?`,
      default: true
    }
  ]);

  if (!confirm) {
    console.log(colors.muted('\nPublish cancelled.\n'));
    return;
  }

  // Step 7: Publish pack
  const publishSpinner = ora('Publishing pack...').start();

  try {
    publishSpinner.text = 'Creating GitHub release...';
    const result = await publishPack(packPath, options);

    publishSpinner.succeed('Pack published successfully!');

    console.log(successBox(
      `✅ ${colors.highlight(pack.name)} published!\n\n` +
      `Release:  ${result.releaseUrl}\n` +
      `Download: ${result.downloadUrl}\n` +
      `PR:       ${result.prUrl}\n\n` +
      colors.bold('Next steps:\n') +
      `1. Wait for PR to be reviewed and merged (~5 min)\n` +
      `2. Your pack will be available: ${colors.highlight(`ext-pack install ${result.metadata.id}`)}\n` +
      `3. Share it: https://packs.ext-pack.dev/${result.metadata.id}`
    ));

    // Step 8: Open PR in browser?
    const { openPR } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openPR',
        message: 'Open pull request in browser?',
        default: true
      }
    ]);

    if (openPR) {
      const { execSync } = await import('child_process');
      try {
        execSync(`open ${result.prUrl}`, { stdio: 'ignore' });
      } catch {
        console.log(colors.muted(`\nOpen manually: ${result.prUrl}\n`));
      }
    }

  } catch (error) {
    publishSpinner.fail('Publish failed');

    console.log(errorBox(
      `Failed to publish pack.\n\n` +
      colors.muted(`Error: ${error.message}`)
    ));

    if (error.message.includes('already exists')) {
      console.log(colors.muted('\nTip: Increment the version in your pack or use --tag to specify a different tag.\n'));
    }

    await pause();
  }
}

export default {
  runPublishWizard
};
