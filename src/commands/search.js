/**
 * Search command - Search registry for packs (Phase 3)
 */

import { Command } from 'commander';
import { colors } from '../ui/helpers.js';

export const searchCommand = new Command('search')
  .argument('<query>', 'Search query')
  .description('Search registry for extension packs')
  .option('--tag <tag>', 'Filter by tag')
  .option('--json', 'Output as JSON')
  .action(async () => {
    // Phase 3 implementation
    console.log(colors.bold('\n🔍 Search Registry\n'));
    console.log(colors.muted('This feature will be available in Phase 3.\n'));
    console.log('Planned features:');
    console.log('  • Search packs by name and description');
    console.log('  • Filter by tags (productivity, privacy, dev-tools, etc.)');
    console.log('  • Sort by popularity, date, stars');
    console.log('  • Install directly by name: ext-pack install <name>\n');
  });

export default searchCommand;
