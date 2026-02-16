/**
 * Share command - Share an extension pack
 */

import { Command } from 'commander';
import { runShareWizard } from '../ui/share-wizard.js';
import { resolve } from 'path';

export const shareCommand = new Command('share')
  .argument('[pack]', 'Pack file path')
  .description('Share an extension pack (generate URL and QR code)')
  .addHelpText('after', `
Examples:
  $ ext-pack share                            # Interactive selection from created packs
  $ ext-pack share my-pack.extpack            # Share specific pack file
  $ ext-pack share ~/.ext-pack/packs/dev.extpack  # Share from custom path

Generates:
  • Base64-encoded URL for direct installation
  • QR code for easy mobile sharing
  • Shareable link for registry packs
`)
  .action(async (pack, options) => {
    const packPath = pack ? resolve(pack) : null;
    await runShareWizard(packPath, options);
  });

export default shareCommand;
