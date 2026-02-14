/**
 * Browser detection utilities - Find installed Chromium-based browsers
 */

import { existsSync } from 'fs';
import { platform } from 'os';

/**
 * Browser definitions with platform-specific paths
 */
const BROWSER_PATHS = {
  darwin: {
    brave: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    chromium: '/Applications/Chromium.app/Contents/MacOS/Chromium',
    edge: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  },
  linux: {
    brave: '/usr/bin/brave-browser',
    chrome: '/usr/bin/google-chrome',
    chromium: '/usr/bin/chromium',
    edge: '/usr/bin/microsoft-edge'
  },
  win32: {
    brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    chromium: 'C:\\Program Files\\Chromium\\Application\\chromium.exe',
    edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  }
};

/**
 * Browser process names for each platform
 */
const BROWSER_PROCESSES = {
  darwin: {
    brave: 'Brave Browser',
    chrome: 'Google Chrome',
    chromium: 'Chromium',
    edge: 'Microsoft Edge'
  },
  linux: {
    brave: 'brave-browser',
    chrome: 'chrome',
    chromium: 'chromium',
    edge: 'msedge'
  },
  win32: {
    brave: 'brave.exe',
    chrome: 'chrome.exe',
    chromium: 'chromium.exe',
    edge: 'msedge.exe'
  }
};

/**
 * Get current platform
 * @returns {string}
 */
export function getPlatform() {
  return platform();
}

/**
 * Get browser paths for current platform
 * @returns {Object}
 */
export function getBrowserPaths() {
  const currentPlatform = getPlatform();
  return BROWSER_PATHS[currentPlatform] || {};
}

/**
 * Get browser process names for current platform
 * @returns {Object}
 */
export function getBrowserProcessNames() {
  const currentPlatform = getPlatform();
  return BROWSER_PROCESSES[currentPlatform] || {};
}

/**
 * Build a browser object with all metadata
 * @param {string} name - Browser name
 * @param {string} path - Browser executable path
 * @param {string} processName - Browser process name
 * @returns {Object} Browser object
 */
function buildBrowserObject(name, path, processName) {
  return {
    name,
    path,
    processName,
    displayName: name.charAt(0).toUpperCase() + name.slice(1)
  };
}

/**
 * Detect all installed browsers
 * @returns {Array<Object>} Array of {name, path, processName, displayName}
 */
export function detectBrowsers() {
  const paths = getBrowserPaths();
  const processNames = getBrowserProcessNames();
  const installed = [];

  for (const [name, path] of Object.entries(paths)) {
    if (existsSync(path)) {
      installed.push(buildBrowserObject(name, path, processNames[name]));
    }
  }

  return installed;
}

/**
 * Get preferred browser based on user config or defaults
 * @param {Array<string>} preferences - Array of browser names in order of preference
 * @returns {Object|null} Browser object or null if none found
 */
export function getPreferredBrowser(preferences = ['brave', 'chrome', 'chromium', 'edge']) {
  const installed = detectBrowsers();

  if (installed.length === 0) {
    return null;
  }

  // Find first preferred browser that's installed
  for (const pref of preferences) {
    const browser = installed.find(b => b.name === pref);
    if (browser) {
      return browser;
    }
  }

  // Fall back to first installed browser
  return installed[0];
}

/**
 * Get browser by name
 * @param {string} name - Browser name (brave, chrome, etc.)
 * @returns {Object|null}
 */
export function getBrowser(name) {
  const paths = getBrowserPaths();
  const processNames = getBrowserProcessNames();

  const path = paths[name];
  if (!path || !existsSync(path)) {
    return null;
  }

  return buildBrowserObject(name, path, processNames[name]);
}

/**
 * Check if a specific browser is installed
 * @param {string} name - Browser name
 * @returns {boolean}
 */
export function isBrowserInstalled(name) {
  const paths = getBrowserPaths();
  const path = paths[name];
  return path && existsSync(path);
}
