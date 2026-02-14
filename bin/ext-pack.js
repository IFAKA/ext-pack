#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { showMainMenu } from '../src/ui/main-menu.js';
import { checkFirstRun } from '../src/utils/config-manager.js';
import { showOnboarding } from '../src/ui/onboarding.js';
import { runInstallWizard } from '../src/ui/install-wizard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);

  // Check if user provided a file argument
  if (args.length > 0) {
    const filePath = resolve(args[0]);

    // Check if it's a pack file
    if (filePath.endsWith('.extpack') && existsSync(filePath)) {
      // Auto-detect pack file and offer to install
      await runInstallWizard(filePath);
      return;
    }

    // If it's not a valid pack file, show error
    if (filePath.endsWith('.extpack')) {
      console.error(`❌ Pack file not found: ${filePath}`);
      process.exit(1);
    }

    // Unknown argument, show help
    console.error(`❌ Unknown argument: ${args[0]}`);
    console.log('\nUsage:');
    console.log('  ext-pack              # Interactive menu');
    console.log('  ext-pack <file.extpack>  # Install a pack');
    process.exit(1);
  }

  // Check if this is the first run
  const isFirstRun = await checkFirstRun();

  if (isFirstRun) {
    await showOnboarding();
  }

  // Show main menu
  await showMainMenu();
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});
