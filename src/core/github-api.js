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
 * Get the latest release for a repository
 */
export async function getLatestRelease(owner, repo) {
  const url = `${baseUrl}/repos/${owner}/${repo}/releases/latest`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a specific release by tag
 */
export async function getReleaseByTag(owner, repo, tag) {
  const url = `${baseUrl}/repos/${owner}/${repo}/releases/tags/${tag}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
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
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
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

export default {
  getLatestRelease,
  getReleaseByTag,
  getAssetDownloadUrl,
  parseRepo,
  checkRepoExists,
  getManifestPermissions,
  analyzePermissions,
  downloadRelease,
  findExtensionDir
};
