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
  .addHelpText('after', `
Examples:
  $ ext-pack create                          # Interactive wizard
  $ ext-pack create my-pack                  # Create with specific name
  $ ext-pack create --dir ~/extensions       # Scan custom directory
  $ ext-pack create --output ./pack.extpack  # Save to specific path
  $ ext-pack create --local-only             # Save locally without publishing

The wizard will:
  1. Scan for installed extensions or browse directory
  2. Let you select which extensions to include
  3. Auto-generate description using AI (if Ollama is running)
  4. Bundle extensions into a .extpack file
  5. Save locally to ~/.ext-pack/packs/
`)
  .action(async (name, options) => {
    await runCreateWizard({ name, ...options });
  });

export default createCommand;
