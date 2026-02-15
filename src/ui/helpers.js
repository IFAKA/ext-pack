import chalk from 'chalk';
import boxen from 'boxen';
import { readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Color helpers — flat, terminal-native palette
 */
export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.white,
  muted: chalk.dim,
  highlight: chalk.bold.white,
  bold: chalk.bold,
  accent: chalk.white
};

/**
 * Create a boxed message with color styling
 * @param {string} message - Message to display
 * @param {'success'|'error'|'warning'|'info'} type - Box type
 * @returns {string}
 */
function coloredBox(message, type = 'info') {
  const configs = {
    success: { color: null, borderColor: 'green', dimBorder: false },
    error: { color: colors.error, borderColor: 'red', dimBorder: false },
    warning: { color: colors.warning, borderColor: 'yellow', dimBorder: false },
    info: { color: null, borderColor: 'white', dimBorder: true }
  };

  const cfg = configs[type];
  const msg = cfg.color ? cfg.color(message) : message;

  return boxen(msg, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: cfg.borderColor,
    dimBorder: cfg.dimBorder
  });
}

// Exported box variants
export const successBox = (msg) => coloredBox(msg, 'success');
export const errorBox = (msg) => coloredBox(msg, 'error');
export const warningBox = (msg) => coloredBox(msg, 'warning');
export const infoBox = (msg) => coloredBox(msg, 'info');

/**
 * Format pack summary
 * @param {Object} pack
 * @returns {string}
 */
export function formatPackSummary(pack) {
  const lines = [
    colors.muted('Name:        ') + colors.highlight(pack.name),
    colors.muted('Description: ') + (pack.description || 'No description'),
    colors.muted('Author:      ') + (pack.author || 'Unknown'),
    colors.muted('Extensions:  ') + pack.extensions.length,
    colors.muted('Created:     ') + (pack.created || 'Unknown')
  ];

  return lines.join('\n');
}

/**
 * Format extension list
 * @param {Array} extensions
 * @returns {string}
 */
export function formatExtensionList(extensions) {
  return extensions.map((ext, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(ext.name);
    const version = ext.version ? colors.muted(`v${ext.version}`) : '';
    const type = colors.muted(`[${ext.type || 'local'}]`);

    return `  ${num} ${name} ${version} ${type}`;
  }).join('\n');
}

/**
 * Clear screen
 */
export function clearScreen() {
  console.clear();
}

/**
 * Print banner — clean, flat, no rainbow
 */
export function printBanner() {
  const banner = colors.bold.white(
    '\n  ext-pack'
  );
  const tagline = colors.muted('  Bundle and install browser extensions\n');

  console.log(banner);
  console.log(tagline);
}

/**
 * Format time ago
 * @param {string} dateString
 * @returns {string}
 */
export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [name, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Pause for user to read
 * @param {string} message
 */
export async function pause(message = 'Press Enter to continue...') {
  const inquirer = (await import('inquirer')).default;
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: colors.muted(message)
    }
  ]);
}

/**
 * Copy text to clipboard on macOS (prompts user first)
 * @param {string} text - Text to copy
 * @param {string} promptMessage - Confirmation prompt message
 * @returns {Promise<boolean>} Whether text was copied
 */
export async function copyToClipboardMac(text, promptMessage = 'Copy to clipboard?') {
  if (process.platform !== 'darwin') return false;

  const inquirer = (await import('inquirer')).default;
  const { exec } = await import('child_process');

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: promptMessage,
      default: true
    }
  ]);

  if (confirmed) {
    exec(`echo "${text}" | pbcopy`);
    console.log(colors.success('\nCopied to clipboard.\n'));
    return true;
  }

  return false;
}

/**
 * Smart auto-detection of pack files
 * Returns pack file automatically if only one found, otherwise prompts
 * @param {string} promptMessage
 * @param {boolean} showInstalled - Include installed packs in list
 * @returns {Promise<string|null>} Pack file path or null if cancelled
 */
export async function findPackFileSmart(promptMessage = 'Select pack file:', showInstalled = false) {
  const { existsSync, readdirSync } = await import('fs');
  const { join } = await import('path');
  const { homedir } = await import('os');

  // 1. Check current directory first
  const cwd = process.cwd();
  const localFiles = existsSync(cwd)
    ? readdirSync(cwd).filter(f => f.endsWith('.extpack'))
    : [];

  // If exactly 1 file in current directory, use it automatically!
  if (localFiles.length === 1) {
    const packPath = join(cwd, localFiles[0]);
    console.log(colors.muted(`Using pack: ${localFiles[0]}\n`));
    return packPath;
  }

  // 2. Check ~/.ext-pack/packs/ directory
  const packsDir = join(homedir(), '.ext-pack', 'packs');
  const defaultPacks = existsSync(packsDir)
    ? readdirSync(packsDir).filter(f => f.endsWith('.extpack'))
    : [];

  // If no local files but exactly 1 in default location, use it!
  if (localFiles.length === 0 && defaultPacks.length === 1) {
    const packPath = join(packsDir, defaultPacks[0]);
    console.log(colors.muted(`Using pack: ${defaultPacks[0]}\n`));
    return packPath;
  }

  // Multiple files found or none found - need to prompt
  return selectPackFile(promptMessage, showInstalled);
}

