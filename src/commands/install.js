/**
 * Install command - Install an extension pack
 */

import { Command } from 'commander';
import { runInstallWizard } from '../ui/install-wizard.js';
import { resolve } from 'path';

export const installCommand = new Command('install')
  .argument('[pack]', 'Pack ID from registry, file path, or URL (optional - will browse if not provided)')
  .description('Browse registry and install a pack')
  .option('-b, --browser <name>', 'Browser to use (brave, chrome, edge)')
  .option('-y, --yes', 'Skip confirmations')
  .option('--no-relaunch', 'Don\'t relaunch browser')
  .action(async (pack, options) => {
    // Resolve pack path if provided
    const packPath = pack ? (pack.endsWith('.extpack') ? resolve(pack) : pack) : null;
    await runInstallWizard(packPath, options);
  });

export default installCommand;
