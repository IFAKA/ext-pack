/**
 * Share wizard - Generate shareable pack URLs and QR codes
 */

import inquirer from 'inquirer';
import qrcode from 'qrcode-terminal';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { colors, successBox, clearScreen, copyToClipboardMac, selectPackFile } from './helpers.js';
import { readPackFile, generateUrl } from '../core/pack-codec.js';

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
    selectedPackFile = await selectPackFile('Select pack to share:', true);
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

  await copyToClipboardMac(url, 'Copy URL to clipboard?');
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

  await copyToClipboardMac(packPath, 'Copy path to clipboard?');
}

