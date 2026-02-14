import inquirer from 'inquirer';
import { colors, printBanner, clearScreen } from './helpers.js';
import { runCreateWizard } from './create-wizard.js';
import { runInstallWizard } from './install-wizard.js';
import { runShareWizard } from './share-wizard.js';
import { runPackManager } from './pack-manager.js';

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
          name: 'Create a new pack',
          value: MENU_CHOICES.CREATE,
          short: 'Create'
        },
        {
          name: 'Install a pack',
          value: MENU_CHOICES.INSTALL,
          short: 'Install'
        },
        {
          name: 'List installed packs',
          value: MENU_CHOICES.LIST,
          short: 'List'
        },
        {
          name: 'Share a pack',
          value: MENU_CHOICES.SHARE,
          short: 'Share'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('Help'),
          value: MENU_CHOICES.HELP,
          short: 'Help'
        },
        {
          name: colors.muted('Exit'),
          value: MENU_CHOICES.EXIT,
          short: 'Exit'
        }
      ]
    }
  ]);

  await handleMenuAction(action);
}

/**
 * Handle menu action — returns to main menu automatically after each action
 * @param {string} action
 * @returns {Promise<void>}
 */
async function handleMenuAction(action) {
  try {
    switch (action) {
      case MENU_CHOICES.CREATE:
        await runCreateWizard();
        break;

      case MENU_CHOICES.INSTALL:
        await runInstallWizard();
        break;

      case MENU_CHOICES.LIST:
        await runPackManager();
        break;

      case MENU_CHOICES.SHARE:
        await runShareWizard();
        break;

      case MENU_CHOICES.HELP:
        await showHelp();
        break;

      case MENU_CHOICES.EXIT:
        console.log(colors.muted('\nGoodbye.\n'));
        process.exit(0);
        break;

      default:
        console.log(colors.error('Unknown action'));
        break;
    }
  } catch (error) {
    console.error(colors.error('\nError:'), error.message);
  }

  // Always return to main menu
  await showMainMenu();
}

/**
 * Show help
 * @returns {Promise<void>}
 */
async function showHelp() {
  clearScreen();
  printBanner();

  console.log(colors.bold('Usage\n'));
  console.log('  ext-pack                 Interactive menu');
  console.log('  ext-pack <file.extpack>  Install a pack file');
  console.log();

  console.log(colors.bold('Creating Packs\n'));
  console.log('  1. Select a directory to scan for extensions');
  console.log('  2. Choose which extensions to include');
  console.log('  3. Save as .extpack file');
  console.log();

  console.log(colors.bold('Installing Packs\n'));
  console.log('  1. Select a .extpack file');
  console.log('  2. Browser relaunches with extensions loaded');
  console.log();

  console.log(colors.bold('Sharing Packs\n'));
  console.log('  1. Select a pack');
  console.log('  2. Choose method: URL, QR code, or file path');
  console.log();

  console.log(colors.bold('File Locations\n'));
  console.log(colors.muted('  Config:    ~/.ext-pack/config.json'));
  console.log(colors.muted('  Registry:  ~/.ext-pack/installed.json'));
  console.log(colors.muted('  Cache:     ~/.ext-pack/downloads/'));
  console.log();

  const { pause } = await import('./helpers.js');
  await pause();
}
