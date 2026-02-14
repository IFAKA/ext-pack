/**
 * Share wizard - Generate shareable pack URLs and QR codes
 */

import inquirer from 'inquirer';
import qrcode from 'qrcode-terminal';
import { resolve, basename } from 'path';
import { existsSync, readdirSync } from 'fs';
import { colors, successBox, clearScreen } from './helpers.js';
import { readPackFile, generateUrl } from '../core/pack-codec.js';
import { getInstalledPacks } from '../utils/config-manager.js';

/**
 * Run the share wizard
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<void>}
 */
export async function runShareWizard(packFile = null) {
  clearScreen();

  console.log(colors.bold('\n  Share Extension Pack\n'));

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
    console.log(colors.error(`\nPack file not found: ${packPath}\n`));
    return;
  }

  // Step 2: Read pack
  let pack;
  try {
    pack = await readPackFile(packPath);
  } catch (err) {
    console.log(colors.error(`\nFailed to read pack: ${err.message}\n`));
    return;
  }

  // Step 3: Show pack info
  console.log(colors.muted('Pack: ') + colors.highlight(pack.name));
  console.log(colors.muted('Extensions: ') + pack.extensions.length);
  console.log();

  // Warn about local extensions upfront
  const hasLocalExtensions = pack.extensions.some(ext => ext.type === 'local');
  if (hasLocalExtensions) {
    console.log(colors.warning('This pack contains local extensions — paths won\'t work on other machines.'));
    console.log();
  }

  // Step 4: Choose sharing method
  const { method } = await inquirer.prompt([
    {
      type: 'list',
      name: 'method',
      message: 'How do you want to share?',
      choices: [
        {
          name: 'Generate shareable URL',
          value: 'url',
          short: 'URL'
        },
        {
          name: 'Show QR code',
          value: 'qr',
          short: 'QR code'
        },
        {
          name: 'Copy file path',
          value: 'path',
          short: 'File path'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('Back'),
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
 */
async function shareAsUrl(pack, packPath) {
  console.log();

  const url = generateUrl(pack);

  console.log(successBox(
    `${colors.highlight(url)}\n\n` +
    colors.muted('Install: ext-pack <url>\n') +
    colors.muted('Or visit the URL in a browser')
  ));

  // Copy to clipboard (macOS)
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
      console.log(colors.success('\nCopied to clipboard.\n'));
    }
  }
}

/**
 * Share pack as QR code
 */
async function shareAsQrCode(pack, packPath) {
  console.log();

  const url = generateUrl(pack);

  console.log(colors.bold('Scan to share:\n'));

  qrcode.generate(url, { small: true }, (qr) => {
    console.log(qr);
  });

  console.log(colors.muted('\n' + url + '\n'));
}

/**
 * Share pack as file path
 */
async function shareAsPath(packPath) {
  console.log();

  console.log(successBox(
    `${colors.highlight(packPath)}\n\n` +
    colors.muted('Install: ext-pack ' + basename(packPath))
  ));

  // Copy to clipboard (macOS)
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
      console.log(colors.success('\nCopied to clipboard.\n'));
    }
  }
}

/**
 * Select a pack file interactively
 */
async function selectPackFile() {
  const registry = getInstalledPacks();

  const cwd = process.cwd();
  const localFiles = existsSync(cwd)
    ? readdirSync(cwd).filter(f => f.endsWith('.extpack'))
    : [];

  const choices = [];

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

  if (localFiles.length > 0) {
    choices.push(new inquirer.Separator(colors.muted('Current directory:')));
    localFiles.forEach(file => {
      choices.push({
        name: file,
        value: file
      });
    });
  }

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
