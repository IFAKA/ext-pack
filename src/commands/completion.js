/**
 * Completion command - Install shell completions
 */

import { Command } from 'commander';
import { installCompletions } from '../utils/autocomplete.js';

export const completionCommand = new Command('completion')
  .description('Install shell completions for bash/zsh')
  .action(async () => {
    await installCompletions();
  });

export default completionCommand;
