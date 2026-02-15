#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from '../src/commands/create.js';
import { installCommand } from '../src/commands/install.js';

const program = new Command();

program
  .name('ext-pack')
  .description('Bundle and install browser extensions with zero friction')
  .version('3.0.3');

// Only 2 commands - keep it simple!
program.addCommand(createCommand);
program.addCommand(installCommand);

// Show help when no command specified
program.action(() => {
  program.help();
});

// Custom help
program.addHelpText('after', `
Examples:
  $ ext-pack create    # Create a pack (save locally or publish to registry)
  $ ext-pack install   # Browse registry and install a pack

That's it! Just 2 commands.

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
