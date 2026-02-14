/**
 * Autocomplete utility - Shell completion support
 */

import tabtab from 'tabtab';
import { colors } from '../ui/helpers.js';

/**
 * Install shell completions
 */
export async function installCompletions() {
  try {
    await tabtab.install({
      name: 'ext-pack',
      completer: 'ext-pack-complete'
    });

    console.log(colors.success('\n✓ Shell completions installed successfully!\n'));
    console.log(colors.muted('Restart your shell or run:'));
    console.log(colors.highlight('  source ~/.bashrc'));
    console.log(colors.muted('or'));
    console.log(colors.highlight('  source ~/.zshrc\n'));
  } catch (err) {
    console.error(colors.error('\n✗ Failed to install completions\n'));
    console.error(colors.muted(`Error: ${err.message}\n`));
  }
}

/**
 * Uninstall shell completions
 */
export async function uninstallCompletions() {
  try {
    await tabtab.uninstall({
      name: 'ext-pack'
    });

    console.log(colors.success('\n✓ Shell completions uninstalled\n'));
  } catch (err) {
    console.error(colors.error('\n✗ Failed to uninstall completions\n'));
    console.error(colors.muted(`Error: ${err.message}\n`));
  }
}

/**
 * Handle completion requests
 * This is called by the shell when user presses TAB
 */
export async function handleCompletion() {
  const env = tabtab.parseEnv(process.env);

  if (!env.complete) return;

  // Complete commands
  if (env.prev === 'ext-pack') {
    return tabtab.log([
      'create',
      'install',
      'share',
      'list',
      'publish',
      'search',
      'completion',
      '--help',
      '--version'
    ]);
  }

  // Complete pack names for install/share commands
  if (['install', 'share'].includes(env.prev)) {
    // Try to get popular packs from registry
    try {
      const { getPopularPacks } = await import('../core/registry-client.js');
      const popularPacks = await getPopularPacks(10);

      // Also include local .extpack files
      const { readdirSync } = await import('fs');
      const files = readdirSync(process.cwd());
      const extpackFiles = files.filter(f => f.endsWith('.extpack'));

      // Combine registry packs and local files
      return tabtab.log([...popularPacks, ...extpackFiles]);
    } catch {
      // Fallback to local files only
      try {
        const { readdirSync } = await import('fs');
        const files = readdirSync(process.cwd());
        const extpackFiles = files.filter(f => f.endsWith('.extpack'));
        return tabtab.log(extpackFiles);
      } catch {
        return tabtab.log([]);
      }
    }
  }

  // Complete browser names for --browser option
  if (env.prev === '--browser' || env.prev === '-b') {
    return tabtab.log(['brave', 'chrome', 'chromium', 'edge']);
  }
}

export default {
  installCompletions,
  uninstallCompletions,
  handleCompletion
};
