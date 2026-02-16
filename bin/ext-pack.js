#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import { completionCommand } from '../src/commands/completion.js';
import { createCommand } from '../src/commands/create.js';
import { infoCommand } from '../src/commands/info.js';
import { installCommand } from '../src/commands/install.js';
import { listCommand } from '../src/commands/list.js';
import { publishCommand } from '../src/commands/publish.js';
import { removeCommand } from '../src/commands/remove.js';
import { searchCommand } from '../src/commands/search.js';
import { shareCommand } from '../src/commands/share.js';
import { updateCommand } from '../src/commands/update.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('ext-pack')
  .description('Bundle and install browser extensions with zero friction')
  .version(version);

// Register all commands
program.addCommand(completionCommand);
program.addCommand(createCommand);
program.addCommand(infoCommand);
program.addCommand(installCommand);
program.addCommand(listCommand);
program.addCommand(publishCommand);
program.addCommand(removeCommand);
program.addCommand(searchCommand);
program.addCommand(shareCommand);
program.addCommand(updateCommand);

// Show help when no command specified
program.action(() => {
  program.help();
});

// Custom help
program.addHelpText('after', `
Examples:
  $ ext-pack create                    # Create a pack interactively
  $ ext-pack publish my-pack.extpack   # Publish a pack to the registry
  $ ext-pack install                   # Browse and install from registry
  $ ext-pack search "privacy"          # Search registry for packs
  $ ext-pack info my-pack              # Show pack details
  $ ext-pack list                      # View installed/created packs
  $ ext-pack update my-pack            # Update an installed pack
  $ ext-pack remove my-pack            # Remove a pack
  $ ext-pack share my-pack.extpack     # Get shareable URL for a pack

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
