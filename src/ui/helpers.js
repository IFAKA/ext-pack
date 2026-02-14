import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';

/**
 * Color helpers
 */
export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray,
  highlight: chalk.cyan,
  bold: chalk.bold
};

/**
 * Create a nice header with gradient
 * @param {string} text
 * @returns {string}
 */
export function header(text) {
  const themed = gradient.pastel.multiline(text);
  return themed;
}

/**
 * Create a boxed message
 * @param {string} message
 * @param {Object} options
 * @returns {string}
 */
export function box(message, options = {}) {
  const defaults = {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  };

  return boxen(message, { ...defaults, ...options });
}

/**
 * Success box
 * @param {string} message
 * @returns {string}
 */
export function successBox(message) {
  return box(colors.success(message), {
    borderColor: 'green',
    title: '✅ Success'
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
    title: '❌ Error'
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
    title: '⚠️  Warning'
  });
}

/**
 * Info box
 * @param {string} message
 * @returns {string}
 */
export function infoBox(message) {
  return box(colors.info(message), {
    borderColor: 'blue',
    title: 'ℹ️  Info'
  });
}

/**
 * Format pack summary
 * @param {Object} pack
 * @returns {string}
 */
export function formatPackSummary(pack) {
  const lines = [
    colors.bold(`Name: `) + pack.name,
    colors.bold(`Description: `) + (pack.description || 'No description'),
    colors.bold(`Author: `) + (pack.author || 'Unknown'),
    colors.bold(`Extensions: `) + pack.extensions.length,
    colors.bold(`Created: `) + (pack.created || 'Unknown')
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
    const type = colors.muted(`(${ext.type || 'local'})`);

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
 * Print banner
 */
export function printBanner() {
  const banner = `
███████╗██╗  ██╗████████╗      ██████╗  █████╗  ██████╗██╗  ██╗
██╔════╝╚██╗██╔╝╚══██╔══╝      ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
█████╗   ╚███╔╝    ██║   █████╗██████╔╝███████║██║     █████╔╝
██╔══╝   ██╔██╗    ██║   ╚════╝██╔═══╝ ██╔══██║██║     ██╔═██╗
███████╗██╔╝ ██╗   ██║         ██║     ██║  ██║╚██████╗██║  ██╗
╚══════╝╚═╝  ╚═╝   ╚═╝         ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

  console.log(header(banner));
  console.log(colors.muted('         Bundle and install extensions with zero friction\n'));
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
