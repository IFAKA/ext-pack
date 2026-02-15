/**
 * Smart wizard for creating extension packs
 * Philosophy: Smart defaults, minimal prompts, zero configuration
 */

import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import ora from 'ora';
import { basename, resolve, join } from 'path';
import { colors, successBox, errorBox, clearScreen, pause, browseDirectory } from './helpers.js';
import { scanDirectory } from '../core/extension-scanner.js';
import { createPack, writePackFile } from '../core/pack-codec.js';
import { getPlatform } from '../utils/browser-detector.js';
import { bundleExtension, calculateBundleSize } from '../core/bundle-codec.js';

/**
 * Run the create pack wizard with smart defaults
 * @param {Object} options - Command options
 * @param {string} options.name - Pack name (optional)
 * @param {string} options.dir - Directory to scan (optional)
 * @param {string} options.output - Output file path (optional)
 * @returns {Promise<string|null>} Path to created pack file or null if cancelled
 */
export async function runCreateWizard(options = {}) {
  clearScreen();

  console.log(colors.bold('\n  Create Extension Pack\n'));

  // Smart detection: Find extensions automatically
  const detectSpinner = ora('Looking for extensions...').start();

  let scanDir;
  let packName;

  // 1. Try current directory first if no dir specified
  if (!options.dir) {
    const cwd = process.cwd();
    const cwdScan = scanDirectory(cwd, { maxDepth: 2 });

    if (cwdScan.extensions.length > 0) {
      // Found extensions in current directory - use it!
      scanDir = cwd;
      packName = options.name || basename(cwd);
      detectSpinner.succeed(`Found ${cwdScan.extensions.length} extension(s) in current directory`);
    } else {
      // Not in current dir, check common browser locations
      const candidates = detectExtensionDirs();
      detectSpinner.stop();

      if (candidates.length === 0) {
        console.log(errorBox(
          'No extensions found.\n\n' +
          colors.muted('Run this command from a directory containing extensions,\n') +
          colors.muted('or specify a directory with: ext-pack create -d <path>')
        ));
        await pause();
        return null;
      }

      // Always ask user to choose (don't auto-select)
      const choices = candidates.map(c => ({
        name: `${c.label} ${colors.muted(`(${c.count} extension${c.count !== 1 ? 's' : ''})`)}`,
        value: c.path,
        short: c.label
      }));

      // Add custom directory option
      choices.push(new inquirer.Separator());
      choices.push({
        name: colors.muted('Custom directory...'),
        value: '__custom__',
        short: 'Custom'
      });

      const { selectedDir } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedDir',
          message: 'Where to scan for extensions:',
          choices
        }
      ]);

      if (selectedDir === '__custom__') {
        // Use fuzzy finder to browse directories
        scanDir = await browseDirectory('Browse for directory with extensions:', homedir());
        if (!scanDir) {
          console.log(colors.muted('\nCancelled.\n'));
          return null;
        }
        packName = options.name || basename(scanDir);
      } else {
        scanDir = selectedDir;
        const selected = candidates.find(c => c.path === selectedDir);
        packName = options.name || selected.label.toLowerCase() + '-extensions';
      }
    }
  } else {
    // Directory specified via option
    scanDir = options.dir;
    packName = options.name || basename(scanDir);
    detectSpinner.succeed('Scanning specified directory');
  }

  // 2. Scan the selected directory
  const spinner = ora('Scanning for extensions...').start();
  const scanPath = resolve(scanDir);

  const { extensions, errors } = scanDirectory(scanPath, {
    onProgress: (progress) => {
      if (progress.extensionsFound > 0) {
        spinner.text = `Scanning... (${progress.extensionsFound} found)`;
      }
    }
  });

  spinner.succeed(`Found ${extensions.length} extension(s)`);

  if (extensions.length === 0) {
    console.log(errorBox(
      'No valid extensions found in this directory.\n\n' +
      colors.muted('Extensions must have a manifest.json file at their root.')
    ));

    if (errors.length > 0) {
      console.log(colors.warning('\nErrors encountered:'));
      errors.forEach(err => {
        console.log(colors.muted(`  ${err.path}: ${err.error}`));
      });
      console.log();
    }

    await pause();
    return null;
  }

  // Show what we found
  console.log();
  extensions.forEach((ext, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(ext.name);
    const version = colors.muted(`v${ext.version}`);
    console.log(`  ${num} ${name} ${version}`);
  });
  console.log();

  // 3. Let user select which extensions to include
  let selectedExtensions;

  if (extensions.length === 1) {
    // Only one extension - auto-include it
    selectedExtensions = extensions;
    console.log(colors.success(`Including extension\n`));
  } else {
    // Multiple extensions - let user choose
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select extensions to include:',
        choices: extensions.map((ext, i) => ({
          name: `${ext.name} ${colors.muted(`v${ext.version}`)}`,
          value: i,
          checked: false // All unchecked by default - user must explicitly select
        })),
        validate: (answer) => {
          if (answer.length < 1) {
            return 'You must select at least one extension.';
          }
          return true;
        }
      }
    ]);

    selectedExtensions = selected.map(i => extensions[i]);
    console.log(colors.success(`Including ${selectedExtensions.length} extension(s)\n`));
  }

  // 4. Bundle extensions
  const bundleSpinner = ora('Bundling extensions...').start();

  let totalBundledSize = 0;
  const bundledExtensions = [];

  for (const ext of selectedExtensions) {
    if (ext.type === 'local') {
      try {
        const bundled = await bundleExtension(ext.path);
        const bundledSize = calculateBundleSize(bundled);

        bundledExtensions.push(bundled);
        totalBundledSize += bundledSize;
      } catch (err) {
        bundleSpinner.fail(`Failed to bundle ${ext.name}`);
        console.log(errorBox(
          `Failed to bundle extension: ${ext.name}\n\n` +
          colors.muted(`Error: ${err.message}`)
        ));
        await pause();
        return null;
      }
    } else {
      bundledExtensions.push(ext);
    }
  }

  const bundledSizeMB = (totalBundledSize / 1024 / 1024).toFixed(2);
  bundleSpinner.succeed(`Extensions bundled (${bundledSizeMB} MB compressed)`);

  // 5. Get pack metadata from user
  console.log();
  const { finalPackName, packDescription } = await inquirer.prompt([
    {
      type: 'input',
      name: 'finalPackName',
      message: 'Pack name:',
      default: packName,
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Pack name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'packDescription',
      message: 'Description:',
      default: `${bundledExtensions.length} browser extensions`,
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Description cannot be empty';
        }
        return true;
      }
    }
  ]);

  const author = getAuthor();

  console.log(colors.muted(`Author: ${author}\n`));

  // 6. Smart output location
  const packsDir = join(homedir(), '.ext-pack', 'packs');
  if (!existsSync(packsDir)) {
    mkdirSync(packsDir, { recursive: true });
  }

  const defaultFileName = `${finalPackName.toLowerCase().replace(/\s+/g, '-')}.extpack`;
  const outputFile = options.output || join(packsDir, defaultFileName);

  // 7. Create and save pack
  const pack = createPack(finalPackName, packDescription, author, bundledExtensions);
  const saveSpinner = ora('Saving pack...').start();

  try {
    await writePackFile(resolve(outputFile), pack);
    saveSpinner.succeed('Pack created successfully');

    console.log(successBox(
      `Pack: ${colors.highlight(pack.name)}\n\n` +
      `File: ${outputFile}\n` +
      `Extensions: ${bundledExtensions.length}\n` +
      `Size: ${bundledSizeMB} MB`
    ));

    // Ask if user wants to publish to registry (unless --local-only flag)
    if (!options.localOnly) {
      console.log();
      const { shouldPublish } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldPublish',
          message: 'Publish to registry?',
          default: false
        }
      ]);

      if (shouldPublish) {
        console.log(colors.muted('\nPublishing to registry...\n'));
        const { runPublishWizard } = await import('./publish-wizard.js');
        await runPublishWizard(outputFile, options);
      } else {
        console.log(colors.muted('\nPack saved locally. Share it with friends!\n'));
        // Show shareable URL
        const { generateUrl } = await import('../core/pack-codec.js');
        const shareUrl = generateUrl(pack);
        console.log(colors.muted(`Share URL: ${shareUrl}\n`));
      }
    }

    return outputFile;
  } catch (err) {
    saveSpinner.fail('Failed to create pack');

    console.log(errorBox(
      `Failed to save pack file.\n\n` +
      colors.muted(`Error: ${err.message}`)
    ));

    await pause();
    return null;
  }
}

