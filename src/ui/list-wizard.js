/**
 * Interactive wizard for managing packs
 */

import inquirer from 'inquirer';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { colors, clearScreen, errorBox, successBox, pause } from './helpers.js';
import { getInstalledPacks, removeInstalledPack } from '../utils/config-manager.js';
import { readPackFile } from '../core/pack-codec.js';
import { getPackInfo } from '../core/registry-client.js';

/**
 * Run the pack management wizard
 */
export async function runListWizard() {
  clearScreen();

  console.log(colors.bold('\n  📦 Your Packs\n'));

  // Get created packs (local)
  const createdPacks = await getCreatedPacks();

  // Get installed packs (from registry)
  const installedRegistry = getInstalledPacks();
  const installedPacks = installedRegistry.packs || [];

  // Show created packs
  if (createdPacks.length > 0) {
    console.log(colors.bold('  Created Packs:\n'));
    createdPacks.forEach((pack, i) => {
      const num = colors.muted(`  ${i + 1}.`);
      const name = colors.highlight(pack.name);
      const extCount = colors.muted(`(${pack.extensions?.length || 0} ext)`);
      console.log(`${num} ${name} ${extCount}`);
      console.log(`     ${colors.muted(pack.path)}\n`);
    });
  } else {
    console.log(colors.muted('  No created packs yet.\n'));
  }

  // Show installed packs
  if (installedPacks.length > 0) {
    console.log(colors.bold('  Installed Packs:\n'));
    installedPacks.forEach((pack, i) => {
      const num = colors.muted(`  ${i + 1}.`);
      const name = colors.highlight(pack.name);
      const version = colors.muted(`v${pack.version || '1.0.0'}`);
      const extCount = colors.muted(`(${pack.extensions?.length || 0} ext)`);
      console.log(`${num} ${name} ${version} ${extCount}\n`);
    });
  } else {
    console.log(colors.muted('  No installed packs yet.\n'));
  }

  // If no packs at all, exit
  if (createdPacks.length === 0 && installedPacks.length === 0) {
    console.log(colors.muted('  Run "ext-pack create" to create a pack\n'));
    console.log(colors.muted('  Run "ext-pack install" to install packs from registry\n'));
    return;
  }

  // Interactive management menu
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        ...(installedPacks.length > 0 ? [
          { name: 'Update an installed pack', value: 'update' },
          { name: 'Remove an installed pack', value: 'remove' }
        ] : []),
        ...(createdPacks.length > 0 ? [
          { name: 'View created pack details', value: 'view' }
        ] : []),
        { name: 'Nothing, just exit', value: 'exit' }
      ]
    }
  ]);

  if (action === 'exit') {
    return;
  }

  if (action === 'view') {
    await viewCreatedPack(createdPacks);
  } else if (action === 'update') {
    await updateInstalledPack(installedPacks);
  } else if (action === 'remove') {
    await removeInstalledPackInteractive(installedPacks);
  }
}

/**
 * Get created packs from local directory
 */
async function getCreatedPacks() {
  const packsDir = join(homedir(), '.ext-pack', 'packs');

  if (!existsSync(packsDir)) {
    return [];
  }

  const files = readdirSync(packsDir).filter(f => f.endsWith('.extpack'));
  const packs = [];

  for (const file of files) {
    const packPath = join(packsDir, file);
    try {
      const pack = await readPackFile(packPath);
      packs.push({
        name: pack.name,
        extensions: pack.extensions,
        path: packPath,
        pack
      });
    } catch (err) {
      // Skip invalid packs
    }
  }

  return packs;
}

/**
 * View created pack details
 */
async function viewCreatedPack(createdPacks) {
  const { selectedPack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPack',
      message: 'Select pack to view:',
      choices: createdPacks.map((p, i) => ({
        name: `${p.name} (${p.extensions.length} ext)`,
        value: i
      }))
    }
  ]);

  const pack = createdPacks[selectedPack].pack;

  console.log(colors.bold('\n  Pack Details:\n'));
  console.log(`  Name:        ${colors.highlight(pack.name)}`);
  console.log(`  Description: ${pack.description || colors.muted('none')}`);
  console.log(`  Author:      ${pack.author || colors.muted('none')}`);
  console.log(`  Extensions:  ${pack.extensions.length}`);
  console.log(`  Version:     ${pack.version || '1.0.0'}`);
  console.log(`  Created:     ${pack.created || colors.muted('unknown')}`);

  if (pack.tags && pack.tags.length > 0) {
    console.log(`  Tags:        ${pack.tags.join(', ')}`);
  }

  console.log(colors.bold('\n  Extensions:\n'));
  pack.extensions.forEach((ext, i) => {
    console.log(`  ${i + 1}. ${ext.name} v${ext.version}`);
    if (ext.description) {
      console.log(`     ${colors.muted(ext.description)}`);
    }
  });

  console.log();
  await pause();
}

/**
 * Update installed pack
 */
async function updateInstalledPack(installedPacks) {
  const { selectedPack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPack',
      message: 'Select pack to update:',
      choices: installedPacks.map((p, i) => ({
        name: `${p.name} v${p.version || '1.0.0'}`,
        value: p.name
      }))
    }
  ]);

  console.log(colors.muted('\nChecking for updates...\n'));

  try {
    const packInfo = await getPackInfo(selectedPack);

    if (!packInfo) {
      console.log(errorBox('Pack not found in registry'));
      await pause();
      return;
    }

    const installedPack = installedPacks.find(p => p.name === selectedPack);
    const currentVersion = installedPack.version || '1.0.0';
    const latestVersion = packInfo.version;

    if (currentVersion === latestVersion) {
      console.log(successBox(`Already on latest version (v${latestVersion})`));
      await pause();
      return;
    }

    console.log(colors.muted(`Current: v${currentVersion}`));
    console.log(colors.highlight(`Latest:  v${latestVersion}\n`));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Update to latest version?',
        default: true
      }
    ]);

    if (confirm) {
      console.log(colors.muted('\nUpdating pack...\n'));
      const { runInstallWizard } = await import('./install-wizard.js');
      await runInstallWizard(selectedPack);
    }
  } catch (err) {
    console.log(errorBox(`Failed to check for updates: ${err.message}`));
    await pause();
  }
}

/**
 * Remove installed pack
 */
async function removeInstalledPackInteractive(installedPacks) {
  const { selectedPack } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPack',
      message: 'Select pack to remove:',
      choices: installedPacks.map((p, i) => ({
        name: `${p.name} v${p.version || '1.0.0'}`,
        value: p.name
      }))
    }
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Remove ${selectedPack}?`,
      default: false
    }
  ]);

  if (confirm) {
    removeInstalledPack(selectedPack);
    console.log(successBox(`Removed ${selectedPack}`));
    await pause();
  }
}

export default { runListWizard };
