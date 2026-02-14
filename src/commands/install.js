import { runInstallWizard } from '../ui/install-wizard.js';

/**
 * Install pack command
 * @param {string} packFile - Optional pack file path
 * @returns {Promise<void>}
 */
export async function installCommand(packFile = null) {
  await runInstallWizard(packFile);
}
