#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from '../src/commands/create.js';
import { installCommand } from '../src/commands/install.js';
import { shareCommand } from '../src/commands/share.js';
import { listCommand } from '../src/commands/list.js';
import { publishCommand } from '../src/commands/publish.js';
import { searchCommand } from '../src/commands/search.js';
import { completionCommand } from '../src/commands/completion.js';

const program = new Command();

program
  .name('ext-pack')
  .description('Bundle and install browser extensions with zero friction')
  .version('2.0.0');

// Register all commands
program.addCommand(createCommand);
program.addCommand(installCommand);
program.addCommand(shareCommand);
program.addCommand(listCommand);
program.addCommand(publishCommand);
program.addCommand(searchCommand);
program.addCommand(completionCommand);

// Interactive menu when no command specified
program.action(async () => {
  const { checkFirstRun } = await import('../src/utils/config-manager.js');
  const { showOnboarding } = await import('../src/ui/onboarding.js');
  const { showMainMenu } = await import('../src/ui/main-menu.js');

  const isFirstRun = await checkFirstRun();
  if (isFirstRun) {
    await showOnboarding();
  }
  await showMainMenu();
});

// Custom help
program.addHelpText('after', `
Examples:
  $ ext-pack                          # Interactive menu
  $ ext-pack create                   # Create a new pack
  $ ext-pack install my-pack.extpack  # Install from file
  $ ext-pack share my-pack.extpack    # Generate shareable URL
  $ ext-pack list                     # List installed packs
  $ ext-pack completion               # Install shell completions

For more information, visit: https://github.com/ext-pack
`);

// Parse and execute
program.parseAsync(process.argv).catch((error) => {
  console.error('❌ Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
