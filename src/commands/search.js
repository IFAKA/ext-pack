/**
 * Search command - Search registry for extension packs
 */

import { Command } from 'commander';
import { searchPacks, isRegistryAccessible } from '../core/registry-client.js';
import { colors } from '../ui/helpers.js';
import ora from 'ora';

export const searchCommand = new Command('search')
  .argument('<query>', 'Search query')
  .description('Search registry for extension packs')
  .option('--tag <tag>', 'Filter by tag')
  .option('--sort <field>', 'Sort by: downloads, stars, updated, name', 'downloads')
  .option('--limit <number>', 'Max results to show', '20')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  $ ext-pack search "privacy"              # Search for privacy-related packs
  $ ext-pack search "ad blocker"           # Search for ad blocking extensions
  $ ext-pack search dev --tag developer    # Filter by developer tag
  $ ext-pack search tools --sort stars     # Sort by stars instead of downloads
  $ ext-pack search security --limit 10    # Show only 10 results
  $ ext-pack search productivity --json    # Output as JSON for scripting
`)
  .action(async (query, options) => {
    const spinner = ora('Searching registry...').start();

    try {
      // Check if registry is accessible
      const accessible = await isRegistryAccessible();

      if (!accessible) {
        spinner.fail('Registry not accessible');
        console.log(colors.error('\n❌ Cannot connect to registry\n'));
        console.log(colors.muted('The registry might not be set up yet or you might be offline.\n'));
        return;
      }

      // Search packs
      const results = await searchPacks(query, {
        tag: options.tag,
        sortBy: options.sort,
        limit: parseInt(options.limit, 10)
      });

      spinner.succeed(`Found ${results.length} pack(s)`);

      if (options.json) {
        // JSON output
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      // Human-readable output
      if (results.length === 0) {
        console.log(colors.muted('\nNo packs found matching your query.\n'));
        console.log('Try:');
        console.log('  • Using different keywords');
        console.log('  • Removing tag filters');
        console.log('  • Searching for common terms like "productivity" or "privacy"\n');
        return;
      }

      console.log(colors.bold('\n  Search Results\n'));

      results.forEach((pack, i) => {
        const num = colors.muted(`${i + 1}.`);
        const name = colors.highlight(pack.name);
        const downloads = colors.muted(`↓ ${pack.downloads || 0}`);
        const stars = colors.muted(`★ ${pack.stars || 0}`);
        const extCount = colors.muted(`${pack.extensions} ext`);

        console.log(`  ${num} ${name} ${downloads} ${stars} ${extCount}`);
        console.log(`     ${pack.description || colors.muted('No description')}`);

        if (pack.tags && pack.tags.length > 0) {
          const tags = pack.tags.map(t => colors.muted(`#${t}`)).join(' ');
          console.log(`     ${tags}`);
        }

        console.log(`     ${colors.muted(`Install: ext-pack install ${pack.id}`)}`);
        console.log();
      });

      console.log(colors.muted(`  Showing ${results.length} result(s)\n`));

    } catch (error) {
      spinner.fail('Search failed');
      console.log(colors.error(`\n❌ Error: ${error.message}\n`));
    }
  });

export default searchCommand;
