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
  .addHelpText('after', `
Examples:
  $ ext-pack install                         # Browse registry interactively
  $ ext-pack install my-pack                 # Install from registry by name
  $ ext-pack install pack.extpack            # Install from local file
  $ ext-pack install ~/downloads/dev.extpack # Install from custom path
  $ ext-pack install --browser brave         # Install to specific browser
  $ ext-pack install my-pack -y              # Install without confirmations
  $ ext-pack install --no-relaunch           # Install without browser restart

The install process:
  1. Downloads pack from registry or reads local file
  2. Extracts bundled extensions
  3. Downloads GitHub-sourced extensions (if any)
  4. Shows manual install instructions for store extensions
  5. Relaunches browser with --load-extension flags
`)
  .action(async (pack, options) => {
    // Resolve pack path if provided
    const packPath = pack ? (pack.endsWith('.extpack') ? resolve(pack) : pack) : null;
    await runInstallWizard(packPath, options);
  });

export default installCommand;
