/**
 * Interactive wizard for publishing packs to registry
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import { colors, successBox, errorBox, clearScreen, findPackFileSmart, pause } from './helpers.js';
import { readPackFile } from '../core/pack-codec.js';
import { publishPack, hasGitHubAuth } from '../core/github-publisher.js';
import { runCreateWizard } from './create-wizard.js';

/**
 * Check if Ollama is running
 */
async function isOllamaRunning() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Use Ollama to suggest relevant tags for the pack
 */
async function suggestTagsWithOllama(pack, availableTags) {
  try {
    const extensionNames = pack.extensions.map(ext => ext.name || 'Unknown').join(', ');

    const prompt = `You are a tag suggestion assistant. Given a browser extension pack, suggest 2-3 relevant tags from this list: ${availableTags.join(', ')}.

Pack name: ${pack.name}
Description: ${pack.description || 'No description'}
Extensions: ${extensionNames}

Respond with ONLY the tag names, comma-separated, nothing else. Example: productivity,dev-tools`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:0.5b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 50
        }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) return [];

    const data = await response.json();
    const suggestedText = data.response.trim().toLowerCase();

    // Parse suggested tags
    const suggested = suggestedText.split(',').map(t => t.trim());

    // Only return tags that exist in availableTags
    return suggested.filter(tag => availableTags.includes(tag));
  } catch {
    return [];
  }
}

/**
 * Run the publish wizard (creates pack if needed, then publishes)
 * @param {string} packPath - Path to pack file (optional)
 * @param {Object} options - Publish options
 */
export async function runPublishWizard(packPath = null, options = {}) {
  clearScreen();

  console.log(colors.bold('\n  📦 Publish to Registry\n'));

  // Step 1: Get or create pack
  if (!packPath) {
    // Try to find existing pack
    packPath = await findPackFileSmart('Select pack to publish:');

    // If no pack found, create one!
    if (!packPath) {
      console.log(colors.muted('\nNo pack found. Creating one first...\n'));
      await new Promise(resolve => setTimeout(resolve, 1000));

      packPath = await runCreateWizard();

      if (!packPath) {
        console.log(colors.muted('\nPublish cancelled.\n'));
        return;
      }

      console.log(colors.success(`\n✓ Pack created: ${packPath}\n`));
      console.log(colors.bold('  📦 Publishing to Registry\n'));
    }
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

    const availableTags = [
      'productivity',
      'privacy',
      'dev-tools',
      'social',
      'entertainment',
      'accessibility',
      'security',
      'design'
    ];

    // Try to auto-suggest tags using Ollama
    let preselectedTags = [];
    const ollamaRunning = await isOllamaRunning();

    if (ollamaRunning) {
      const spinner = ora('Suggesting tags with Ollama...').start();
      preselectedTags = await suggestTagsWithOllama(pack, availableTags);

      if (preselectedTags.length > 0) {
        spinner.succeed(`Suggested tags: ${preselectedTags.join(', ')}`);
      } else {
        spinner.info('Could not suggest tags');
      }
    }

    const { selectedTags } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTags',
        message: 'Select tags (optional):',
        choices: availableTags.map(tag => ({
          name: tag,
          value: tag,
          checked: preselectedTags.includes(tag) // Pre-select Ollama suggestions
        }))
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