/**
 * Get author name from git config or environment
 */
function getAuthor() {
  try {
    // Try git config first
    const gitUser = execSync('git config user.name', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (gitUser) return gitUser;
  } catch {}

  // Fallback to USER env var
  return process.env.USER || 'unknown';
}

/**
 * Known browser extension directories per platform
 */
const EXTENSION_DIRS = {
  darwin: [
    { label: 'Brave', path: join(homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Extensions') },
    { label: 'Chrome', path: join(homedir(), 'Library/Application Support/Google/Chrome/Default/Extensions') },
    { label: 'Chromium', path: join(homedir(), 'Library/Application Support/Chromium/Default/Extensions') },
    { label: 'Edge', path: join(homedir(), 'Library/Application Support/Microsoft Edge/Default/Extensions') }
  ],
  linux: [
    { label: 'Brave', path: join(homedir(), '.config/BraveSoftware/Brave-Browser/Default/Extensions') },
    { label: 'Chrome', path: join(homedir(), '.config/google-chrome/Default/Extensions') },
    { label: 'Chromium', path: join(homedir(), '.config/chromium/Default/Extensions') },
    { label: 'Edge', path: join(homedir(), '.config/microsoft-edge/Default/Extensions') }
  ],
  win32: [
    { label: 'Brave', path: join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/User Data/Default/Extensions') },
    { label: 'Chrome', path: join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/Extensions') },
    { label: 'Chromium', path: join(process.env.LOCALAPPDATA || '', 'Chromium/User Data/Default/Extensions') },
    { label: 'Edge', path: join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data/Default/Extensions') }
  ]
};

/**
 * Detect directories that contain extensions
 */
function detectExtensionDirs() {
  const results = [];
  const platform = getPlatform();
  const knownDirs = EXTENSION_DIRS[platform] || [];

  for (const dir of knownDirs) {
    if (existsSync(dir.path)) {
      const scan = scanDirectory(dir.path, { maxDepth: 2 });
      if (scan.extensions.length > 0) {
        results.push({ label: dir.label, path: dir.path, count: scan.extensions.length });
      }
    }
  }

  return results;
}
