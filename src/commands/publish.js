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
  .addHelpText('after', `
Examples:
  $ ext-pack publish                          # Publish interactively (select from created packs)
  $ ext-pack publish my-pack.extpack          # Publish specific pack file
  $ ext-pack publish my-pack.extpack --tag v2.0.0  # Publish with specific version tag
  $ ext-pack publish ~/.ext-pack/packs/dev-tools.extpack  # Publish from custom path
`)
  .action(async (pack, options) => {
    await runPublishWizard(pack, options);
  });

export default publishCommand;
