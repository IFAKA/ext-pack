/**
 * Interactive wizard for creating extension packs
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import inquirer from 'inquirer';
import ora from 'ora';
import { basename, resolve, join } from 'path';
import { colors, successBox, clearScreen, browseDirectory } from './helpers.js';
import { scanDirectory } from '../core/extension-scanner.js';
import { createPack, writePackFile } from '../core/pack-codec.js';
import { getPlatform } from '../utils/browser-detector.js';

/**
 * Run the create pack wizard
 * @returns {Promise<string|null>} Path to created pack file or null if cancelled
 */
export async function runCreateWizard() {
  clearScreen();

  console.log(colors.bold('\n  Create Extension Pack\n'));

  // Step 1: Get pack name
  const { packName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'packName',
      message: 'Pack name:',
      default: () => {
        const cwd = process.cwd();
        return basename(cwd) + '-extensions';
      },
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Pack name is required';
        }
        return true;
      }
    }
  ]);

  // Step 2: Detect extension directories
  const detectSpinner = ora('Looking for extensions...').start();

  const candidates = detectExtensionDirs();
  detectSpinner.stop();

  let scanDir;

  if (candidates.length > 0) {
    const choices = candidates.map(c => ({
      name: `${c.label} ${colors.muted(`(${c.count} extension${c.count !== 1 ? 's' : ''})`)} ${colors.muted('—')} ${colors.muted(c.path)}`,
      value: c.path,
      short: c.label
    }));
    choices.push({ name: colors.muted('Browse for a directory...'), value: '__custom__', short: 'Custom' });

    const { selectedDir } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedDir',
        message: 'Where to scan for extensions:',
        choices
      }
    ]);

    if (selectedDir === '__custom__') {
      scanDir = await browseDirectory('Browse for directory to scan:', homedir());
    } else {
      scanDir = selectedDir;
    }
  } else {
    console.log(colors.muted('No extensions auto-detected.\n'));
    scanDir = await browseDirectory('Browse for directory to scan:', homedir());
  }

  // Step 3: Scan selected directory
  const spinner = ora('Scanning for extensions...').start();

  const scanPath = resolve(scanDir);
  const { extensions, errors } = scanDirectory(scanPath);

  spinner.stop();

  if (extensions.length === 0) {
    console.log(colors.error('\nNo valid extensions found in this directory.'));
    console.log(colors.muted('Extensions must have a manifest.json file at their root.\n'));

    if (errors.length > 0) {
      console.log(colors.warning('Errors encountered:'));
      errors.forEach(err => {
        console.log(colors.muted(`  ${err.path}: ${err.error}`));
      });
      console.log();
    }

    return null;
  }

  console.log(colors.success(`\nFound ${extensions.length} extension(s)\n`));

  // Show extensions with descriptions
  extensions.forEach((ext, i) => {
    const num = colors.muted(`${i + 1}.`);
    const name = colors.highlight(ext.name);
    const version = colors.muted(`v${ext.version}`);
    const desc = ext.description ? colors.muted(`\n     ${ext.description}`) : '';
    console.log(`  ${num} ${name} ${version}${desc}`);
  });
  console.log();

  // Step 4: Select extensions to include — ALL CHECKED BY DEFAULT
  const { selectedIndexes } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIndexes',
      message: 'Select extensions to include:',
      choices: extensions.map((ext, i) => ({
        name: `${ext.name} (v${ext.version})`,
        value: i,
        checked: true
      })),
      validate: (answer) => {
        if (answer.length === 0) {
          return 'You must select at least one extension';
        }
        return true;
      }
    }
  ]);

  const selectedExtensions = selectedIndexes.map(i => extensions[i]);

  // Step 5: Optionally generate description with Ollama
  let generatedDescription = null;
  const ollamaAvailable = await isOllamaRunning();

  if (ollamaAvailable) {
    const { useOllama } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useOllama',
        message: 'Generate description with Ollama?',
        default: false
      }
    ]);

    if (useOllama) {
      generatedDescription = await generateDescription(selectedExtensions);
    }
  }

  // Step 6: Get pack description and author
  const { description, author } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Pack description (optional):',
      default: generatedDescription || `${selectedExtensions.length} browser extensions`
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author name (optional):',
      default: process.env.USER || 'unknown'
    }
  ]);

  // Step 7: Choose output location
  const defaultFileName = `${packName.toLowerCase().replace(/\s+/g, '-')}.extpack`;
  const { outputFile } = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputFile',
      message: 'Save pack as:',
      default: join(process.cwd(), defaultFileName)
    }
  ]);

  // Create pack
  const pack = createPack(
    packName,
    description,
    author,
    selectedExtensions
  );

  // Write pack file
  const saveSpinner = ora('Saving pack...').start();

  try {
    await writePackFile(resolve(outputFile), pack);
    saveSpinner.succeed('Pack saved');

    console.log(successBox(
      `${colors.highlight(outputFile)}\n\n` +
      `${selectedExtensions.length} extension(s) | ${pack.created}`
    ));

    return outputFile;
  } catch (err) {
    saveSpinner.fail('Failed to save pack');
    console.error(colors.error(`\nError: ${err.message}\n`));
    return null;
  }
}

