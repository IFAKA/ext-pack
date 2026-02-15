/**
 * Browser launcher - Kill and relaunch browser with extensions
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import find from 'find-process';
import { getPlatform } from '../utils/browser-detector.js';

const execAsync = promisify(exec);

/**
 * Check if a browser is running
 * @param {string} processName - Browser process name
 * @returns {Promise<boolean>}
 */
export async function isBrowserRunning(processName) {
  try {
    const processes = await find('name', processName);
    return processes.length > 0;
  } catch (err) {
    console.error('Error checking browser process:', err);
    return false;
  }
}

/**
 * Kill browser process
 * @param {string} processName - Browser process name
 * @param {boolean} force - Force kill immediately
 * @returns {Promise<boolean>} True if killed successfully
 */
export async function killBrowser(processName, force = false) {
  const currentPlatform = getPlatform();

  try {
    // First, try graceful shutdown
    if (currentPlatform === 'darwin') {
      await execAsync(`killall ${force ? '-9' : '-TERM'} "${processName}"`);
    } else if (currentPlatform === 'linux') {
      await execAsync(`killall ${force ? '-9' : '-TERM'} ${processName}`);
    } else if (currentPlatform === 'win32') {
      await execAsync(`taskkill ${force ? '/F' : ''} /IM "${processName}"`);
    }

    // Wait a bit for process to exit
    if (!force) {
      await sleep(2000);

      // Check if still running
      const stillRunning = await isBrowserRunning(processName);

      if (stillRunning) {
        // Force kill
        return await killBrowser(processName, true);
      }
    }

    return true;
  } catch (err) {
    // Process may not be running, which is fine
    const errorText = (err.message + ' ' + (err.stderr || '')).toLowerCase();

    if (errorText.includes('no such process') ||
        errorText.includes('not found') ||
        errorText.includes('no matching processes')) {
      return true;
    }

    console.error('Error killing browser:', err);
    return false;
  }
}

/**
 * Launch browser with extensions
 * @param {string} browserPath - Path to browser executable
 * @param {Array<string>} extensionPaths - Array of extension directory paths
 * @param {Object} options - Launch options
 * @returns {Promise<Object>} Spawned process
 */
export async function launchBrowser(browserPath, extensionPaths, options = {}) {
  const {
    userDataDir = null,
    detached = true,
    additionalArgs = []
  } = options;

  // Build extension paths argument
  const loadExtensionArg = `--load-extension=${extensionPaths.join(',')}`;

  // Build arguments
  const args = [
    loadExtensionArg,
    ...additionalArgs
  ];

  // Add user data dir if specified
  if (userDataDir) {
    args.push(`--user-data-dir=${userDataDir}`);
  }

  // Spawn browser process
  const child = spawn(browserPath, args, {
    detached,
    stdio: 'ignore'
  });

  if (detached) {
    child.unref();
  }

  return child;
}

/**
 * Relaunch browser with extensions
 * @param {Object} browser - Browser object from detector
 * @param {Array<string>} extensionPaths - Extension paths
 * @param {Object} options - Options
 * @returns {Promise<Object>} Launch result
 */
export async function relaunchBrowser(browser, extensionPaths, options = {}) {
  const {
    autoKill = true,
    countdown = 3,
    onCountdown = null
  } = options;

  // Check if browser is running
  const isRunning = await isBrowserRunning(browser.processName);

  if (isRunning) {
    if (!autoKill) {
      return {
        success: false,
        reason: 'browser_running',
        message: `${browser.displayName} is running. Please close it first.`
      };
    }

    // Countdown before killing
    if (countdown > 0 && onCountdown) {
      for (let i = countdown; i > 0; i--) {
        onCountdown(i);
        await sleep(1000);
      }
    }

    // Kill browser
    const killed = await killBrowser(browser.processName);

    if (!killed) {
      return {
        success: false,
        reason: 'kill_failed',
        message: `Failed to close ${browser.displayName}. Please close it manually.`
      };
    }

    // Wait a bit after killing
    await sleep(1000);
  }

  // Launch browser
  try {
    const process = await launchBrowser(browser.path, extensionPaths, options);

    return {
      success: true,
      process,
      message: `${browser.displayName} launched with ${extensionPaths.length} extension(s)`
    };
  } catch (err) {
    return {
      success: false,
      reason: 'launch_failed',
      error: err,
      message: `Failed to launch ${browser.displayName}: ${err.message}`
    };
  }
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
