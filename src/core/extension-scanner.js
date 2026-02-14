/**
 * Extension scanner - Find and validate browser extensions in directories
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Recursively scan directory for extensions
 * @param {string} rootPath - Directory to scan
 * @param {Object} options - Scan options
 * @returns {Array<Object>} Array of found extensions
 */
export async function scanDirectory(rootPath, options = {}) {
  const {
    maxDepth = 3,
    excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next']
  } = options;

  const extensions = [];
  const errors = [];

  function scan(currentPath, depth = 0) {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      // Check if current directory has manifest.json
      const hasManifest = entries.some(e => e.isFile() && e.name === 'manifest.json');

      if (hasManifest) {
        const result = validateExtension(currentPath);
        if (result.valid) {
          extensions.push(result.extension);
        } else {
          errors.push({
            path: currentPath,
            error: result.error
          });
        }
        // Don't scan subdirectories if we found an extension
        return;
      }

      // Scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
          const subPath = join(currentPath, entry.name);
          scan(subPath, depth + 1);
        }
      }
    } catch (err) {
      errors.push({
        path: currentPath,
        error: `Failed to scan directory: ${err.message}`
      });
    }
  }

  scan(rootPath);

  return {
    extensions,
    errors
  };
}

/**
 * Validate an extension directory
 * @param {string} extensionPath - Path to extension directory
 * @returns {Object} Validation result
 */
export function validateExtension(extensionPath) {
  try {
    const manifestPath = join(extensionPath, 'manifest.json');

    // Read and parse manifest
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Validate required fields
    const errors = [];

    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Missing or invalid "name" field');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Missing or invalid "version" field');
    }

    if (!manifest.manifest_version) {
      errors.push('Missing "manifest_version" field');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(', ')
      };
    }

    // Extract metadata
    const extension = {
      type: 'local',
      path: extensionPath,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description || null,
      manifestVersion: manifest.manifest_version,
      permissions: [
        ...(manifest.permissions || []),
        ...(manifest.host_permissions || [])
      ],
      icons: manifest.icons || null
    };

    return {
      valid: true,
      extension
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
}

/**
 * Get extension metadata from a specific path
 * @param {string} extensionPath - Path to extension
 * @returns {Object|null} Extension metadata or null
 */
export function getExtensionInfo(extensionPath) {
  const result = validateExtension(extensionPath);
  return result.valid ? result.extension : null;
}

/**
 * Check if a directory contains a valid extension
 * @param {string} dirPath - Directory path
 * @returns {boolean}
 */
export function isExtensionDir(dirPath) {
  try {
    const manifestPath = join(dirPath, 'manifest.json');
    const stat = statSync(manifestPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export default {
  scanDirectory,
  validateExtension,
  getExtensionInfo,
  isExtensionDir
};
