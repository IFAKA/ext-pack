#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { showMainMenu } from '../src/ui/main-menu.js';
import { checkFirstRun } from '../src/utils/config-manager.js';
import { showOnboarding } from '../src/ui/onboarding.js';
import { runCreateWizard } from '../src/ui/create-wizard.js';
import { runInstallWizard } from '../src/ui/install-wizard.js';
import { runShareWizard } from '../src/ui/share-wizard.js';
import { runListCommand } from '../src/commands/list.js';

const program = new Command();

program
  .name('ext-pack')
  .description('Bundle and install browser extensions with zero friction')
  .version('2.0.0');

// Create command
program
  .command('create [name]')
  .description('Create a new extension pack')
  .option('-o, --output <path>', 'Output file path')
  .option('-y, --yes', 'Skip confirmations')
  .action(async (name, options) => {
    await runCreateWizard({ name, ...options });
  });

// Install command
program
  .command('install [pack]')
  .description('Install an extension pack (file path, URL, or registry name)')
  .option('-b, --browser <name>', 'Browser to use (brave, chrome, edge)')
  .option('-y, --yes', 'Skip confirmations')
  .option('--no-relaunch', 'Don\'t relaunch browser')
  .action(async (pack, options) => {
    if (pack) {
      // Direct install with pack argument
      const resolvedPath = pack.endsWith('.extpack') ? resolve(pack) : pack;
      await runInstallWizard(resolvedPath, options);
    } else {
      // Interactive wizard
      await runInstallWizard(null, options);
    }
  });

// Share command
program
  .command('share [pack]')
  .description('Share an extension pack (generate URL and QR code)')
  .action(async (pack, options) => {
    if (pack) {
      const resolvedPath = resolve(pack);
      await runShareWizard(resolvedPath, options);
    } else {
      await runShareWizard(null, options);
    }
  });

// List command
program
  .command('list')
  .description('List installed extension packs')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await runListCommand(options);
  });

// Publish command (placeholder for Phase 3)
program
  .command('publish <pack>')
  .description('Publish pack to registry (coming soon)')
  .option('--tag <tag>', 'Version tag')
  .action(async (pack, options) => {
    console.log('📦 Publishing feature coming soon in Phase 3!');
    console.log(`   Pack: ${pack}`);
    if (options.tag) console.log(`   Tag: ${options.tag}`);
  });

// Search command (placeholder for Phase 3)
program
  .command('search <query>')
  .description('Search registry for packs (coming soon)')
  .option('--tag <tag>', 'Filter by tag')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    console.log('🔍 Search feature coming soon in Phase 3!');
    console.log(`   Query: ${query}`);
    if (options.tag) console.log(`   Tag: ${options.tag}`);
  });

// Completion command
program
  .command('completion')
  .description('Install shell completions')
  .action(async () => {
    const { installCompletions } = await import('../src/utils/autocomplete.js');
    await installCompletions();
  });

// Custom help
program.addHelpText('after', `
Examples:
  $ ext-pack                    # Interactive menu
  $ ext-pack create             # Create a new pack
  $ ext-pack install my-pack.extpack
  $ ext-pack share my-pack.extpack
  $ ext-pack list               # List installed packs

For more information, visit: https://github.com/ext-pack
`);

async function main() {
  const args = process.argv.slice(2);

  // Special case: .extpack file as first argument (backward compatibility)
  if (args.length === 1 && args[0].endsWith('.extpack')) {
    const filePath = resolve(args[0]);
    if (existsSync(filePath)) {
      await runInstallWizard(filePath);
      return;
    } else {
      console.error(`❌ Pack file not found: ${filePath}`);
      process.exit(1);
    }
  }

  // No args = interactive menu (preserve current UX)
  if (args.length === 0) {
    const isFirstRun = await checkFirstRun();
    if (isFirstRun) {
      await showOnboarding();
    }
    await showMainMenu();
    return;
  }

  // Parse commands
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
