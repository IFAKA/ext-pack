#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from '../src/commands/create.js';
import { installCommand } from '../src/commands/install.js';
import { listCommand } from '../src/commands/list.js';

const program = new Command();

program
  .name('ext-pack')
  .description('Bundle and install browser extensions with zero friction')
  .version('4.0.0');

// 3 simple commands
program.addCommand(createCommand);
program.addCommand(installCommand);
program.addCommand(listCommand);

// Show help when no command specified
program.action(() => {
  program.help();
});

// Custom help
program.addHelpText('after', `
Examples:
  $ ext-pack create    # Create a pack (save locally or publish to registry)
  $ ext-pack install   # Browse registry and install a pack
  $ ext-pack list      # Manage your packs (update/remove)

That's it! Just 3 commands.

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
