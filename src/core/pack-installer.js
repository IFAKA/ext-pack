/**
 * Pack installer - Orchestrates installation of extension packs
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { readPackFile } from './pack-codec.js';
import { downloadRelease, parseRepo, findExtensionDir } from './github-api.js';
import { getExtensionInfo } from './extension-scanner.js';
import { getCacheDir, addInstalledPack } from '../utils/config-manager.js';
import { relaunchBrowser } from './browser-launcher.js';

/**
 * Process extension pack and prepare extensions for installation
 * @param {Object} pack - Pack object
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Installation result
 */
export async function processPack(pack, onProgress = null) {
  const results = {
    local: [],
    github: [],
    store: [],
    errors: []
  };

  let current = 0;
  const total = pack.extensions.length;

  for (const ext of pack.extensions) {
    current++;

    if (onProgress) {
      onProgress({
        current,
        total,
        extension: ext,
        type: ext.type
      });
    }

    try {
      if (ext.type === 'local') {
        // Verify local extension exists
        const result = await processLocalExtension(ext);
        results.local.push(result);
      } else if (ext.type === 'github') {
        // Download GitHub extension
        const result = await processGitHubExtension(ext, (progress) => {
          if (onProgress) {
            onProgress({
              current,
              total,
              extension: ext,
              type: 'github',
              downloadProgress: progress
            });
          }
        });
        results.github.push(result);
      } else if (ext.type === 'store') {
        // Store extensions can't be auto-installed
        results.store.push({
          extension: ext,
          status: 'manual_required',
          message: 'Chrome Web Store extensions require manual installation'
        });
      }
    } catch (err) {
      results.errors.push({
        extension: ext,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Process a local extension
 * @param {Object} ext - Extension object
 * @returns {Promise<Object>}
 */
async function processLocalExtension(ext) {
  if (!existsSync(ext.path)) {
    throw new Error(`Extension not found at: ${ext.path}`);
  }

  // Validate extension
  const info = getExtensionInfo(ext.path);

  if (!info) {
    throw new Error(`Invalid extension at: ${ext.path}`);
  }

  return {
    extension: ext,
    path: ext.path,
    status: 'ready',
    info
  };
}

/**
 * Process a GitHub extension
 * @param {Object} ext - Extension object
 * @param {Function} onProgress - Download progress callback
 * @returns {Promise<Object>}
 */
async function processGitHubExtension(ext, onProgress = null) {
  const { owner, repo } = parseRepo(ext.repo);
  const tag = ext.releaseTag || 'latest';

  // Determine cache path
  const cacheDir = getCacheDir();
  const cacheName = `${owner}-${repo}-${tag}`;
  const cachePath = join(cacheDir, cacheName);

  // Check if already cached
  if (existsSync(cachePath)) {
    // Try to find extension in cache
    try {
      const extensionDir = await findExtensionDir(cachePath);
      const info = getExtensionInfo(extensionDir);

      return {
        extension: ext,
        path: extensionDir,
        status: 'cached',
        info
      };
    } catch (err) {
      // Cache is invalid, re-download
    }
  }

  // Download and extract
  await downloadRelease(owner, repo, tag, cachePath, onProgress);

  // Find extension directory in extracted files
  const extensionDir = await findExtensionDir(cachePath);

  // Validate
  const info = getExtensionInfo(extensionDir);
  if (!info) {
    throw new Error('Downloaded extension is invalid');
  }

  return {
    extension: ext,
    path: extensionDir,
    status: 'downloaded',
    info
  };
}

/**
 * Install a pack
 * @param {string} packFilePath - Path to pack file
 * @param {Object} browser - Browser object
 * @param {Object} options - Installation options
 * @returns {Promise<Object>} Installation result
 */
export async function installPack(packFilePath, browser, options = {}) {
  const {
    autoKill = true,
    countdown = 3,
    onProgress = null,
    onCountdown = null
  } = options;

  // Read pack file
  const pack = await readPackFile(packFilePath);

  // Process all extensions
  const results = await processPack(pack, onProgress);

  // Collect all extension paths
  const extensionPaths = [
    ...results.local.map(r => r.path),
    ...results.github.map(r => r.path)
  ];

  if (extensionPaths.length === 0) {
    return {
      success: false,
      reason: 'no_extensions',
      message: 'No extensions to install',
      results
    };
  }

  // Relaunch browser with extensions
  const launchResult = await relaunchBrowser(browser, extensionPaths, {
    autoKill,
    countdown,
    onCountdown
  });

  if (!launchResult.success) {
    return {
      success: false,
      reason: launchResult.reason,
      message: launchResult.message,
      results
    };
  }

  // Update installation registry
  addInstalledPack({
    name: pack.name,
    file: packFilePath,
    extensions: results.local.concat(results.github).map(r => ({
      name: r.extension.name,
      path: r.path,
      status: 'loaded'
    }))
  });

  return {
    success: true,
    message: launchResult.message,
    results,
    extensionCount: extensionPaths.length
  };
}
