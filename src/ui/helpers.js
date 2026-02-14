import chalk from 'chalk';
import boxen from 'boxen';

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
