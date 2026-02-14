/**
 * Share command - Share an extension pack
 */

import { Command } from 'commander';
import { runShareWizard } from '../ui/share-wizard.js';
import { resolve } from 'path';

export const shareCommand = new Command('share')
  .argument('[pack]', 'Pack file path')
  .description('Share an extension pack (generate URL and QR code)')
  .action(async (pack, options) => {
    const packPath = pack ? resolve(pack) : null;
    await runShareWizard(packPath, options);
  });

export default shareCommand;
