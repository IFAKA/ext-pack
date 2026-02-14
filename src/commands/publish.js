/**
 * Publish command - Publish pack to registry
 */

import { Command } from 'commander';
import { runPublishWizard } from '../ui/publish-wizard.js';

export const publishCommand = new Command('publish')
  .argument('[pack]', 'Pack file path')
  .description('Publish pack to GitHub registry')
  .option('--tag <tag>', 'Version tag (default: auto-increment)')
  .option('--public', 'Make pack public (default: true)', true)
  .action(async (pack, options) => {
    await runPublishWizard(pack, options);
  });

export default publishCommand;
