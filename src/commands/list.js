/**
 * List command - Manage your packs (created + installed)
 */

import { Command } from 'commander';
import { runListWizard } from '../ui/list-wizard.js';

export const listCommand = new Command('list')
  .description('Manage your packs (view, update, remove)')
  .action(async () => {
    await runListWizard();
  });

export default listCommand;
