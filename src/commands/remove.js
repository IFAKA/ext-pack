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
  .addHelpText('after', `
Examples:
  $ ext-pack remove                 # Interactive selection of pack to remove
  $ ext-pack remove my-pack         # Remove specific pack by name
  $ ext-pack remove my-pack -y      # Remove without confirmation prompt

Note: Removing a pack only removes it from the registry. Extensions remain
      loaded in your browser until you restart.
`)
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

    // Show what will happen before confirmation
    console.log(colors.bold(`\n  Remove "${selectedPack.name}"?\n`));
    console.log(colors.muted('This will:'));
    console.log(`  ${colors.success('✓')} Remove pack from ext-pack registry`);
    console.log(`  ${colors.success('✓')} Delete pack metadata and tracking\n`);

    console.log(colors.muted('This will NOT:'));
    console.log(`  ${colors.warning('✗')} Unload extensions from your browser`);
    console.log(`  ${colors.warning('✗')} Delete extension files\n`);

    // Show extensions that will remain
    if (selectedPack.extensions && selectedPack.extensions.length > 0) {
      console.log(colors.muted(`The following ${selectedPack.extensions.length} extension(s) will remain in your browser:`));
      selectedPack.extensions.forEach(ext => {
        console.log(`  • ${ext.name}${ext.version ? ` v${ext.version}` : ''}`);
      });
      console.log();
      console.log(colors.muted('To fully remove, restart your browser after this operation.\n'));
    }

    // Confirm removal
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with removal?',
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

    console.log(colors.success(`\n✓ Removed "${selectedPack.name}" from ext-pack registry\n`));
    console.log(colors.muted('Remember: Restart your browser to fully unload the extensions.\n'));
  });

export default removeCommand;
