/**
 * Interactive wizard for installing extension packs
 */

import inquirer from 'inquirer';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { colors, successBox, errorBox, warningBox, formatPackSummary, clearScreen, findPackFileSmart, pause } from './helpers.js';
import { readPackFile } from '../core/pack-codec.js';
import { installPack } from '../core/pack-installer.js';
import { detectBrowsers, getPreferredBrowser } from '../utils/browser-detector.js';
import { getConfig } from '../utils/config-manager.js';
import { getPackInfo, downloadPack, isRegistryAccessible } from '../core/registry-client.js';

/**
 * Run the install pack wizard
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<boolean>} True if installed successfully
 */
export async function runInstallWizard(packFile = null) {
  clearScreen();

  console.log(colors.bold('\n  Install Extension Pack\n'));

  // Step 1: Get pack file or name (smart auto-detection!)
  let selectedPackFile = packFile;
  let packPath = null;
  let isFromRegistry = false;

  if (!selectedPackFile) {
    selectedPackFile = await findPackFileSmart();
    if (!selectedPackFile) {
      return false;
    }
  }

  // Detect if it's a registry name or file path
  if (!selectedPackFile.endsWith('.extpack') && !existsSync(selectedPackFile)) {
    // Might be a registry pack name
    const checkSpinner = ora('Checking registry...').start();

    try {
      const accessible = await isRegistryAccessible();

      if (!accessible) {
        checkSpinner.fail('Registry not accessible');
        console.log(errorBox(
          'Cannot connect to registry.\n\n' +
          'If you meant to install a local file, make sure the path is correct.'
        ));
        await pause();
        return false;
      }

      const packInfo = await getPackInfo(selectedPackFile);

      if (!packInfo) {
        checkSpinner.fail('Pack not found');
        console.log(errorBox(
          `Pack "${selectedPackFile}" not found in registry.\n\n` +
          'Try searching: ext-pack search <query>'
        ));
        await pause();
        return false;
      }

      checkSpinner.succeed(`Found pack: ${packInfo.name}`);
      isFromRegistry = true;

      // Download pack to temp directory
      const tempDir = tmpdir();
      packPath = join(tempDir, `${packInfo.id}.extpack`);

      const downloadSpinner = ora('Downloading pack...').start();

      await downloadPack(packInfo.id, packPath, (progress) => {
        downloadSpinner.text = `Downloading... ${progress.progress}%`;
      });

      downloadSpinner.succeed('Pack downloaded');

    } catch (error) {
      checkSpinner.fail('Failed to fetch from registry');
      console.log(errorBox(`Error: ${error.message}`));
      await pause();
      return false;
    }
  } else {
    // Local file path
    packPath = resolve(selectedPackFile);

    if (!existsSync(packPath)) {
      console.log(errorBox(`Pack file not found: ${packPath}`));
      await pause();
      return false;
    }
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
    await pause();
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
    console.log(errorBox('Installation cancelled.'));
    await pause();
    return false;
  }

  // Step 5: Select browser
  const browser = await selectBrowser();

  if (!browser) {
    console.log(errorBox('No supported browser found. Install Brave, Chrome, or Chromium.'));
    await pause();
    return false;
  }

  console.log(colors.muted(`\nUsing ${browser.displayName}\n`));

  // Step 6: Check if browser is already running and warn
  const { isBrowserRunning } = await import('../core/browser-launcher.js');
  const isRunning = await isBrowserRunning(browser.processName);

  if (isRunning) {
    console.log(warningBox(
      `${browser.displayName} is currently running.\n\n` +
      colors.muted('The browser will be closed and relaunched with extensions.')
    ));

    const { confirmProceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmProceed',
        message: 'Close browser and continue?',
        default: true
      }
    ]);

    if (!confirmProceed) {
      console.log(errorBox('Installation cancelled.'));
      await pause();
      return false;
    }

    console.log();
  }

  // Step 8: Install pack
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
    const hasErrors = result.results.errors && result.results.errors.length > 0;
    const successCount = result.extensionCount;
    const totalCount = pack.extensions.length;
    const failureCount = totalCount - successCount;

    // Show different message for partial vs complete success
    if (hasErrors && failureCount > 0) {
      // Partial success
      console.log(warningBox(
        `Partial installation.\n\n` +
        `Installed: ${successCount} of ${totalCount} extensions\n` +
        `Failed: ${failureCount}\n` +
        `Browser: ${browser.displayName}\n\n` +
        colors.muted('Successfully installed extensions are loaded in browser.')
      ));

      // Show detailed error list
      console.log(colors.error('Failed extensions:\n'));
      result.results.errors.forEach((err, i) => {
        console.log(colors.muted(`  ${i + 1}. ${err.extension.name}`));
        console.log(colors.muted(`     ${err.error}`));
      });
      console.log();

      // Suggest next actions
      console.log(colors.muted('Tip: Check that failed extensions are compatible with your browser.\n'));
    } else {
      // Complete success
      console.log(successBox(
        `Installation successful!\n\n` +
        `Extensions: ${successCount}\n` +
        `Browser: ${browser.displayName}\n\n` +
        colors.muted('All extensions loaded and browser relaunched.')
      ));
    }

    // Suggest next actions
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do next?',
        choices: [
          {
            name: 'View installed packs',
            value: 'list',
            short: 'List'
          },
          {
            name: 'Install another pack',
            value: 'install',
            short: 'Install'
          },
          new inquirer.Separator(),
          {
            name: colors.muted('Return to main menu'),
            value: 'menu',
            short: 'Menu'
          }
        ]
      }
    ]);

    if (nextAction === 'list') {
      const { runPackManager } = await import('./pack-manager.js');
      await runPackManager();
    } else if (nextAction === 'install') {
      await runInstallWizard();
    }

    return true;
  } else {
    console.log(errorBox(
      `Installation failed.\n\n` +
      `${result.message}` +
      (result.reason === 'browser_running' ? '\n\n' + colors.muted('Close the browser and try again.') : '')
    ));

    await pause();
    return false;
  }
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
