/**
 * Pack URL encoding/decoding utilities
 * Adapted for Node.js from extension-pack-hub
 */

import fs from 'fs-extra';

/**
 * Encode a pack object to a URL-safe string
 */
export function encode(pack) {
  const json = JSON.stringify(pack);
  // Use Node.js Buffer instead of btoa
  const encoded = Buffer.from(json, 'utf-8').toString('base64');
  return encoded;
}

/**
 * Decode a URL-safe string to a pack object
 */
export function decode(encoded) {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode pack:', e);
    return null;
  }
}

/**
 * Generate a full shareable URL for a pack
 */
export function generateUrl(pack, baseUrl = 'https://ifaka.github.io/extension-pack-hub') {
  const encoded = encode(pack);
  return `${baseUrl}/#${encoded}`;
}

/**
 * Extract pack data from a URL
 */
export function parseUrl(url) {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.hash.slice(1); // Remove the # prefix
    if (!hash) return null;
    return decode(hash);
  } catch (e) {
    console.error('Failed to parse URL:', e);
    return null;
  }
}

/**
 * Create a new pack manifest
 */
export function createPack(name, description, author, extensions) {
  return {
    v: 3,
    name,
    description,
    author,
    extensions,
    created: new Date().toISOString().split('T')[0]
  };
}

/**
 * Validate a pack object
 */
export function validate(pack) {
  const errors = [];

  // Support v2 and v3
  if (!pack.v || ![2, 3].includes(pack.v)) {
    errors.push('Invalid or missing version (must be 2 or 3)');
  }

  if (!pack.name || typeof pack.name !== 'string') {
    errors.push('Pack name is required');
  }

  if (!pack.extensions || !Array.isArray(pack.extensions)) {
    errors.push('Extensions array is required');
  } else {
    pack.extensions.forEach((ext, i) => {
      if (!ext.type || !['store', 'github', 'local', 'bundled'].includes(ext.type)) {
        errors.push(`Extension ${i}: invalid type (must be 'store', 'github', 'local', or 'bundled')`);
      }

      if (!ext.name) {
        errors.push(`Extension ${i}: name is required`);
      }

      if (ext.type === 'store' && !ext.id) {
        errors.push(`Extension ${i}: store ID is required`);
      }

      if (ext.type === 'github' && !ext.repo) {
        errors.push(`Extension ${i}: GitHub repo is required`);
      }

      if (ext.type === 'local' && !ext.path) {
        errors.push(`Extension ${i}: local path is required`);
      }

      if (ext.type === 'bundled') {
        if (!ext.files || typeof ext.files !== 'object') {
          errors.push(`Extension ${i}: bundled type requires 'files' object`);
        }
        if (!ext.version) {
          errors.push(`Extension ${i}: bundled type requires 'version' field`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Upgrade v2 pack to v3
 */
export function upgrade(pack) {
  if (pack.v === 3) return pack;

  if (pack.v === 2) {
    return {
      ...pack,
      v: 3,
      updated: new Date().toISOString()
    };
  }

  throw new Error('Cannot upgrade pack from unknown version');
}

/**
 * Read pack from file
 */
export async function readPackFile(filePath) {
  const packData = await fs.readJson(filePath);

  // Validate pack
  const validation = validate(packData);
  if (!validation.valid) {
    throw new Error(`Invalid pack file: ${validation.errors.join(', ')}`);
  }

  // Auto-upgrade v2 to v3
  if (packData.v === 2) {
    return upgrade(packData);
  }

  return packData;
}

/**
 * Write pack to file
 */
export async function writePackFile(filePath, pack) {
  // Validate before writing
  const validation = validate(pack);
  if (!validation.valid) {
    throw new Error(`Cannot write invalid pack: ${validation.errors.join(', ')}`);
  }

  await fs.writeJson(filePath, pack, { spaces: 2 });
}
