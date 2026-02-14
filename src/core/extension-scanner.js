/**
 * Extension scanner - Find and validate browser extensions in directories
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Resolve Chrome i18n message placeholder
 * @param {string} text - Text that may contain __MSG_*__ placeholder
 * @param {string} extensionPath - Path to extension directory
 * @param {Object} manifest - Parsed manifest object
 * @returns {string} Resolved text or original if not a placeholder
 */
function resolveI18nMessage(text, extensionPath, manifest) {
  if (!text || typeof text !== 'string') return text;

  // Check if it's an i18n placeholder
  const match = text.match(/^__MSG_(.+)__$/);
  if (!match) return text;

  const messageKey = match[1];

  // Determine locale to use (default_locale or 'en')
  const locale = manifest.default_locale || 'en';

  // Try to read messages.json
  const messagesPath = join(extensionPath, '_locales', locale, 'messages.json');

  try {
    if (existsSync(messagesPath)) {
      const messagesContent = readFileSync(messagesPath, 'utf-8');
      const messages = JSON.parse(messagesContent);

      if (messages[messageKey] && messages[messageKey].message) {
        return messages[messageKey].message;
      }
    }
  } catch (err) {
    // Silently fail and return original text
  }

  // Fallback: try 'en' if default_locale was different
  if (locale !== 'en') {
    const enMessagesPath = join(extensionPath, '_locales', 'en', 'messages.json');
    try {
      if (existsSync(enMessagesPath)) {
        const messagesContent = readFileSync(enMessagesPath, 'utf-8');
        const messages = JSON.parse(messagesContent);

        if (messages[messageKey] && messages[messageKey].message) {
          return messages[messageKey].message;
        }
      }
    } catch (err) {
      // Silently fail and return original text
    }
  }

  // Return original if resolution failed
  return text;
}

/**
 * Recursively scan directory for extensions
 * @param {string} rootPath - Directory to scan
 * @param {Object} options - Scan options
 * @returns {Array<Object>} Array of found extensions
 */
export function scanDirectory(rootPath, options = {}) {
  const {
    maxDepth = 3,
    onProgress = null,
    excludeDirs = [
      'node_modules',
      '.git',
      '.next',
      '.nuxt',
      'dist',
      'build',
      'coverage',
      '.cache',
      '.vscode',
      '.idea',
      'vendor',
      '__pycache__',
      '.pytest_cache',
      'venv',
      '.venv',
      'target',
      'out',
      'bin',
      'obj'
    ]
  } = options;

  const extensions = [];
  const errors = [];
  let directoriesScanned = 0;

  function scan(currentPath, depth = 0) {
    if (depth > maxDepth) return;

    directoriesScanned++;

    // Call progress callback
    if (onProgress) {
      onProgress({
        directoriesScanned,
        currentPath,
        extensionsFound: extensions.length
      });
    }

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      // Check if current directory has manifest.json
      const hasManifest = entries.some(e => e.isFile() && e.name === 'manifest.json');

      if (hasManifest) {
        const result = validateExtension(currentPath);
        if (result.valid) {
          extensions.push(result.extension);

          // Update progress after finding extension
          if (onProgress) {
            onProgress({
              directoriesScanned,
              currentPath,
              extensionsFound: extensions.length,
              foundExtension: result.extension
            });
          }
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

    // Extract metadata and resolve i18n messages
    const extension = {
      type: 'local',
      path: extensionPath,
      name: resolveI18nMessage(manifest.name, extensionPath, manifest),
      version: manifest.version,
      description: resolveI18nMessage(manifest.description, extensionPath, manifest),
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
