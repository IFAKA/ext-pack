import inquirer from 'inquirer';
import { colors, printBanner, clearScreen } from './helpers.js';
import { createCommand } from '../commands/create.js';
import { installCommand } from '../commands/install.js';
import { listCommand } from '../commands/list.js';
import { shareCommand } from '../commands/share.js';

const MENU_CHOICES = {
  CREATE: 'create',
  INSTALL: 'install',
  LIST: 'list',
  SHARE: 'share',
  HELP: 'help',
  EXIT: 'exit'
};

/**
 * Show main menu
 * @returns {Promise<void>}
 */
export async function showMainMenu() {
  clearScreen();
  printBanner();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        {
          name: colors.success('📦 Create a new extension pack'),
          value: MENU_CHOICES.CREATE,
          short: 'Create pack'
        },
        {
          name: colors.info('⚡ Install an extension pack'),
          value: MENU_CHOICES.INSTALL,
          short: 'Install pack'
        },
        {
          name: colors.highlight('📋 List my installed packs'),
          value: MENU_CHOICES.LIST,
          short: 'List packs'
        },
        {
          name: colors.warning('🔗 Share a pack'),
          value: MENU_CHOICES.SHARE,
          short: 'Share pack'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('❓ Help & Tutorial'),
          value: MENU_CHOICES.HELP,
          short: 'Help'
        },
        {
          name: colors.muted('👋 Exit'),
          value: MENU_CHOICES.EXIT,
          short: 'Exit'
        }
      ]
    }
  ]);

  await handleMenuAction(action);
}

/**
 * Handle menu action
 * @param {string} action
 * @returns {Promise<void>}
 */
async function handleMenuAction(action) {
  try {
    switch (action) {
      case MENU_CHOICES.CREATE:
        await createCommand();
        break;

      case MENU_CHOICES.INSTALL:
        await installCommand();
        break;

      case MENU_CHOICES.LIST:
        await listCommand();
        break;

      case MENU_CHOICES.SHARE:
        await shareCommand();
        break;

      case MENU_CHOICES.HELP:
        await showHelp();
        break;

      case MENU_CHOICES.EXIT:
        console.log(colors.success('\n👋 Goodbye!\n'));
        process.exit(0);
        break;

      default:
        console.log(colors.error('Unknown action'));
        break;
    }

    // After command completes, show "What next?" menu
    await showWhatNext();
  } catch (error) {
    console.error(colors.error('\n❌ Error:'), error.message);
    await showWhatNext();
  }
}

/**
 * Show "What next?" menu
 * @returns {Promise<void>}
 */
async function showWhatNext() {
  console.log();

  const { next } = await inquirer.prompt([
    {
      type: 'list',
      name: 'next',
      message: 'What next?',
      choices: [
        {
          name: 'Back to main menu',
          value: 'menu'
        },
        {
          name: 'Exit',
          value: 'exit'
        }
      ]
    }
  ]);

  if (next === 'menu') {
    await showMainMenu();
  } else {
    console.log(colors.success('\n👋 Goodbye!\n'));
    process.exit(0);
  }
}

/**
 * Show help
 * @returns {Promise<void>}
 */
async function showHelp() {
  clearScreen();
  printBanner();

  console.log(colors.bold('📖 Help & Documentation\n'));

  console.log(colors.highlight('Usage:'));
  console.log('  ext-pack                 # Show interactive menu');
  console.log('  ext-pack <file.extpack>  # Install a pack file');
  console.log();

  console.log(colors.highlight('Creating Packs:'));
  console.log('  1. Choose "Create a new extension pack"');
  console.log('  2. Select a directory to scan');
  console.log('  3. Choose which extensions to include');
  console.log('  4. Save as .extpack file');
  console.log();

  console.log(colors.highlight('Installing Packs:'));
  console.log('  1. Choose "Install an extension pack"');
  console.log('  2. Select a pack file');
  console.log('  3. Browser will relaunch with extensions');
  console.log();

  console.log(colors.highlight('Sharing Packs:'));
  console.log('  1. Choose "Share a pack"');
  console.log('  2. Select sharing method (URL, QR, file)');
  console.log('  3. Send to others!');
  console.log();

  console.log(colors.highlight('File Locations:'));
  console.log(colors.muted('  Config: ~/.ext-pack/config.json'));
  console.log(colors.muted('  Installed: ~/.ext-pack/installed.json'));
  console.log(colors.muted('  Cache: ~/.ext-pack/downloads/'));
  console.log();

  console.log(colors.highlight('Support:'));
  console.log('  Report issues: https://github.com/anthropics/claude-code/issues');
  console.log();
}
