/**
 * Completion command - Install shell completions
 */

import { Command } from 'commander';
import { installCompletions } from '../utils/autocomplete.js';

export const completionCommand = new Command('completion')
  .description('Install shell completions for bash/zsh')
  .addHelpText('after', `
Examples:
  $ ext-pack completion               # Install completions for your shell

After installation:
  • Type 'ext-pack' and press TAB to see available commands
  • Type 'ext-pack create --' and press TAB to see options
  • Restart your shell or run 'source ~/.bashrc' (or ~/.zshrc)
`)
  .action(async () => {
    await installCompletions();
  });

export default completionCommand;
