/**
 * Create command - Create a new extension pack
 */

import { Command } from 'commander';
import { runCreateWizard } from '../ui/create-wizard.js';

export const createCommand = new Command('create')
  .argument('[name]', 'Pack name')
  .description('Create a new extension pack')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --dir <path>', 'Directory to scan for extensions')
  .option('-y, --yes', 'Skip confirmations')
  .action(async (name, options) => {
    await runCreateWizard({ name, ...options });
  });

export default createCommand;
