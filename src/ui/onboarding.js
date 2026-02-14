import inquirer from 'inquirer';
import { colors, printBanner, clearScreen } from './helpers.js';
import { markFirstRunComplete } from '../utils/config-manager.js';

/**
 * Show welcome and offer tutorial
 * @returns {Promise<void>}
 */
export async function showOnboarding() {
  clearScreen();
  printBanner();

  console.log(colors.bold('  First time setup\n'));
  console.log('  ext-pack bundles browser extensions into shareable .extpack files.');
  console.log('  Install them in one command — no more manual "Load unpacked" clicks.\n');

  console.log(colors.muted('  How it works:'));
  console.log('  1. Create — scan a folder, pick extensions, save as .extpack');
  console.log('  2. Install — load a .extpack file, browser relaunches with extensions');
  console.log('  3. Share — generate a URL or QR code for others\n');

  console.log(colors.muted('  Works with Brave, Chrome, Chromium, and Edge.\n'));

  // Mark first run complete
  markFirstRunComplete();

  const { ready } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ready',
      message: 'Ready to start?',
      default: true
    }
  ]);
}
