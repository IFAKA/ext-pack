/**
 * Share wizard - Generate shareable pack URLs and QR codes
 */

import inquirer from 'inquirer';
import qrcode from 'qrcode-terminal';
import { resolve, basename } from 'path';
import { existsSync, readdirSync } from 'fs';
import { colors, box, successBox, clearScreen } from './helpers.js';
import { readPackFile, generateUrl } from '../core/pack-codec.js';
import { getInstalledPacks } from '../utils/config-manager.js';

/**
 * Run the share wizard
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<void>}
 */
export async function runShareWizard(packFile = null) {
  clearScreen();

  console.log(box(
    colors.bold('🔗 Share Extension Pack\n\n') +
    'Generate shareable URLs and QR codes',
    { borderColor: 'yellow' }
  ));

  // Step 1: Get pack file
  let selectedPackFile = packFile;

  if (!selectedPackFile) {
    selectedPackFile = await selectPackFile();
    if (!selectedPackFile) {
      return;
    }
  }

  // Resolve path
  const packPath = resolve(selectedPackFile);

  if (!existsSync(packPath)) {
    console.log(colors.error(`\n❌ Pack file not found: ${packPath}\n`));
    return;
  }

  // Step 2: Read pack
  let pack;
  try {
    pack = await readPackFile(packPath);
  } catch (err) {
    console.log(colors.error(`\n❌ Failed to read pack: ${err.message}\n`));
    return;
  }

  // Step 3: Show pack info
  console.log();
  console.log(colors.bold(`Pack: `) + colors.highlight(pack.name));
  console.log(colors.bold(`Extensions: `) + pack.extensions.length);
  console.log();

  // Step 4: Choose sharing method
  const { method } = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'How do you want to share?',
      choices: [
        {
          name: colors.success('🌐 Generate shareable URL'),
          value: 'url',
          short: 'URL'
        },
        {
          name: colors.highlight('📱 Show QR code'),
          value: 'qr',
          short: 'QR code'
        },
        {
          name: colors.info('📋 Copy file path'),
          value: 'path',
          short: 'File path'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('← Back'),
          value: 'back',
          short: 'Back'
        }
      ]
    }
  ]);

  switch (method) {
    case 'url':
      await shareAsUrl(pack, packPath);
      break;

    case 'qr':
      await shareAsQrCode(pack, packPath);
      break;

    case 'path':
      await shareAsPath(packPath);
      break;

    case 'back':
    default:
      break;
  }
}

/**
 * Share pack as URL
 * @param {Object} pack - Pack object
 * @param {string} packPath - Pack file path
 * @returns {Promise<void>}
 */
async function shareAsUrl(pack, packPath) {
  console.log();

  // Check if pack contains local extensions
  const hasLocalExtensions = pack.extensions.some(ext => ext.type === 'local');

  if (hasLocalExtensions) {
    console.log(colors.warning('⚠️  Warning: This pack contains local extensions.'));
    console.log(colors.muted('   Local paths will not work on other machines.\n'));

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue anyway?',
        default: false
      }
    ]);

    if (!proceed) {
      return;
    }
  }

  // Generate URL
  const url = generateUrl(pack);

  console.log(successBox(
    `Shareable URL generated!\n\n` +
    colors.highlight(url) + '\n\n' +
    'Anyone can install this pack by:\n' +
    colors.muted('  1. Running: ext-pack <url>\n') +
    colors.muted('  2. Visiting the URL in their browser')
  ));

  // Offer to copy to clipboard (if available)
  if (process.platform === 'darwin') {
    const { copyToClipboard } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'copyToClipboard',
        message: 'Copy URL to clipboard?',
        default: true
      }
    ]);

    if (copyToClipboard) {
      const { exec } = await import('child_process');
      exec(`echo "${url}" | pbcopy`);
      console.log(colors.success('\n✓ URL copied to clipboard!\n'));
    }
  } else {
    console.log(colors.info('\nCopy the URL above to share with others.\n'));
  }
}

/**
 * Share pack as QR code
 * @param {Object} pack - Pack object
 * @param {string} packPath - Pack file path
 * @returns {Promise<void>}
 */
async function shareAsQrCode(pack, packPath) {
  console.log();

  // Generate URL
  const url = generateUrl(pack);

  // Generate QR code
  console.log(colors.bold('Scan this QR code to share:\n'));

  qrcode.generate(url, { small: true }, (qr) => {
    console.log(qr);
  });

  console.log(colors.muted('\nURL: ' + url + '\n'));
}

/**
 * Share pack as file path
 * @param {string} packPath - Pack file path
 * @returns {Promise<void>}
 */
async function shareAsPath(packPath) {
  console.log();

  console.log(successBox(
    'Pack file path:\n\n' +
    colors.highlight(packPath) + '\n\n' +
    'Share this file with others. They can install by:\n' +
    colors.muted('  ext-pack ' + basename(packPath))
  ));

  // Offer to copy to clipboard (if available)
  if (process.platform === 'darwin') {
    const { copyToClipboard } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'copyToClipboard',
        message: 'Copy path to clipboard?',
        default: true
      }
    ]);

    if (copyToClipboard) {
      const { exec } = await import('child_process');
      exec(`echo "${packPath}" | pbcopy`);
      console.log(colors.success('\n✓ Path copied to clipboard!\n'));
    }
  }
}

/**
 * Select a pack file interactively
 * @returns {Promise<string|null>}
 */
async function selectPackFile() {
  // Get installed packs
  const registry = getInstalledPacks();

  // Look for .extpack files in current directory
  const cwd = process.cwd();
  const localFiles = existsSync(cwd)
    ? readdirSync(cwd).filter(f => f.endsWith('.extpack'))
    : [];

  const choices = [];

  // Add installed packs
  if (registry.packs.length > 0) {
    choices.push(new inquirer.Separator('Installed Packs:'));
    registry.packs.forEach(pack => {
      if (pack.file && existsSync(pack.file)) {
        choices.push({
          name: `${pack.name} (${pack.extensions.length} extensions)`,
          value: pack.file
        });
      }
    });
  }

  // Add local files
  if (localFiles.length > 0) {
    choices.push(new inquirer.Separator('Current Directory:'));
    localFiles.forEach(file => {
      choices.push({
        name: file,
        value: file
      });
    });
  }

  // Add custom option
  if (choices.length > 0) {
    choices.push(new inquirer.Separator());
  }
  choices.push({
    name: colors.muted('Enter custom path...'),
    value: '__custom__'
  });

  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: 'Select pack to share:',
      choices
    }
  ]);

  if (selectedFile === '__custom__') {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Path to pack file:',
        validate: (input) => {
          if (!input) {
            return 'Pack file path is required';
          }
          return true;
        }
      }
    ]);

    return filePath;
  }

  return selectedFile;
}

export default {
  runShareWizard
};
