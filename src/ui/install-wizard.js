/**
 * Interactive wizard for installing extension packs
 */

import inquirer from 'inquirer';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { resolve } from 'path';
import { existsSync, readdirSync } from 'fs';
import { colors, successBox, errorBox, formatPackSummary, clearScreen } from './helpers.js';
import { readPackFile } from '../core/pack-codec.js';
import { installPack } from '../core/pack-installer.js';
import { detectBrowsers, getPreferredBrowser } from '../utils/browser-detector.js';
import { getConfig } from '../utils/config-manager.js';

/**
 * Run the install pack wizard
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<boolean>} True if installed successfully
 */
export async function runInstallWizard(packFile = null) {
  clearScreen();

  console.log(colors.bold('\n  Install Extension Pack\n'));

  // Step 1: Get pack file
  let selectedPackFile = packFile;

  if (!selectedPackFile) {
    selectedPackFile = await selectPackFile();
    if (!selectedPackFile) {
      return false;
    }
  }

  // Resolve path
  const packPath = resolve(selectedPackFile);

  if (!existsSync(packPath)) {
    console.log(errorBox(`Pack file not found: ${packPath}`));
    return false;
  }

  // Step 2: Read and validate pack
  const spinner = ora('Reading pack file...').start();

  let pack;
  try {
    pack = await readPackFile(packPath);
    spinner.succeed('Pack file loaded');
  } catch (err) {
    spinner.fail('Failed to read pack file');
    console.log(errorBox(err.message));
    return false;
  }

  // Step 3: Show pack summary
  console.log();
  console.log(formatPackSummary(pack));
  console.log();

  // Show store extensions warning upfront if any
  const storeExtensions = pack.extensions.filter(ext => ext.type === 'store');
  if (storeExtensions.length > 0) {
    console.log(colors.warning(`Note: ${storeExtensions.length} extension(s) require manual install from Chrome Web Store.`));
    storeExtensions.forEach(ext => {
      console.log(colors.muted(`  ${ext.name}${ext.id ? ` — chrome.google.com/webstore/detail/${ext.id}` : ''}`));
    });
    console.log();
  }

  // Step 4: Confirm installation
  const { confirmInstall } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmInstall',
      message: 'Install this pack?',
      default: true
    }
  ]);

  if (!confirmInstall) {
    console.log(colors.muted('\nInstallation cancelled.\n'));
    return false;
  }

  // Step 5: Select browser
  const browser = await selectBrowser();

  if (!browser) {
    console.log(errorBox('No supported browser found. Install Brave, Chrome, or Chromium.'));
    return false;
  }

  console.log(colors.muted(`\nUsing ${browser.displayName}\n`));

  // Step 6: Install pack
  const progressBar = new cliProgress.SingleBar({
    format: 'Installing |{bar}| {percentage}% | {extension}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  let currentExtension = '';

  const result = await installPack(packPath, browser, {
    autoKill: true,
    countdown: 3,
    onProgress: (progress) => {
      if (progress.current === 1) {
        progressBar.start(progress.total, 0, { extension: '' });
      }

      currentExtension = progress.extension.name;

      if (progress.downloadProgress) {
        const displayText = `${currentExtension} (downloading ${Math.round(progress.downloadProgress)}%)`;
        progressBar.update(progress.current - 0.5, { extension: displayText });
      } else {
        progressBar.update(progress.current, { extension: currentExtension });
      }

      if (progress.current === progress.total) {
        progressBar.stop();
      }
    },
    onCountdown: (seconds) => {
      console.log(colors.warning(`\n${browser.displayName} will relaunch in ${seconds}...`));
    }
  });

  // Step 7: Show result
  if (result.success) {
    console.log(successBox(
      `${result.extensionCount} extension(s) installed\n` +
      `${browser.displayName} relaunched with extensions loaded.`
    ));

    // Show errors if any
    if (result.results.errors && result.results.errors.length > 0) {
      console.log(colors.error('\nSome extensions failed to install:\n'));
      result.results.errors.forEach(err => {
        console.log(colors.muted(`  ${err.extension.name}: ${err.error}`));
      });
      console.log();
    }

    return true;
  } else {
    console.log(errorBox(result.message));

    if (result.reason === 'browser_running') {
      console.log(colors.muted('\nClose the browser and try again.\n'));
    }

    return false;
  }
}

/**
 * Select a pack file interactively
 * @returns {Promise<string|null>}
 */
async function selectPackFile() {
  // Look for .extpack files in current directory
  const cwd = process.cwd();
  const files = readdirSync(cwd).filter(f => f.endsWith('.extpack'));

  if (files.length === 0) {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to pack file:',
        validate: (input) => {
          if (!input) {
            return 'Pack file path is required';
          }
          if (!input.endsWith('.extpack')) {
            return 'File must have .extpack extension';
          }
          return true;
        }
      }
    ]);

    return filePath;
  }

  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: 'Select pack file:',
      choices: [
        ...files.map(f => ({
          name: f,
          value: f
        })),
        new inquirer.Separator(),
        {
          name: colors.muted('Enter custom path...'),
          value: '__custom__'
        }
      ]
    }
  ]);

  if (selectedFile === '__custom__') {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to pack file:',
        validate: (input) => {
          if (!input) {
            return 'Pack file path is required';
          }
          return true;
        }
      }
    ]);

    return filePath;
  }

  return selectedFile;
}

/**
 * Select browser to use
 * @returns {Promise<Object|null>}
 */
async function selectBrowser() {
  const config = getConfig();
  const browsers = detectBrowsers();

  if (browsers.length === 0) {
    return null;
  }

  if (browsers.length === 1) {
    return browsers[0];
  }

  // Get preferred browser
  const preferred = getPreferredBrowser(config.browser.preference);

  if (preferred && !process.env.EXT_PACK_SELECT_BROWSER) {
    return preferred;
  }

  const { selectedBrowser } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedBrowser',
      message: 'Select browser:',
      choices: browsers.map(b => ({
        name: b.displayName + (b === preferred ? colors.muted(' (preferred)') : ''),
        value: b.name
      }))
    }
  ]);

  return browsers.find(b => b.name === selectedBrowser);
}

export default {
  runInstallWizard
};
