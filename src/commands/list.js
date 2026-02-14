import { runPackManager } from '../ui/pack-manager.js';

/**
 * List packs command
 * @returns {Promise<void>}
 */
export async function listCommand() {
  await runPackManager();
}
