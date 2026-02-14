import inquirer from 'inquirer';
import { colors, box, printBanner, pause, clearScreen } from './helpers.js';
import { markFirstRunComplete } from '../utils/config-manager.js';

/**
 * Show welcome and offer tutorial
 * @returns {Promise<void>}
 */
export async function showOnboarding() {
  clearScreen();
  printBanner();

  console.log(box(
    `Welcome to ${colors.highlight('ext-pack')}! 👋\n\n` +
    `Install multiple browser extensions in one command.\n` +
    `No more clicking "Load unpacked" for each extension!`,
    { borderColor: 'cyan' }
  ));

  const { showTutorial } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showTutorial',
      message: 'Would you like a quick tutorial?',
      default: true
    }
  ]);

  if (showTutorial) {
    await runTutorial();
  }

  // Mark first run complete
  markFirstRunComplete();

  console.log(colors.success('\n✨ Setup complete! Let\'s get started.\n'));
  await pause();
}

/**
 * Run interactive tutorial
 * @returns {Promise<void>}
 */
async function runTutorial() {
  clearScreen();

  // Step 1: What are extension packs?
  console.log(colors.bold('\n📦 What are Extension Packs?\n'));
  console.log('Extension packs are bundles of browser extensions that can be');
  console.log('installed all at once. Perfect for:');
  console.log(colors.info('  • Sharing your dev tools with teammates'));
  console.log(colors.info('  • Quickly setting up a new machine'));
  console.log(colors.info('  • Managing different extension sets (work vs personal)'));
  console.log();

  await pause();
  clearScreen();

  // Step 2: How it works
  console.log(colors.bold('\n🚀 How It Works\n'));
  console.log('Three simple steps:');
  console.log();
  console.log(colors.highlight('1. Create') + ' a pack from your local extensions');
  console.log(colors.muted('   → Scan a folder and select extensions to bundle'));
  console.log();
  console.log(colors.highlight('2. Install') + ' the pack');
  console.log(colors.muted('   → Launches Brave/Chrome with all extensions loaded'));
  console.log();
  console.log(colors.highlight('3. Share') + ' with others');
  console.log(colors.muted('   → Generate a URL or QR code anyone can use'));
  console.log();

  await pause();
  clearScreen();

  // Step 3: Main menu overview
  console.log(colors.bold('\n🎯 Main Menu\n'));
  console.log('After this tutorial, you\'ll see the main menu with options:');
  console.log();
  console.log(colors.success('  ◉ Create a new extension pack'));
  console.log(colors.muted('    Start here to bundle your extensions'));
  console.log();
  console.log(colors.success('  ◉ Install an extension pack'));
  console.log(colors.muted('    Load a pack file (.extpack)'));
  console.log();
  console.log(colors.success('  ◉ List my installed packs'));
  console.log(colors.muted('    View and manage your packs'));
  console.log();
  console.log(colors.success('  ◉ Share a pack'));
  console.log(colors.muted('    Generate shareable URL or QR code'));
  console.log();

  await pause();
  clearScreen();

  // Step 4: Tips
  console.log(colors.bold('\n💡 Pro Tips\n'));
  console.log(colors.info('• No commands to memorize - just run "ext-pack"'));
  console.log(colors.info('• Drag and drop .extpack files to install them'));
  console.log(colors.info('• Extensions persist after browser restart'));
  console.log(colors.info('• Works with any Chromium-based browser'));
  console.log();
}
