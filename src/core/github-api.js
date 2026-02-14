/**
 * GitHub API utilities for fetching extension releases
 * Adapted for Node.js from extension-pack-hub
 */

import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';
import { Extract } from 'unzipper';
import fs from 'fs-extra';

const { ensureDirSync } = fs;

const baseUrl = 'https://api.github.com';

/**
 * Create detailed error message from GitHub API response
 * @param {Response} response - Fetch response object
 * @param {string} context - What operation was being performed
 * @returns {string} Detailed error message
 */
function createGitHubError(response, context) {
  const status = response.status;

  // Check for rate limiting
  if (status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetTime = response.headers.get('x-ratelimit-reset');

    if (remaining === '0' && resetTime) {
      const resetDate = new Date(parseInt(resetTime) * 1000);
      const minutesUntilReset = Math.ceil((resetDate - new Date()) / 60000);
      return `GitHub rate limit exceeded. Try again in ${minutesUntilReset} minutes.\n\nTip: Authenticate with a GitHub token to increase rate limit.`;
    }

    return `GitHub access forbidden (403). The repository may be private or you may need authentication.`;
  }

  // Repository or release not found
  if (status === 404) {
    if (context.includes('release')) {
      return `Release not found. The repository exists but has no releases.\n\nTip: Check if the repository has published releases on GitHub.`;
    }
    return `Repository not found. Check that the owner/repo name is correct.`;
  }

  // Network errors
  if (status === 0 || status >= 500) {
    return `Network error connecting to GitHub. Check your internet connection and try again.`;
  }

  // Generic error
  return `GitHub API error (${status}). ${context} failed.`;
}

/**
 * Get the latest release for a repository
 */
export async function getLatestRelease(owner, repo) {
  const url = `${baseUrl}/repos/${owner}/${repo}/releases/latest`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(createGitHubError(response, `Fetching latest release for ${owner}/${repo}`));
    }

    return response.json();
  } catch (err) {
    // Handle network failures (ENOTFOUND, ECONNREFUSED, etc.)
    if (err.message.includes('fetch failed') || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to GitHub. Check your internet connection and try again.`);
    }
    throw err;
  }
}

/**
 * Get a specific release by tag
 */
export async function getReleaseByTag(owner, repo, tag) {
  const url = `${baseUrl}/repos/${owner}/${repo}/releases/tags/${tag}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(createGitHubError(response, `Fetching release ${tag} for ${owner}/${repo}`));
    }

    return response.json();
  } catch (err) {
    // Handle network failures
    if (err.message.includes('fetch failed') || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to GitHub. Check your internet connection and try again.`);
    }
    throw err;
  }
}

/**
 * Get the download URL for an asset in a release
 */
export function getAssetDownloadUrl(release, assetName = null) {
  const asset = release.assets.find(a =>
    (assetName && a.name === assetName) ||
    a.name.endsWith('.zip') ||
    a.name.endsWith('.crx')
  );

  if (!asset) {
    // Fall back to zipball if no specific asset
    return release.zipball_url;
  }

  return asset.browser_download_url;
}

/**
 * Parse a repo string (e.g., "owner/repo") into parts
 */
export function parseRepo(repoString) {
  const parts = repoString.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid repo format. Expected: owner/repo');
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Check if a repository exists and is public
 */
export async function checkRepoExists(owner, repo) {
  const url = `${baseUrl}/repos/${owner}/${repo}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  return response.ok;
}

/**
 * Get repository info including permissions from manifest
 */
export async function getManifestPermissions(owner, repo, ref = 'main') {
  // Try to fetch manifest.json from the repo
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/manifest.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try 'master' branch
      const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/manifest.json`;
      const masterResponse = await fetch(masterUrl);
      if (!masterResponse.ok) return null;
      return masterResponse.json();
    }
    return response.json();
  } catch (e) {
    return null;
  }
}

/**
 * Analyze manifest permissions for security warnings
 */
export function analyzePermissions(manifest) {
  const warnings = [];
  const dangerousPermissions = {
    '<all_urls>': 'Access to all websites',
    'http://*/*': 'Access to all HTTP websites',
    'https://*/*': 'Access to all HTTPS websites',
    '*://*/*': 'Access to all websites',
    'webRequest': 'Can intercept network traffic',
    'webRequestBlocking': 'Can block network requests',
    'nativeMessaging': 'Can run local programs',
    'management': 'Can control other extensions',
    'debugger': 'Can debug other pages',
    'cookies': 'Can access cookies',
    'history': 'Can access browsing history',
    'tabs': 'Can access tab information'
  };

  const allPermissions = [
    ...(manifest.permissions || []),
    ...(manifest.host_permissions || []),
    ...(manifest.optional_permissions || [])
  ];

  allPermissions.forEach(perm => {
    if (dangerousPermissions[perm]) {
      warnings.push({
        permission: perm,
        description: dangerousPermissions[perm],
        level: perm.includes('all') || perm === 'nativeMessaging' ? 'high' : 'medium'
      });
    }
  });

  return warnings;
}

/**
 * Download and extract a GitHub release to target directory
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} tag - Release tag (or 'latest')
 * @param {string} targetPath - Directory to extract to
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<string>} Path to extracted extension
 */
export async function downloadRelease(owner, repo, tag, targetPath, onProgress = null) {
  // Ensure target directory exists
  ensureDirSync(targetPath);

  // Get release info
  const release = tag === 'latest'
    ? await getLatestRelease(owner, repo)
    : await getReleaseByTag(owner, repo, tag);

  const downloadUrl = getAssetDownloadUrl(release);

  // Download the zip file
  try {
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Download file not found. The release asset may have been deleted.`);
      }
      if (response.status >= 500) {
        throw new Error(`GitHub server error. Try again in a few moments.`);
      }
      throw new Error(`Failed to download release: ${response.status}`);
    }

    // Get total size for progress
    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedSize = 0;

    // Extract zip stream directly to target directory
    await pipeline(
      response.body,
      async function* (source) {
        for await (const chunk of source) {
          downloadedSize += chunk.length;
          if (onProgress && totalSize > 0) {
            const progress = (downloadedSize / totalSize) * 100;
            onProgress(progress, downloadedSize, totalSize);
          }
          yield chunk;
        }
      },
      Extract({ path: targetPath })
    );

    return targetPath;
  } catch (err) {
    // Handle network failures during download
    if (err.message.includes('fetch failed') || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      throw new Error(`Network connection lost during download. Check your internet connection and try again.`);
    }
    // Handle extraction errors
    if (err.message.includes('invalid') || err.message.includes('zip')) {
      throw new Error(`Downloaded file is corrupted or not a valid zip archive. Try again.`);
    }
    throw err;
  }
}

/**
 * Get extension directory from extracted release
 * (Handles case where extension is in a subdirectory)
 */
export async function findExtensionDir(extractedPath) {
  const fs = await import('fs-extra');
  const { join } = await import('path');

  // Check if manifest.json is at root
  const rootManifest = join(extractedPath, 'manifest.json');
  if (await fs.pathExists(rootManifest)) {
    return extractedPath;
  }

  // Search in subdirectories
  const entries = await fs.readdir(extractedPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subManifest = join(extractedPath, entry.name, 'manifest.json');
      if (await fs.pathExists(subManifest)) {
        return join(extractedPath, entry.name);
      }
    }
  }

  throw new Error('Could not find manifest.json in extracted release');
}
