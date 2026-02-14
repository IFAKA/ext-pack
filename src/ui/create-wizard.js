/**
 * Interactive wizard for creating extension packs
 */

import { existsSync } from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import { basename, resolve, join } from 'path';
import { colors, box, successBox, formatExtensionList, clearScreen } from './helpers.js';
import { scanDirectory } from '../core/extension-scanner.js';
import { createPack, writePackFile } from '../core/pack-codec.js';

/**
 * Run the create pack wizard
 * @returns {Promise<string|null>} Path to created pack file or null if cancelled
 */
export async function runCreateWizard() {
  clearScreen();

  console.log(box(
    colors.bold('📦 Create Extension Pack\n\n') +
    'Bundle your local extensions into a shareable pack',
    { borderColor: 'green' }
  ));

  // Step 1: Get pack name
  const { packName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'packName',
      message: 'Pack name:',
      default: () => {
        const cwd = process.cwd();
        return basename(cwd) + '-extensions';
      },
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Pack name is required';
        }
        return true;
      }
    }
  ]);

  // Step 2: Ask for scan directory
  const { scanDir } = await inquirer.prompt([
    {
      type: 'input',
      name: 'scanDir',
      message: 'Directory to scan for extensions:',
      default: process.cwd(),
      validate: (input) => {
        if (!existsSync(input)) {
          return 'Directory does not exist';
        }
        return true;
      }
    }
  ]);

  // Step 3: Scan for extensions
  const spinner = ora('Scanning for extensions...').start();

  const scanPath = resolve(scanDir);
  const { extensions, errors } = await scanDirectory(scanPath);

  spinner.stop();

  if (extensions.length === 0) {
    console.log(colors.error('\n❌ No valid extensions found in this directory.'));
    console.log(colors.muted('\nExtensions must have a manifest.json file at their root.\n'));

    if (errors.length > 0) {
      console.log(colors.warning('Errors encountered:'));
      errors.forEach(err => {
        console.log(colors.muted(`  • ${err.path}: ${err.error}`));
      });
      console.log();
    }

    return null;
  }

  console.log(colors.success(`\n✓ Found ${extensions.length} extension(s)\n`));

  // Show extensions with descriptions
  extensions.forEach((ext, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(ext.name);
    const version = colors.muted(`v${ext.version}`);
    const desc = ext.description ? colors.muted(`\n   ${ext.description}`) : '';
    console.log(`  ${num} ${name} ${version}${desc}`);
  });
  console.log();

  // Step 4: Select extensions to include
  const { selectedIndexes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIndexes',
      message: 'Select extensions to include:',
      choices: extensions.map((ext, i) => ({
        name: `${ext.name} (v${ext.version})`,
        value: i,
        checked: true
      })),
      validate: (answer) => {
        if (answer.length === 0) {
          return 'You must select at least one extension';
        }
        return true;
      }
    }
  ]);

  const selectedExtensions = selectedIndexes.map(i => extensions[i]);

  // Step 5: Get pack description and author
  const { description, author } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Pack description (optional):',
      default: `${selectedExtensions.length} essential browser extensions`
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name (optional):',
      default: process.env.USER || 'unknown'
    }
  ]);

  // Step 6: Choose output location
  const defaultFileName = `${packName.toLowerCase().replace(/\s+/g, '-')}.extpack`;
  const { outputFile } = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputFile',
      message: 'Save pack as:',
      default: join(process.cwd(), defaultFileName)
    }
  ]);

  // Create pack
  const pack = createPack(
    packName,
    description,
    author,
    selectedExtensions
  );

  // Write pack file
  const saveSpinner = ora('Saving pack...').start();

  try {
    await writePackFile(resolve(outputFile), pack);
    saveSpinner.succeed('Pack saved!');

    console.log(successBox(
      `Pack created: ${colors.highlight(outputFile)}\n\n` +
      `Extensions: ${colors.bold(selectedExtensions.length)}\n` +
      `Created: ${colors.muted(pack.created)}`
    ));

    return outputFile;
  } catch (err) {
    saveSpinner.fail('Failed to save pack');
    console.error(colors.error(`\n❌ Error: ${err.message}\n`));
    return null;
  }
}

/**
 * Show "What next?" menu after creating a pack
 * @param {string} packFile - Path to created pack file
 * @returns {Promise<string>} Next action
 */
export async function showCreateWhatNext(packFile) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What next?',
      choices: [
        {
          name: colors.success('⚡ Install this pack now'),
          value: 'install',
          short: 'Install'
        },
        {
          name: colors.warning('🔗 Share this pack'),
          value: 'share',
          short: 'Share'
        },
        {
          name: colors.info('📦 Create another pack'),
          value: 'create',
          short: 'Create another'
        },
        {
          name: colors.muted('← Back to main menu'),
          value: 'menu',
          short: 'Main menu'
        }
      ]
    }
  ]);

  return action;
}

export default {
  runCreateWizard,
  showCreateWhatNext
};
