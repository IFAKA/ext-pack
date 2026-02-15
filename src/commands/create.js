/**
 * Create command - Create a new extension pack
 */

import { Command } from 'commander';
import { runCreateWizard } from '../ui/create-wizard.js';

export const createCommand = new Command('create')
  .argument('[name]', 'Pack name')
  .description('Create a pack - save locally or publish to registry')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --dir <path>', 'Directory to scan for extensions')
  .option('--local-only', 'Skip publish prompt, save locally only')
  .action(async (name, options) => {
    await runCreateWizard({ name, ...options });
  });

export default createCommand;
