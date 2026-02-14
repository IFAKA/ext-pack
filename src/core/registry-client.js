/**
 * Registry client - Fetch and search extension packs from GitHub registry
 */

import { colors } from '../ui/helpers.js';

const REGISTRY_URL = 'https://raw.githubusercontent.com/ext-pack/registry/main/registry.json';
const CACHE_TTL = 3600000; // 1 hour

let cachedRegistry = null;
let cacheTime = 0;

/**
 * Fetch registry index from GitHub (with caching)
 * @param {boolean} forceRefresh - Force refresh cache
 * @returns {Promise<Object>} Registry data
 */
export async function getRegistryIndex(forceRefresh = false) {
  const now = Date.now();

  // Return cached if valid
  if (!forceRefresh && cachedRegistry && (now - cacheTime) < CACHE_TTL) {
    return cachedRegistry;
  }

  try {
    const response = await fetch(REGISTRY_URL);

    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Validate registry structure
    if (!data.packs || typeof data.packs !== 'object') {
      throw new Error('Invalid registry format');
    }

    cachedRegistry = data;
    cacheTime = now;

    return data;
  } catch (error) {
    // If we have cached data, return it even if stale
    if (cachedRegistry) {
      console.log(colors.warning('\n⚠️  Using cached registry (fetch failed)\n'));
      return cachedRegistry;
    }

    throw new Error(`Failed to fetch registry: ${error.message}`);
  }
}

/**
 * Search packs by query and filters
 * @param {string} query - Search query (name, description)
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching packs
 */
export async function searchPacks(query, options = {}) {
  const registry = await getRegistryIndex();
  const packs = Object.values(registry.packs || {});

  // Filter by query
  let results = packs.filter(pack => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    const matchesName = pack.name?.toLowerCase().includes(lowerQuery);
    const matchesDesc = pack.description?.toLowerCase().includes(lowerQuery);
    const matchesAuthor = pack.author?.name?.toLowerCase().includes(lowerQuery);

    return matchesName || matchesDesc || matchesAuthor;
  });

  // Filter by tag
  if (options.tag) {
    results = results.filter(pack => {
      return pack.tags?.includes(options.tag);
    });
  }

  // Sort by option
  const sortBy = options.sortBy || 'downloads';

  if (sortBy === 'downloads') {
    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortBy === 'stars') {
    results.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  } else if (sortBy === 'updated') {
    results.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  } else if (sortBy === 'name') {
    results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // Limit results
  if (options.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get pack details by ID
 * @param {string} packId - Pack identifier
 * @returns {Promise<Object|null>} Pack details or null if not found
 */
export async function getPackInfo(packId) {
  const registry = await getRegistryIndex();
  return registry.packs[packId] || null;
}

/**
 * Get all available tags
 * @returns {Promise<Array>} List of unique tags
 */
export async function getAllTags() {
  const registry = await getRegistryIndex();
  const packs = Object.values(registry.packs || {});

  const tags = new Set();
  packs.forEach(pack => {
    pack.tags?.forEach(tag => tags.add(tag));
  });

  return Array.from(tags).sort();
}

/**
 * Get popular packs (for autocomplete)
 * @param {number} limit - Max number of packs
 * @returns {Promise<Array>} Popular pack IDs
 */
export async function getPopularPacks(limit = 20) {
  const packs = await searchPacks('', { sortBy: 'downloads', limit });
  return packs.map(p => p.id);
}

/**
 * Download pack file from registry
 * @param {string} packId - Pack identifier
 * @param {string} targetPath - Where to save the pack
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export async function downloadPack(packId, targetPath, onProgress = null) {
  const packInfo = await getPackInfo(packId);

  if (!packInfo) {
    throw new Error(`Pack not found in registry: ${packId}`);
  }

  if (!packInfo.url) {
    throw new Error(`Pack ${packId} has no download URL`);
  }

  // Download file
  const response = await fetch(packInfo.url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  // Get total size
  const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
  let downloadedSize = 0;

  // Read response body
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    downloadedSize += value.length;

    // Report progress
    if (onProgress && totalSize > 0) {
      const progress = (downloadedSize / totalSize) * 100;
      onProgress({
        downloaded: downloadedSize,
        total: totalSize,
        progress: Math.round(progress)
      });
    }
  }

  // Combine chunks
  const blob = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let position = 0;

  for (const chunk of chunks) {
    blob.set(chunk, position);
    position += chunk.length;
  }

  // Write to file
  const fs = await import('fs-extra');
  await fs.writeFile(targetPath, blob);
}

/**
 * Check if registry is accessible
 * @returns {Promise<boolean>} True if registry is accessible
 */
export async function isRegistryAccessible() {
  try {
    await getRegistryIndex();
    return true;
  } catch {
    return false;
  }
}

export default {
  getRegistryIndex,
  searchPacks,
  getPackInfo,
  getAllTags,
  getPopularPacks,
  downloadPack,
  isRegistryAccessible
};
