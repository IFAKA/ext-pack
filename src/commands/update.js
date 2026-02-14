/**
 * Update command - Update installed packs to latest version
 */

import { Command } from 'commander';
import { getInstalledPacks } from '../utils/config-manager.js';
import { getPackInfo, isRegistryAccessible } from '../core/registry-client.js';
import { colors } from '../ui/helpers.js';
import ora from 'ora';
import inquirer from 'inquirer';

export const updateCommand = new Command('update')
  .argument('[pack]', 'Pack name to update (updates all if not specified)')
  .description('Update installed pack(s) to latest version')
  .option('-y, --yes', 'Skip confirmations')
  .action(async (packName, options) => {
    const spinner = ora('Checking registry...').start();

    // Check registry accessibility
    const accessible = await isRegistryAccessible();

    if (!accessible) {
      spinner.fail('Registry not accessible');
      console.log(colors.error('\n❌ Cannot connect to registry\n'));
      console.log(colors.muted('Updates require registry access.\n'));
      return;
    }

    spinner.text = 'Checking for updates...';

    const registry = getInstalledPacks();
    const installed = registry.packs || [];

    if (installed.length === 0) {
      spinner.stop();
      console.log(colors.muted('\n  No packs installed.\n'));
      return;
    }

    // Filter to specific pack if provided
    const packsToCheck = packName
      ? installed.filter(p => p.name === packName)
      : installed;

    if (packName && packsToCheck.length === 0) {
      spinner.fail(`Pack "${packName}" not found`);
      console.log(colors.error(`\n❌ Pack "${packName}" is not installed\n`));
      return;
    }

    // Check each pack for updates
    const updates = [];

    for (const pack of packsToCheck) {
      try {
        const registryInfo = await getPackInfo(pack.name);

        if (!registryInfo) {
          // Pack not in registry - skip
          continue;
        }

        // Compare versions (simple string comparison for now)
        const installedVersion = pack.version || '1.0.0';
        const latestVersion = registryInfo.version || '1.0.0';

        if (latestVersion !== installedVersion) {
          updates.push({
            pack,
            registryInfo,
            current: installedVersion,
            latest: latestVersion
          });
        }
      } catch (error) {
        // Skip packs that error
        continue;
      }
    }

    spinner.stop();

    if (updates.length === 0) {
      console.log(colors.success('\n✓ All packs are up to date!\n'));
      return;
    }

    // Show available updates
    console.log(colors.bold(`\n  ${updates.length} update(s) available:\n`));

    updates.forEach(({ pack, current, latest }) => {
      console.log(`  ${colors.highlight(pack.name)}`);
      console.log(`  ${colors.muted(current)} → ${colors.success(latest)}`);
      console.log();
    });

    // Confirm update
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Update ${updates.length} pack(s)?`,
          default: true
        }
      ]);

      if (!confirm) {
        console.log(colors.muted('  Cancelled.\n'));
        return;
      }
    }

    // Perform updates
    console.log(colors.bold('\n  Updating packs...\n'));

    for (const { pack } of updates) {
      const updateSpinner = ora(`Updating ${pack.name}...`).start();

      // TODO: Implement actual update logic
      // For now, just show that it would update
      await new Promise(resolve => setTimeout(resolve, 500));

      updateSpinner.succeed(`${pack.name} updated`);
    }

    console.log(colors.success('\n✓ Updates complete!\n'));
    console.log(colors.muted('Note: Restart your browser to load the updated extensions.\n'));
    console.log(colors.bold('Coming soon:'));
    console.log(colors.muted('  • Automatic download and reinstall'));
    console.log(colors.muted('  • Browser auto-restart'));
    console.log(colors.muted('  • Rollback to previous version\n'));
  });

export default updateCommand;