/**
 * Select a pack file interactively
 * @param {string} promptMessage - Prompt message
 * @param {boolean} showInstalled - Include installed packs from registry
 * @returns {Promise<string|null>} Selected pack file path or null
 */
export async function selectPackFile(promptMessage = 'Select pack file:', showInstalled = false) {
  const inquirer = (await import('inquirer')).default;
  const { existsSync, readdirSync } = await import('fs');

  const choices = [];

  // Add installed packs if requested
  if (showInstalled) {
    const { getInstalledPacks } = await import('../utils/config-manager.js');
    const registry = getInstalledPacks();

    if (registry.packs.length > 0) {
      choices.push(new inquirer.Separator(colors.muted('Installed:')));
      registry.packs.forEach(pack => {
        if (pack.file && existsSync(pack.file)) {
          choices.push({
            name: `${pack.name} ${colors.muted(`(${pack.extensions.length} extensions)`)}`,
            value: pack.file
          });
        }
      });
    }
  }

  // Add local .extpack files from current directory
  const cwd = process.cwd();
  const localFiles = existsSync(cwd)
    ? readdirSync(cwd).filter(f => f.endsWith('.extpack'))
    : [];

  if (localFiles.length > 0) {
    if (choices.length > 0) {
      choices.push(new inquirer.Separator(colors.muted('Current directory:')));
    }
    localFiles.forEach(file => {
      choices.push({ name: file, value: file });
    });
  }

  // If no choices, ask for custom path directly
  if (choices.length === 0) {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to pack file:',
        validate: (input) => {
          if (!input) return 'Pack file path is required';
          if (!input.endsWith('.extpack')) return 'File must have .extpack extension';
          return true;
        }
      }
    ]);
    return filePath;
  }

  // Add custom path option
  choices.push(new inquirer.Separator());
  choices.push({
    name: colors.muted('Enter custom path...'),
    value: '__custom__'
  });

  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: promptMessage,
      choices
    }
  ]);

  // Handle custom path
  if (selectedFile === '__custom__') {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to pack file:',
        validate: (input) => {
          if (!input) return 'Pack file path is required';
          return true;
        }
      }
    ]);
    return filePath;
  }

  return selectedFile;
}

/**
 * Directories to ignore during recursive search
 */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.svelte-kit',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '.turbo',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  '.env',
  'vendor',
  'target',
  'bin',
  'obj',
  '.gradle',
  '.m2',
  'bower_components',
  '.DS_Store',
  'tmp',
  'temp',
  '.meteor',
  '.Trash',
  'Library',
  'Applications'
]);

/**
 * Recursively find all directories, ignoring common build/dependency folders
 * @param {string} dir - Directory to search
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} currentDepth - Current depth (internal use)
 * @returns {Array<string>} List of directory paths
 */
function findAllDirectories(dir, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const dirs = [];

  // Only include current directory at root level
  if (currentDepth === 0) {
    dirs.push(dir);
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden dirs

      const fullPath = join(dir, entry.name);

      // Add this directory
      dirs.push(fullPath);

      // Recursively search subdirectories
      const subdirs = findAllDirectories(fullPath, maxDepth, currentDepth + 1);
      dirs.push(...subdirs);
    }
  } catch (err) {
    // Skip directories we can't read
  }

  return dirs;
}

/**
 * Interactive fuzzy directory finder
 * Recursively searches entire directory tree with fuzzy matching
 * @param {string} message - Prompt message
 * @param {string} basePath - Starting directory path
 * @returns {Promise<string>} Selected directory path
 */
export async function browseDirectory(message, basePath) {
  const inquirer = (await import('inquirer')).default;
  const autocomplete = (await import('inquirer-autocomplete-prompt')).default;
  const ora = (await import('ora')).default;

  // Register autocomplete prompt
  inquirer.registerPrompt('autocomplete', autocomplete);

  // Scan for all directories
  const spinner = ora('Scanning directories...').start();
  const allDirs = findAllDirectories(basePath);
  spinner.stop();

  console.log(colors.muted(`Found ${allDirs.length} directories\n`));

  // Create searchable choices with relative paths for display
  const choices = allDirs.map(dir => ({
    name: dir === basePath ? '.' : relative(basePath, dir),
    value: dir
  }));

  // Sort by depth (shallower first) and then alphabetically
  choices.sort((a, b) => {
    const depthA = a.name.split('/').length;
    const depthB = b.name.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.name.localeCompare(b.name);
  });

  const { directory } = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'directory',
      message,
      source: async (_answersSoFar, input) => {
        if (!input) return choices;

        // Fuzzy search: filter choices that contain the input (case-insensitive)
        const filtered = choices.filter(choice =>
          choice.name.toLowerCase().includes(input.toLowerCase())
        );

        return filtered;
      },
      pageSize: 15
    }
  ]);

  return directory;
}