/**
 * Known browser extension directories per platform
 */
const EXTENSION_DIRS = {
  darwin: [
    { label: 'Brave', path: join(homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Extensions') },
    { label: 'Chrome', path: join(homedir(), 'Library/Application Support/Google/Chrome/Default/Extensions') },
    { label: 'Chromium', path: join(homedir(), 'Library/Application Support/Chromium/Default/Extensions') },
    { label: 'Edge', path: join(homedir(), 'Library/Application Support/Microsoft Edge/Default/Extensions') }
  ],
  linux: [
    { label: 'Brave', path: join(homedir(), '.config/BraveSoftware/Brave-Browser/Default/Extensions') },
    { label: 'Chrome', path: join(homedir(), '.config/google-chrome/Default/Extensions') },
    { label: 'Chromium', path: join(homedir(), '.config/chromium/Default/Extensions') },
    { label: 'Edge', path: join(homedir(), '.config/microsoft-edge/Default/Extensions') }
  ],
  win32: [
    { label: 'Brave', path: join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/User Data/Default/Extensions') },
    { label: 'Chrome', path: join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/Extensions') },
    { label: 'Chromium', path: join(process.env.LOCALAPPDATA || '', 'Chromium/User Data/Default/Extensions') },
    { label: 'Edge', path: join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data/Default/Extensions') }
  ]
};

/**
 * Detect directories that contain extensions
 */
function detectExtensionDirs() {
  const results = [];

  // Check cwd first
  const cwd = process.cwd();
  const cwdScan = scanDirectory(cwd, { maxDepth: 2 });
  if (cwdScan.extensions.length > 0) {
    results.push({ label: 'Current directory', path: cwd, count: cwdScan.extensions.length });
  }

  // Check known browser extension dirs
  const platform = getPlatform();
  const knownDirs = EXTENSION_DIRS[platform] || [];

  for (const dir of knownDirs) {
    if (existsSync(dir.path)) {
      const scan = scanDirectory(dir.path, { maxDepth: 2 });
      if (scan.extensions.length > 0) {
        results.push({ label: dir.label, path: dir.path, count: scan.extensions.length });
      }
    }
  }

  return results;
}

/**
 * Check if Ollama is running locally
 */
async function isOllamaRunning() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available Ollama models
 */
async function getAvailableModels() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return [];

    const data = await res.json();
    return data.models?.map(m => m.name) || [];
  } catch {
    return [];
  }
}

/**
 * Select the best model for description generation
 * Prefers smaller, faster models suitable for simple text generation
 */
function selectBestModel(availableModels) {
  // Preferred models in order (smaller/faster first)
  const preferred = [
    'qwen2.5:1.5b',
    'qwen2.5:3b',
    'llama3.2:1b',
    'llama3.2:3b',
    'llama3.2',
    'qwen2.5:7b',
    'llama3.1:8b',
    'llama3:8b',
    'qwen2.5',
    'llama3.1',
    'llama3'
  ];

  // Try to find a preferred model
  for (const model of preferred) {
    const match = availableModels.find(m => m.startsWith(model));
    if (match) return match;
  }

  // Fallback to first available model
  return availableModels[0] || null;
}

/**
 * Generate a pack description using Ollama
 */
async function generateDescription(extensions) {
  const extList = extensions.map(e => `${e.name}: ${e.description || 'no description'}`).join(', ');
  const prompt = `Write a single short sentence (under 15 words) describing this browser extension pack containing: ${extList}. Reply with only the sentence, no quotes.`;

  const spinner = ora('Checking available models...').start();

  try {
    // Get available models
    const models = await getAvailableModels();
    const model = selectBestModel(models);

    if (!model) {
      spinner.fail('No Ollama models found');
      console.log(colors.muted('  Run "ollama pull llama3.2" to install a model\n'));
      return null;
    }

    spinner.text = `Generating description with ${model}...`;

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      const error = await res.text().catch(() => 'Unknown error');
      spinner.fail('Failed to generate description');
      console.log(colors.muted(`  ${error}\n`));
      return null;
    }

    const data = await res.json();
    const text = data.response?.trim();
    spinner.succeed('Description generated');
    return text || null;
  } catch (err) {
    spinner.fail('Failed to generate description');
    console.log(colors.muted(`  ${err.message}\n`));
    return null;
  }
}
