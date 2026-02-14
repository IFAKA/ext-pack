import { homedir } from 'os';
import { join } from 'path';
import fs from 'fs-extra';

const { ensureDirSync, pathExistsSync, readJsonSync, writeJsonSync } = fs;

const CONFIG_DIR = join(homedir(), '.ext-pack');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const INSTALLED_FILE = join(CONFIG_DIR, 'installed.json');
const CACHE_DIR = join(CONFIG_DIR, 'downloads');

/**
 * Ensure config directory exists
 */
export function ensureConfigDir() {
  ensureDirSync(CONFIG_DIR);
  ensureDirSync(CACHE_DIR);
}

/**
 * Check if this is the first run
 * @returns {Promise<boolean>}
 */
export async function checkFirstRun() {
  ensureConfigDir();
  return !pathExistsSync(CONFIG_FILE);
}

/**
 * Mark first run as complete
 */
export function markFirstRunComplete() {
  ensureConfigDir();

  const defaultConfig = {
    version: '1.0.0',
    firstRun: false,
    browser: {
      preference: ['brave', 'chrome', 'chromium'],
      autoKill: true
    },
    paths: {
      cacheDir: CACHE_DIR
    }
  };

  writeJsonSync(CONFIG_FILE, defaultConfig, { spaces: 2 });
}

/**
 * Get user configuration
 * @returns {Object}
 */
export function getConfig() {
  ensureConfigDir();

  if (!pathExistsSync(CONFIG_FILE)) {
    markFirstRunComplete();
  }

  return readJsonSync(CONFIG_FILE);
}

/**
 * Update user configuration
 * @param {Object} updates
 */
export function updateConfig(updates) {
  ensureConfigDir();
  const config = getConfig();
  const updatedConfig = { ...config, ...updates };
  writeJsonSync(CONFIG_FILE, updatedConfig, { spaces: 2 });
}

/**
 * Get installed packs registry
 * @returns {Object}
 */
export function getInstalledPacks() {
  ensureConfigDir();

  if (!pathExistsSync(INSTALLED_FILE)) {
    const defaultRegistry = {
      packs: []
    };
    writeJsonSync(INSTALLED_FILE, defaultRegistry, { spaces: 2 });
    return defaultRegistry;
  }

  return readJsonSync(INSTALLED_FILE);
}

/**
 * Add pack to installed registry
 * @param {Object} pack
 */
export function addInstalledPack(pack) {
  ensureConfigDir();
  const registry = getInstalledPacks();

  // Check if pack already exists
  const existingIndex = registry.packs.findIndex(p => p.name === pack.name);

  if (existingIndex >= 0) {
    // Update existing pack
    registry.packs[existingIndex] = {
      ...pack,
      updated: new Date().toISOString()
    };
  } else {
    // Add new pack
    registry.packs.push({
      ...pack,
      installed: new Date().toISOString()
    });
  }

  writeJsonSync(INSTALLED_FILE, registry, { spaces: 2 });
}

/**
 * Remove pack from installed registry
 * @param {string} packName
 */
export function removeInstalledPack(packName) {
  ensureConfigDir();
  const registry = getInstalledPacks();

  registry.packs = registry.packs.filter(p => p.name !== packName);

  writeJsonSync(INSTALLED_FILE, registry, { spaces: 2 });
}

/**
 * Get cache directory path
 * @returns {string}
 */
export function getCacheDir() {
  return CACHE_DIR;
}

/**
 * Get config directory path
 * @returns {string}
 */
export function getConfigDir() {
  return CONFIG_DIR;
}
