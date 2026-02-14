/**
 * List command - Show installed packs
 */

import { Command } from 'commander';
import { getInstalledPacks } from '../utils/config-manager.js';
import { colors } from '../ui/helpers.js';

export const listCommand = new Command('list')
  .description('List installed extension packs')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const registry = getInstalledPacks();
    const packs = registry.packs || [];

    if (options.json) {
      // JSON output for scripting
      console.log(JSON.stringify(packs, null, 2));
      return;
    }

    // Human-readable output
    console.log(colors.bold('\n  Installed Extension Packs\n'));

    if (packs.length === 0) {
      console.log(colors.muted('  No packs installed yet.\n'));
      console.log(colors.muted('  Run "ext-pack create" to create your first pack.\n'));
      return;
    }

    packs.forEach((pack, i) => {
      const num = colors.muted(`${i + 1}.`);
      const name = colors.highlight(pack.name);
      const extCount = colors.muted(`(${pack.extensions?.length || 0} extensions)`);
      const file = colors.muted(pack.file);

      console.log(`  ${num} ${name} ${extCount}`);
      console.log(`     ${file}\n`);
    });

    console.log(colors.muted(`  Total: ${packs.length} pack(s)\n`));
  });

export default listCommand;
