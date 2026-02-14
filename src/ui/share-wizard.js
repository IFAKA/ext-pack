/**
 * Share wizard - Generate shareable pack URLs and QR codes
 */

import inquirer from 'inquirer';
import qrcode from 'qrcode-terminal';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { colors, successBox, errorBox, clearScreen, copyToClipboardMac, selectPackFile, pause } from './helpers.js';
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
    console.log(errorBox(`Pack file not found: ${packPath}`));
    await pause();
    return;
  }

  // Step 2: Read pack
  let pack;
  try {
    pack = await readPackFile(packPath);
  } catch (err) {
    console.log(errorBox(`Failed to read pack.\n\n${colors.muted(err.message)}`));
    await pause();
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
      console.log(colors.muted('\nCancelled.\n'));
      await pause();
      break;

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

  // Warn if URL is very long
  if (url.length > 8000) {
    console.log(warningBox(
      `⚠️  This pack generates a very long URL (${Math.round(url.length / 1000)}KB).\n\n` +
      colors.muted('Long URLs may not work in all contexts (email, chat, etc.).\n') +
      colors.muted('Consider sharing the file directly instead.')
    ));

    const { continueShare } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueShare',
        message: 'Continue with URL sharing?',
        default: true
      }
    ]);

    if (!continueShare) {
      return;
    }

    console.log();
  }

  console.log(successBox(
    `Shareable URL generated!\n\n` +
    `${colors.highlight(url)}\n\n` +
    colors.muted('Install: ext-pack <url>\n') +
    colors.muted('Or visit the URL in a browser')
  ));

  await copyToClipboardMac(url, 'Copy URL to clipboard?');

  // Suggest installing this pack
  await suggestNextAction(packPath);
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

  await suggestNextAction(packPath);
}

/**
 * Share pack as file path
 */
async function shareAsPath(packPath) {
  console.log();

  console.log(successBox(
    `Pack file path:\n\n` +
    `${colors.highlight(packPath)}\n\n` +
    colors.muted('Install: ext-pack ' + basename(packPath))
  ));

  await copyToClipboardMac(packPath, 'Copy path to clipboard?');

  await suggestNextAction(packPath);
}

/**
 * Suggest next actions after sharing
 */
async function suggestNextAction(packPath) {
  const { nextAction } = await inquirer.prompt([
    {
      type: 'list',
      name: 'nextAction',
      message: 'What would you like to do next?',
      choices: [
        {
          name: 'Install this pack',
          value: 'install',
          short: 'Install'
        },
        {
          name: 'Share in a different way',
          value: 'share_again',
          short: 'Share again'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('Return to main menu'),
          value: 'menu',
          short: 'Menu'
        }
      ]
    }
  ]);

  if (nextAction === 'install') {
    const { runInstallWizard } = await import('./install-wizard.js');
    await runInstallWizard(packPath);
  } else if (nextAction === 'share_again') {
    await runShareWizard(packPath);
  }
}

