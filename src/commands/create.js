import { runCreateWizard, showCreateWhatNext } from '../ui/create-wizard.js';
import { installCommand } from './install.js';
import { shareCommand } from './share.js';

/**
 * Create pack command
 * @returns {Promise<void>}
 */
export async function createCommand() {
  const packFile = await runCreateWizard();

  if (!packFile) {
    // User cancelled or error occurred
    return;
  }

  // Show "What next?" menu
  const action = await showCreateWhatNext(packFile);

  switch (action) {
    case 'install':
      await installCommand(packFile);
      break;

    case 'share':
      await shareCommand(packFile);
      break;

    case 'create':
      await createCommand();
      break;

    case 'menu':
    default:
      // Return to main menu (handled by caller)
      break;
  }
}
