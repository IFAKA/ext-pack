import { runCreateWizard } from '../ui/create-wizard.js';

/**
 * Create pack command
 * @returns {Promise<void>}
 */
export async function createCommand() {
  await runCreateWizard();
}
