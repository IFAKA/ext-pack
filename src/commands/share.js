import { runShareWizard } from '../ui/share-wizard.js';

/**
 * Share pack command
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<void>}
 */
export async function shareCommand(packFile = null) {
  await runShareWizard(packFile);
}
