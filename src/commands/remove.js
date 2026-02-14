/**
 * Remove command - Remove an installed pack
 */

import { Command } from 'commander';
import { getInstalledPacks, removeInstalledPack } from '../utils/config-manager.js';
import { colors } from '../ui/helpers.js';
import inquirer from 'inquirer';

export const removeCommand = new Command('remove')
  .argument('[pack]', 'Pack name to remove')
  .description('Remove an installed extension pack')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (packName, options) => {
    const registry = getInstalledPacks();
    const packs = registry.packs || [];

    if (packs.length === 0) {
      console.log(colors.muted('\n  No packs installed.\n'));
      return;
    }

    let selectedPack;

    // If pack name provided, find it
    if (packName) {
      selectedPack = packs.find(p => p.name === packName);

      if (!selectedPack) {
        console.log(colors.error(`\n❌ Pack "${packName}" not found\n`));
        console.log(colors.muted('Installed packs:'));
        packs.forEach(p => {
          console.log(`  • ${p.name}`);
        });
        console.log();
        return;
      }
    } else {
      // Interactive selection
      const { selected } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: 'Select pack to remove:',
          choices: packs.map(p => ({
            name: `${p.name} (${p.extensions?.length || 0} extensions)`,
            value: p
          }))
        }
      ]);

      selectedPack = selected;
    }

    // Confirm removal
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove "${selectedPack.name}"?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(colors.muted('\n  Cancelled.\n'));
        return;
      }
    }

    // Remove pack
    removeInstalledPack(selectedPack.name);

    console.log(colors.success(`\n✓ Removed "${selectedPack.name}"\n`));
    console.log(colors.muted('Note: Extensions are not unloaded from your browser.'));
    console.log(colors.muted('Restart your browser to fully remove them.\n'));
  });

export default removeCommand;
