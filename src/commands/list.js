/**
 * List command - Manage your packs (created + installed)
 */

import { Command } from 'commander';
import { runListWizard } from '../ui/list-wizard.js';

export const listCommand = new Command('list')
  .description('Manage your packs (view, update, remove)')
  .addHelpText('after', `
Examples:
  $ ext-pack list                            # View all packs

Shows:
  • Created packs (saved locally in ~/.ext-pack/packs/)
  • Installed packs (from registry)

Available actions:
  • View pack details
  • Update to latest version
  • Remove pack from registry
  • Publish created pack
`)
  .action(async () => {
    await runListWizard();
  });

export default listCommand;
