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
 * Create a boxed message
 * @param {string} message
 * @param {Object} options
 * @returns {string}
 */
export function box(message, options = {}) {
  const defaults = {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'white',
    dimBorder: true
  };

  return boxen(message, { ...defaults, ...options });
}

/**
 * Success box
 * @param {string} message
 * @returns {string}
 */
export function successBox(message) {
  return box(message, {
    borderColor: 'green',
    dimBorder: false
  });
}

/**
 * Error box
 * @param {string} message
 * @returns {string}
 */
export function errorBox(message) {
  return box(colors.error(message), {
    borderColor: 'red',
    dimBorder: false
  });
}

/**
 * Warning box
 * @param {string} message
 * @returns {string}
 */
export function warningBox(message) {
  return box(colors.warning(message), {
    borderColor: 'yellow',
    dimBorder: false
  });
}

/**
 * Info box
 * @param {string} message
 * @returns {string}
 */
export function infoBox(message) {
  return box(message, {
    borderColor: 'white',
    dimBorder: true
  });
}

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

  const dirs = [dir]; // Include current directory

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
