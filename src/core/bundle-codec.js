/**
 * Bundle codec - Bundle and extract extensions with gzip compression
 */

import { gzipSync, gunzipSync } from 'zlib';
import fs from 'fs-extra';
import path from 'path';
import { getExtensionInfo } from './extension-scanner.js';

/**
 * Bundle extension directory into compressed base64 files
 * @param {string} extensionPath - Path to extension directory
 * @returns {Promise<Object>} Bundled extension object
 */
export async function bundleExtension(extensionPath) {
  const info = getExtensionInfo(extensionPath);

  if (!info) {
    throw new Error(`Invalid extension at: ${extensionPath}`);
  }

  // Read all files recursively and compress
  const files = await readDirectoryRecursive(extensionPath);

  return {
    type: 'bundled',
    name: info.name,
    version: info.version,
    description: info.description,
    manifestVersion: info.manifestVersion,
    permissions: info.permissions,
    files
  };
}

/**
 * Extract bundled extension to target directory
 * @param {Object} bundledExt - Bundled extension object
 * @param {string} targetPath - Target directory path
 * @returns {Promise<string>} Path to extracted extension
 */
export async function extractBundledExtension(bundledExt, targetPath) {
  await fs.ensureDir(targetPath);

  for (const [relativePath, compressedContent] of Object.entries(bundledExt.files)) {
    const filePath = path.join(targetPath, relativePath);
    await fs.ensureDir(path.dirname(filePath));

    // Decode base64 → gunzip → write
    const buffer = Buffer.from(compressedContent, 'base64');
    const decompressed = gunzipSync(buffer);
    await fs.writeFile(filePath, decompressed);
  }

  return targetPath;
}

/**
 * Recursively read directory and compress files
 * @param {string} dirPath - Directory to read
 * @param {string} basePath - Base path for relative paths
 * @returns {Promise<Object>} Object mapping relative paths to compressed base64 content
 */
async function readDirectoryRecursive(dirPath, basePath = '') {
  const files = {};
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    const fullPath = path.join(dirPath, entry.name);

    if (shouldExcludeFile(relativePath)) continue;

    if (entry.isDirectory()) {
      Object.assign(files, await readDirectoryRecursive(fullPath, relativePath));
    } else if (entry.isFile()) {
      const content = await fs.readFile(fullPath);
      const compressed = gzipSync(content);
      files[relativePath] = compressed.toString('base64');
    }
  }

  return files;
}

/**
 * Exclude unnecessary files from bundle
 * @param {string} relativePath - Relative path to check
 * @returns {boolean} True if file should be excluded
 */
function shouldExcludeFile(relativePath) {
  const excluded = [
    '.git',
    '.svn',
    '.hg',
    'node_modules',
    '.DS_Store',
    'Thumbs.db',
    '.map',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'README.md',
    'CLAUDE.md',
    'LICENSE'
  ];

  return excluded.some(pattern => {
    if (pattern.startsWith('.') && pattern.includes('.')) {
      // Extension pattern like '.map'
      return relativePath.endsWith(pattern);
    }
    // Directory or file name
    return relativePath.includes(path.sep + pattern + path.sep) ||
           relativePath.startsWith(pattern + path.sep) ||
           relativePath === pattern;
  });
}

/**
 * Calculate total size of bundled extension
 * @param {Object} bundledExt - Bundled extension object
 * @returns {number} Total size in bytes
 */
export function calculateBundleSize(bundledExt) {
  if (bundledExt.type !== 'bundled' || !bundledExt.files) {
    return 0;
  }

  return Object.values(bundledExt.files).reduce((sum, compressedContent) => {
    return sum + compressedContent.length;
  }, 0);
}

/**
 * Get compression statistics for a bundled extension
 * @param {string} extensionPath - Original extension path
 * @param {Object} bundledExt - Bundled extension object
 * @returns {Promise<Object>} Compression stats
 */
export async function getCompressionStats(extensionPath, bundledExt) {
  // Calculate original size
  let originalSize = 0;
  const files = await readDirectoryRecursive(extensionPath);

  for (const compressedContent of Object.values(files)) {
    // Decode to get compressed size
    const buffer = Buffer.from(compressedContent, 'base64');
    originalSize += buffer.length;
  }

  const bundledSize = calculateBundleSize(bundledExt);
  const ratio = originalSize > 0 ? (bundledSize / originalSize) : 0;

  return {
    originalSize,
    bundledSize,
    compressionRatio: ratio,
    savedBytes: originalSize - bundledSize,
    fileCount: Object.keys(bundledExt.files).length
  };
}

// Default export
export default {
  bundleExtension,
  extractBundledExtension,
  calculateBundleSize,
  getCompressionStats
};
