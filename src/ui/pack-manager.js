/**
 * Pack manager - List and manage installed packs
 */

import inquirer from 'inquirer';
import { colors, box, formatPackSummary, timeAgo, clearScreen } from './helpers.js';
import { getInstalledPacks, removeInstalledPack } from '../utils/config-manager.js';
import { readPackFile } from '../core/pack-codec.js';
import { existsSync } from 'fs';

/**
 * Run the pack manager
 * @returns {Promise<void>}
 */
export async function runPackManager() {
  clearScreen();

  console.log(box(
    colors.bold('📋 Your Extension Packs\n\n') +
    'View and manage installed packs',
    { borderColor: 'cyan' }
  ));

  const registry = getInstalledPacks();

  if (registry.packs.length === 0) {
    console.log(colors.muted('\nNo packs installed yet.\n'));
    console.log(colors.info('Create your first pack by selecting "Create a new extension pack" from the main menu.\n'));
    return;
  }

  // Show pack list
  console.log();
  registry.packs.forEach((pack, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(pack.name);
    const extCount = colors.muted(`(${pack.extensions.length} extensions)`);
    const installed = pack.installed ? colors.muted(`• Installed ${timeAgo(pack.installed)}`) : '';

    console.log(`  ${num} ${name} ${extCount}`);
    console.log(`     ${installed}`);
    console.log();
  });

  // Ask what to do
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        {
          name: 'View pack details',
          value: 'view'
        },
        {
          name: 'Reinstall a pack',
          value: 'reinstall'
        },
        {
          name: 'Remove a pack',
          value: 'remove'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('← Back to main menu'),
          value: 'back'
        }
      ]
    }
  ]);

  switch (action) {
    case 'view':
      await viewPackDetails(registry.packs);
      break;

    case 'reinstall':
      await reinstallPack(registry.packs);
      break;

    case 'remove':
      await removePack(registry.packs);
      break;

    case 'back':
    default:
      break;
  }
}

/**
 * View pack details
 * @param {Array} packs - Array of installed packs
 * @returns {Promise<void>}
 */
async function viewPackDetails(packs) {
  const { selectedPack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPack',
      message: 'Select pack to view:',
      choices: packs.map((pack, i) => ({
        name: `${pack.name} (${pack.extensions.length} extensions)`,
        value: i
      }))
    }
  ]);

  const pack = packs[selectedPack];

  clearScreen();

  // Try to read full pack details from file
  let fullPack = null;
  if (pack.file && existsSync(pack.file)) {
    try {
      fullPack = await readPackFile(pack.file);
    } catch (err) {
      // Ignore error, just show registry data
    }
  }

  console.log(box(
    formatPackSummary(fullPack || pack),
    { borderColor: 'cyan', title: '📦 Pack Details' }
  ));

  console.log(colors.bold('\nExtensions:\n'));
  pack.extensions.forEach((ext, i) => {
    const num = colors.muted(`  ${i + 1}.`);
    const name = colors.highlight(ext.name);
    const status = ext.status === 'loaded' ? colors.success('✓') : colors.muted('○');
    const path = colors.muted(`\n     ${ext.path}`);

    console.log(`${status} ${num} ${name}${path}`);
  });

  console.log();

  // Show actions
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What next?',
      choices: [
        {
          name: 'Reinstall this pack',
          value: 'reinstall'
        },
        {
          name: 'Remove this pack',
          value: 'remove'
        },
        new inquirer.Separator(),
        {
          name: colors.muted('← Back to pack list'),
          value: 'back'
        }
      ]
    }
  ]);

  if (action === 'reinstall') {
    await reinstallPack(packs, selectedPack);
  } else if (action === 'remove') {
    await removePack(packs, selectedPack);
  } else if (action === 'back') {
    await runPackManager();
  }
}

/**
 * Reinstall a pack
 * @param {Array} packs - Array of packs
 * @param {number} preselected - Preselected pack index
 * @returns {Promise<void>}
 */
async function reinstallPack(packs, preselected = null) {
  let selectedIndex = preselected;

  if (selectedIndex === null) {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select pack to reinstall:',
        choices: packs.map((pack, i) => ({
          name: pack.name,
          value: i
        }))
      }
    ]);

    selectedIndex = selected;
  }

  const pack = packs[selectedIndex];

  if (!pack.file || !existsSync(pack.file)) {
    console.log(colors.error('\n❌ Pack file not found. Cannot reinstall.\n'));
    console.log(colors.muted(`Expected location: ${pack.file}\n`));
    return;
  }

  // Use install command
  const { installCommand } = await import('../commands/install.js');
  await installCommand(pack.file);
}

/**
 * Remove a pack from registry
 * @param {Array} packs - Array of packs
 * @param {number} preselected - Preselected pack index
 * @returns {Promise<void>}
 */
async function removePack(packs, preselected = null) {
  let selectedIndex = preselected;

  if (selectedIndex === null) {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select pack to remove:',
        choices: packs.map((pack, i) => ({
          name: pack.name,
          value: i
        }))
      }
    ]);

    selectedIndex = selected;
  }

  const pack = packs[selectedIndex];

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove "${pack.name}" from registry?`,
      default: false
    }
  ]);

  if (confirm) {
    removeInstalledPack(pack.name);
    console.log(colors.success(`\n✓ Removed "${pack.name}" from registry.\n`));
    console.log(colors.muted('Note: Extensions are still loaded in your browser.\n'));
  } else {
    console.log(colors.muted('\nCancelled.\n'));
  }
}

export default {
  runPackManager
};
