/**
 * Info command - Show detailed pack information
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { readPackFile } from '../core/pack-codec.js';
import { getPackInfo, isRegistryAccessible } from '../core/registry-client.js';
import { calculateBundleSize } from '../core/bundle-codec.js';
import { colors } from '../ui/helpers.js';
import ora from 'ora';

export const infoCommand = new Command('info')
  .argument('<pack>', 'Pack file path or registry name')
  .description('Show detailed information about a pack')
  .option('--json', 'Output as JSON')
  .action(async (pack, options) => {
    let packData;
    let source;

    // Try as local file first
    const localPath = resolve(pack);
    if (pack.endsWith('.extpack') && existsSync(localPath)) {
      try {
        packData = await readPackFile(localPath);
        source = 'local';
      } catch (error) {
        console.log(colors.error(`\n❌ Failed to read pack file: ${error.message}\n`));
        return;
      }
    } else {
      // Try registry
      const spinner = ora('Fetching pack info from registry...').start();

      try {
        const accessible = await isRegistryAccessible();

        if (!accessible) {
          spinner.fail('Registry not accessible');
          console.log(colors.error('\n❌ Cannot connect to registry\n'));
          return;
        }

        const info = await getPackInfo(pack);

        if (!info) {
          spinner.fail('Pack not found');
          console.log(colors.error(`\n❌ Pack "${pack}" not found in registry\n`));
          console.log(colors.muted('Try: ext-pack search <query>\n'));
          return;
        }

        spinner.succeed('Pack found in registry');
        packData = info;
        source = 'registry';
      } catch (error) {
        spinner.fail('Failed to fetch pack info');
        console.log(colors.error(`\n❌ Error: ${error.message}\n`));
        return;
      }
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(packData, null, 2));
      return;
    }

    // Human-readable output
    console.log(colors.bold('\n  📦 Pack Information\n'));

    console.log(`  ${colors.muted('Name:')}        ${colors.highlight(packData.name)}`);
    console.log(`  ${colors.muted('Version:')}     ${packData.version || '1.0.0'}`);

    if (packData.description) {
      console.log(`  ${colors.muted('Description:')} ${packData.description}`);
    }

    if (packData.author) {
      const authorName = typeof packData.author === 'string'
        ? packData.author
        : packData.author.name || packData.author.github;
      console.log(`  ${colors.muted('Author:')}      ${authorName}`);
    }

    console.log(`  ${colors.muted('Extensions:')}  ${packData.extensions?.length || 0}`);

    if (packData.tags && packData.tags.length > 0) {
      const tags = packData.tags.map(t => `#${t}`).join(' ');
      console.log(`  ${colors.muted('Tags:')}        ${colors.muted(tags)}`);
    }

    if (packData.created) {
      console.log(`  ${colors.muted('Created:')}     ${packData.created}`);
    }

    if (source === 'registry') {
      console.log(`  ${colors.muted('Downloads:')}   ${packData.downloads || 0}`);
      console.log(`  ${colors.muted('Stars:')}       ${packData.stars || 0}`);

      if (packData.size) {
        const sizeMB = (packData.size / 1024 / 1024).toFixed(2);
        console.log(`  ${colors.muted('Size:')}        ${sizeMB} MB`);
      }

      if (packData.updated) {
        console.log(`  ${colors.muted('Updated:')}     ${packData.updated.split('T')[0]}`);
      }
    }

    // Show extensions list
    if (packData.extensions && packData.extensions.length > 0) {
      console.log(colors.bold('\n  Extensions:\n'));

      packData.extensions.forEach((ext, i) => {
        const num = colors.muted(`${i + 1}.`);
        const name = colors.highlight(ext.name);
        const version = ext.version ? colors.muted(`v${ext.version}`) : '';
        const type = colors.muted(`[${ext.type}]`);

        console.log(`  ${num} ${name} ${version} ${type}`);

        if (ext.description) {
          console.log(`     ${colors.muted(ext.description)}`);
        }

        if (ext.type === 'bundled') {
          const size = calculateBundleSize(ext);
          const sizeMB = (size / 1024 / 1024).toFixed(2);
          console.log(`     ${colors.muted(`Size: ${sizeMB} MB (compressed)`)}`);
        }
      });
    }

    // Installation command
    console.log(colors.bold('\n  Install:\n'));
    if (source === 'registry') {
      console.log(`  ${colors.highlight(`ext-pack install ${pack}`)}`);
    } else {
      console.log(`  ${colors.highlight(`ext-pack install ${pack}`)}`);
    }

    console.log();
  });

export default infoCommand;
