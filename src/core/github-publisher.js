/**
 * GitHub publisher - Publish packs to GitHub registry
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs-extra';
import { readPackFile } from './pack-codec.js';
import { calculateBundleSize } from './bundle-codec.js';

const REGISTRY_OWNER = 'IFAKA';
const REGISTRY_REPO = 'ext-pack-registry';

/**
 * Get GitHub token from environment or gh CLI
 * @returns {Promise<string>} GitHub token
 */
async function getGitHubToken() {
  // Try environment variable first
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  // Try gh CLI
  try {
    const { execSync } = await import('child_process');
    const token = execSync('gh auth token', { encoding: 'utf-8' }).trim();
    return token;
  } catch {
    throw new Error(
      'GitHub authentication required.\n' +
      'Either set GITHUB_TOKEN env variable or run: gh auth login'
    );
  }
}

/**
 * Get authenticated GitHub username
 * @param {Octokit} octokit - Octokit instance
 * @returns {Promise<string>} GitHub username
 */
async function getGitHubUsername(octokit) {
  const { data: user } = await octokit.users.getAuthenticated();
  return user.login;
}

/**
 * Calculate pack metadata
 * @param {Object} pack - Pack object
 * @returns {Object} Pack metadata
 */
function calculatePackMetadata(pack) {
  let totalSize = 0;

  // Calculate size from bundled extensions
  pack.extensions.forEach(ext => {
    if (ext.type === 'bundled') {
      totalSize += calculateBundleSize(ext);
    }
  });

  return {
    id: pack.name.toLowerCase().replace(/\s+/g, '-'),
    name: pack.name,
    description: pack.description || '',
    author: pack.author || {},
    version: pack.version || '1.0.0',
    extensions: pack.extensions.length,
    size: totalSize,
    tags: pack.tags || [],
    created: pack.created || new Date().toISOString().split('T')[0],
    updated: new Date().toISOString(),
    downloads: 0,
    stars: 0
  };
}

/**
 * Publish pack to GitHub registry
 * @param {string} packPath - Path to pack file
 * @param {Object} options - Publish options
 * @returns {Promise<Object>} Publish result
 */
export async function publishPack(packPath, options = {}) {
  // Read and validate pack
  const pack = await readPackFile(packPath);
  const metadata = calculatePackMetadata(pack);

  // Get GitHub token
  const token = await getGitHubToken();
  const octokit = new Octokit({ auth: token });

  // Get current user
  const username = await getGitHubUsername(octokit);

  // Determine release tag
  const tag = options.tag || `${metadata.id}-v${metadata.version}`;
  const releaseName = `${metadata.name} v${metadata.version}`;

  // Check if release already exists
  try {
    await octokit.repos.getReleaseByTag({
      owner: REGISTRY_OWNER,
      repo: REGISTRY_REPO,
      tag
    });

    throw new Error(
      `Release ${tag} already exists.\n` +
      'Increment version or use --tag to specify a different tag.'
    );
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
    // 404 is good - release doesn't exist yet
  }

  // Create release
  const { data: release } = await octokit.repos.createRelease({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    tag_name: tag,
    name: releaseName,
    body: metadata.description,
    draft: false,
    prerelease: false
  });

  // Upload pack file as release asset
  const packData = await fs.readFile(packPath);
  const assetName = `${metadata.id}.extpack`;

  const { data: asset } = await octokit.repos.uploadReleaseAsset({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    release_id: release.id,
    name: assetName,
    data: packData
  });

  // Update metadata with download URL
  metadata.url = asset.browser_download_url;

  // Determine if we need to fork or branch
  const needsFork = username !== REGISTRY_OWNER;

  if (needsFork) {
    // Fork registry repo if not already forked
    await forkRegistryRepo(octokit, username);
    // Update registry.json via PR from fork
    const prUrl = await updateRegistryViaPR(octokit, username, metadata, needsFork);
    return {
      releaseUrl: release.html_url,
      downloadUrl: asset.browser_download_url,
      prUrl,
      metadata
    };
  } else {
    // Same owner - create branch and PR
    const prUrl = await updateRegistryViaBranch(octokit, metadata);
    return {
      releaseUrl: release.html_url,
      downloadUrl: asset.browser_download_url,
      prUrl,
      metadata
    };
  }

}

/**
 * Fork registry repo
 * @param {Octokit} octokit - Octokit instance
 * @param {string} username - GitHub username
 */
