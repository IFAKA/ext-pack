/**
 * Pack manager - List and manage installed packs
 */

import inquirer from 'inquirer';
import { colors, formatPackSummary, timeAgo, clearScreen } from './helpers.js';
import { getInstalledPacks, removeInstalledPack } from '../utils/config-manager.js';
import { readPackFile } from '../core/pack-codec.js';
import { existsSync } from 'fs';

/**
 * Run the pack manager
 * @returns {Promise<void>}
 */
export async function runPackManager() {
  clearScreen();

  console.log(colors.bold('\n  Installed Packs\n'));

  const registry = getInstalledPacks();

  if (registry.packs.length === 0) {
    console.log(colors.muted('  No packs installed yet.\n'));
    return;
  }

  // Show pack list
  registry.packs.forEach((pack, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(pack.name);
    const extCount = colors.muted(`(${pack.extensions.length} extensions)`);
    const installed = pack.installed ? colors.muted(`installed ${timeAgo(pack.installed)}`) : '';

    console.log(`  ${num} ${name} ${extCount} ${installed}`);
  });
  console.log();

  // Ask what to do
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Action:',
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
          name: colors.muted('Back'),
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
 */
async function viewPackDetails(packs) {
  const { selectedPack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPack',
      message: 'Select pack:',
      choices: packs.map((pack, i) => ({
        name: `${pack.name} ${colors.muted(`(${pack.extensions.length} extensions)`)}`,
        value: i
      }))
    }
  ]);

  const pack = packs[selectedPack];

  // Try to read full pack details from file
  let fullPack = null;
  if (pack.file && existsSync(pack.file)) {
    try {
      fullPack = await readPackFile(pack.file);
    } catch (err) {
      // Ignore error, just show registry data
    }
  }

  console.log();
  console.log(formatPackSummary(fullPack || pack));
  console.log();

  console.log(colors.bold('Extensions:\n'));
  pack.extensions.forEach((ext, i) => {
    const num = colors.muted(`  ${i + 1}.`);
    const name = colors.highlight(ext.name);
    const status = ext.status === 'loaded' ? colors.success('*') : colors.muted('-');
    const path = colors.muted(ext.path);

    console.log(`  ${status} ${num} ${name}`);
    console.log(`       ${path}`);
  });

  console.log();
}

/**
 * Reinstall a pack
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
    console.log(colors.error('\nPack file not found. Cannot reinstall.'));
    console.log(colors.muted(`Expected: ${pack.file}\n`));
    return;
  }

  const { installCommand } = await import('../commands/install.js');
  await installCommand(pack.file);
}

/**
 * Remove a pack from registry
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
    console.log(colors.success(`\nRemoved "${pack.name}" from registry.`));
    console.log(colors.muted('Extensions remain loaded in browser until restart.\n'));
  } else {
    console.log(colors.muted('\nCancelled.\n'));
  }
}