async function forkRegistryRepo(octokit, username) {
  try {
    // Check if fork already exists
    await octokit.repos.get({
      owner: username,
      repo: REGISTRY_REPO
    });
  } catch (error) {
    if (error.status === 404) {
      // Fork doesn't exist, create it
      await octokit.repos.createFork({
        owner: REGISTRY_OWNER,
        repo: REGISTRY_REPO
      });

      // Wait for fork to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      throw error;
    }
  }
}

/**
 * Update registry.json via branch (for same owner)
 * @param {Octokit} octokit - Octokit instance
 * @param {Object} metadata - Pack metadata
 * @returns {Promise<string>} PR URL
 */
async function updateRegistryViaBranch(octokit, metadata) {
  const branchName = `add-${metadata.id}-${Date.now()}`;

  // Get main branch ref
  const { data: mainRef } = await octokit.git.getRef({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    ref: 'heads/main'
  });

  // Create new branch
  await octokit.git.createRef({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    ref: `refs/heads/${branchName}`,
    sha: mainRef.object.sha
  });

  // Get current registry.json
  const { data: file } = await octokit.repos.getContent({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    path: 'registry.json',
    ref: branchName
  });

  // Decode and parse registry
  const registryContent = Buffer.from(file.content, 'base64').toString('utf-8');
  const registry = JSON.parse(registryContent);

  // Add/update pack
  registry.packs[metadata.id] = metadata;
  registry.updated = new Date().toISOString();

  // Encode updated registry
  const newContent = JSON.stringify(registry, null, 2);
  const newContentBase64 = Buffer.from(newContent, 'utf-8').toString('base64');

  // Update file in branch
  await octokit.repos.createOrUpdateFileContents({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    path: 'registry.json',
    message: `Add ${metadata.name} v${metadata.version}`,
    content: newContentBase64,
    sha: file.sha,
    branch: branchName
  });

  // Wait for commit to be processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    title: `Add ${metadata.name} v${metadata.version}`,
    head: branchName,
    base: 'main',
    body: `## ${metadata.name}

${metadata.description}

**Extensions:** ${metadata.extensions}
**Size:** ${(metadata.size / 1024 / 1024).toFixed(2)} MB
**Tags:** ${metadata.tags.join(', ') || 'none'}

---
*Automated PR from ext-pack CLI*`
  });

  return pr.html_url;
}

/**
 * Update registry.json via pull request (for forks)
 * @param {Octokit} octokit - Octokit instance
 * @param {string} username - GitHub username
 * @param {Object} metadata - Pack metadata
 * @param {boolean} needsFork - Whether this is from a fork
 * @returns {Promise<string>} PR URL
 */
async function updateRegistryViaPR(octokit, username, metadata, needsFork) {
  // Get current registry.json from user's fork
  const { data: file } = await octokit.repos.getContent({
    owner: username,
    repo: REGISTRY_REPO,
    path: 'registry.json'
  });

  // Decode and parse registry
  const registryContent = Buffer.from(file.content, 'base64').toString('utf-8');
  const registry = JSON.parse(registryContent);

  // Add/update pack
  registry.packs[metadata.id] = metadata;
  registry.updated = new Date().toISOString();

  // Encode updated registry
  const newContent = JSON.stringify(registry, null, 2);
  const newContentBase64 = Buffer.from(newContent, 'utf-8').toString('base64');

  // Update file in fork
  const { data: commit } = await octokit.repos.createOrUpdateFileContents({
    owner: username,
    repo: REGISTRY_REPO,
    path: 'registry.json',
    message: `Add ${metadata.name} v${metadata.version}`,
    content: newContentBase64,
    sha: file.sha
  });

  // Wait for commit to be fully processed
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner: REGISTRY_OWNER,
    repo: REGISTRY_REPO,
    title: `Add ${metadata.name} v${metadata.version}`,
    head: `${username}:main`,
    base: 'main',
    body: `## ${metadata.name}

${metadata.description}

**Extensions:** ${metadata.extensions}
**Size:** ${(metadata.size / 1024 / 1024).toFixed(2)} MB
**Tags:** ${metadata.tags.join(', ') || 'none'}

---
*Automated PR from ext-pack CLI*`
  });

  return pr.html_url;
}

/**
 * Check if user has GitHub authentication
 * @returns {Promise<boolean>} True if authenticated
 */
export async function hasGitHubAuth() {
  try {
    await getGitHubToken();
    return true;
  } catch {
    return false;
  }
}

export default {
  publishPack,
  hasGitHubAuth
};
