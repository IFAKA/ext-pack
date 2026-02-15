---
name: testing-checklist
description: Systematic testing checklist for ext-pack that MUST be completed before ANY commit. Enforces end-to-end testing of all user flows with no exceptions. Use BEFORE committing code changes.
---

# ext-pack Testing Checklist

## 🚨 CRITICAL: Mandatory Testing Protocol

**RULE: NO CODE IS COMMITTED WITHOUT COMPLETING THIS CHECKLIST**

This is NOT optional. This is NOT negotiable. Every code change MUST pass all tests.

## Pre-Testing Setup

Before running tests, ensure:

```bash
# 1. Install changes globally
npm link

# 2. Verify installation
which ext-pack  # Should show: /usr/local/bin/ext-pack

# 3. Check version
ext-pack --version  # Should match package.json
```

## Testing Protocol

### ✅ Test 1: Create Flow (Full End-to-End)

**Steps:**
1. **Launch create command**
   ```bash
   ext-pack create
   ```

2. **Extension Selection**
   - [ ] Checkbox list appears with all discovered extensions
   - [ ] Extensions are unchecked by default
   - [ ] Can select/deselect extensions with space bar
   - [ ] Shows extension names and paths
   - [ ] Selected count updates correctly

3. **AI Description Generation** (if Ollama running)
   - [ ] Detects Ollama automatically
   - [ ] Offers to generate description
   - [ ] Uses IPv4 address (127.0.0.1) for connection
   - [ ] Generates relevant description based on extensions
   - [ ] Shows spinner during generation
   - [ ] Allows manual edit/override

4. **Metadata Input**
   - [ ] Prompts for pack name (required)
   - [ ] Prompts for description (defaults to AI-generated)
   - [ ] Prompts for author name (defaults to system user)
   - [ ] Prompts for version (defaults to 1.0.0)
   - [ ] All fields accept input correctly

5. **Pack Creation**
   - [ ] Creates .extpack file in ~/.ext-pack/packs/
   - [ ] Shows spinner during creation
   - [ ] Shows success message with file path
   - [ ] File is valid JSON
   - [ ] Extensions are gzip-compressed and base64-encoded
   - [ ] Pack size is reasonable (check compression worked)

6. **Publish Option** (optional but test the flow)
   - [ ] Asks if user wants to publish
   - [ ] If yes, launches publish wizard
   - [ ] If no, exits cleanly

**STOP: Do NOT proceed to Test 2 until Test 1 passes completely**

---

### ✅ Test 2: Install Flow (Full End-to-End)

**Steps:**
1. **Launch install command**
   ```bash
   ext-pack install
   ```

2. **Registry Browser**
   - [ ] Fetches registry from GitHub
   - [ ] Shows list of available packs
   - [ ] Displays pack names and descriptions
   - [ ] Shows download counts and stars
   - [ ] Allows navigation with arrow keys
   - [ ] Search/filter works (if implemented)

3. **Pack Selection**
   - [ ] Can select a pack from the list
   - [ ] Shows pack details (name, description, extensions)
   - [ ] Asks for confirmation

4. **Download Process**
   - [ ] Downloads .extpack file from GitHub release
   - [ ] Shows progress bar/spinner
   - [ ] Saves to ~/.ext-pack/downloads/
   - [ ] Handles network errors gracefully

5. **Browser Detection**
   - [ ] Auto-detects installed browsers (Brave, Chrome, Edge, Chromium)
   - [ ] Shows list if multiple browsers found
   - [ ] Allows manual selection
   - [ ] Uses user's preferred browser if set

6. **Browser Shutdown**
   - [ ] Warns user that browser will close
   - [ ] Asks for confirmation
   - [ ] Kills browser process cleanly
   - [ ] Handles "no matching processes" error gracefully
   - [ ] Doesn't crash if browser not running

7. **Extension Installation**
   - [ ] Extracts extensions from .extpack file
   - [ ] Decompresses gzipped files correctly
   - [ ] Restores directory structure
   - [ ] Saves to ~/.ext-pack/packs/PACK_NAME/
   - [ ] Validates manifest.json in each extension

8. **Browser Relaunch**
   - [ ] Relaunches browser with --load-extension flags
   - [ ] All extensions loaded successfully
   - [ ] Browser shows extensions in toolbar/menu
   - [ ] Extensions are functional (not just loaded)
   - [ ] No console errors

9. **Installation Registry**
   - [ ] Updates ~/.ext-pack/installed.json
   - [ ] Records pack name, version, timestamp
   - [ ] Records extension paths

**STOP: Do NOT proceed to Test 3 until Test 2 passes completely**

---

### ✅ Test 3: List Flow (Full End-to-End)

**Steps:**
1. **Launch list command**
   ```bash
   ext-pack list
   ```

2. **Display Installed Packs**
   - [ ] Shows all installed packs
   - [ ] Displays pack name, version, install date
   - [ ] Shows number of extensions in each pack
   - [ ] Formatting is clean and readable

3. **Pack Management Menu** (if implemented)
   - [ ] Allows viewing pack details
   - [ ] Allows updating pack (if new version available)
   - [ ] Allows removing pack
   - [ ] Exits cleanly

4. **JSON Output** (if --json flag exists)
   ```bash
   ext-pack list --json
   ```
   - [ ] Outputs valid JSON
   - [ ] Contains all pack data
   - [ ] Machine-readable format

**STOP: Do NOT proceed to Test 4 until Test 3 passes completely**

---

### ✅ Test 4: Publish Flow (Full End-to-End)

**Steps:**
1. **Launch publish command**
   ```bash
   ext-pack publish ~/.ext-pack/packs/test-pack.extpack
   ```

2. **GitHub Authentication**
   - [ ] Checks for `gh` CLI authentication
   - [ ] Or checks for GITHUB_TOKEN env var
   - [ ] Shows clear error if not authenticated
   - [ ] Doesn't proceed without auth

3. **AI Tag Suggestions** (if Ollama running)
   - [ ] Offers to generate tags
   - [ ] Suggests relevant tags based on pack content
   - [ ] Allows manual tag input
   - [ ] Allows editing suggested tags
   - [ ] Validates tag format (lowercase, no spaces)

4. **Registry Fork/Branch**
   - [ ] Checks if IFAKA/ext-pack-registry is forked
   - [ ] Forks repo if not already forked
   - [ ] Creates new branch with unique name
   - [ ] Handles existing branches gracefully

5. **GitHub Release**
   - [ ] Creates release in user's fork
   - [ ] Uploads .extpack file as release asset
   - [ ] Sets correct tag and version
   - [ ] Shows release URL

6. **Registry PR**
   - [ ] Updates registry.json with new pack entry
   - [ ] Commits change to branch
   - [ ] Creates pull request to IFAKA/ext-pack-registry
   - [ ] PR title and body are clear
   - [ ] Shows PR URL

7. **Auto-Merge Validation** (wait ~2 minutes)
   - [ ] GitHub Actions runs validation
   - [ ] PR is auto-merged if valid
   - [ ] Pack appears in registry

**STOP: Do NOT proceed to Test 5 until Test 4 passes completely**

---

### ✅ Test 5: Error Handling & Edge Cases

**Test each scenario:**

1. **Invalid .extpack file**
   ```bash
   echo "invalid json" > test.extpack
   ext-pack install test.extpack
   ```
   - [ ] Shows clear error message
   - [ ] Doesn't crash
   - [ ] Exits with non-zero code

2. **Missing dependencies**
   ```bash
   ext-pack publish test.extpack  # without gh auth
   ```
   - [ ] Shows authentication error
   - [ ] Suggests how to authenticate
   - [ ] Doesn't proceed

3. **Network errors**
   - [ ] Disconnect network
   - [ ] Run `ext-pack install`
   - [ ] Should show network error
   - [ ] Should fail gracefully

4. **Ollama not running**
   ```bash
   # Stop Ollama
   ext-pack create
   ```
   - [ ] Detects Ollama is not available
   - [ ] Skips AI features gracefully
   - [ ] Continues with manual input
   - [ ] No crashes or hangs

5. **Browser already running**
   - [ ] Open browser manually
   - [ ] Run `ext-pack install`
   - [ ] Should detect and kill process
   - [ ] Should handle gracefully

6. **No extensions found**
   ```bash
   mkdir /tmp/empty
   ext-pack create -d /tmp/empty
   ```
   - [ ] Shows "no extensions found" message
   - [ ] Exits gracefully
   - [ ] Doesn't create empty pack

**STOP: Do NOT proceed until ALL error cases are handled**

---

## Post-Testing Verification

After completing ALL tests above:

```bash
# Create verification file
touch .testing-verified

# Now you can commit
git add .
git commit -m "Your commit message"
```

The pre-commit hook will verify `.testing-verified` exists and is recent (< 10 minutes old).

---

## 🚨 Failure Protocol

**If ANY test fails:**

1. **DO NOT COMMIT** - Fix the bug first
2. **DO NOT SKIP** - All tests are mandatory
3. **DO NOT MAKE EXCEPTIONS** - This is the systematic approach
4. **DEBUG** - Use `console.log`, check error messages
5. **FIX** - Make the necessary code changes
6. **RE-TEST** - Start from Test 1 again (full regression test)
7. **VERIFY** - Only commit when ALL tests pass

---

## Testing Automation Script

For convenience, create this script:

```bash
# Save as bin/test-checklist.js
#!/usr/bin/env node

console.log('🧪 ext-pack Testing Checklist\n');
console.log('Follow the systematic testing guide:');
console.log('File: .claude/skills/testing-checklist/SKILL.md\n');
console.log('After completing ALL tests, run:');
console.log('  touch .testing-verified\n');
console.log('This enables committing your changes.\n');
```

Add to package.json:
```json
{
  "scripts": {
    "test-checklist": "node bin/test-checklist.js"
  }
}
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm link` | Install changes globally |
| `ext-pack create` | Test create flow |
| `ext-pack install` | Test install flow |
| `ext-pack list` | Test list flow |
| `ext-pack publish` | Test publish flow |
| `touch .testing-verified` | Mark testing complete |
| `git commit` | Commit (requires testing verified) |

---

**REMEMBER: Systematic approach = Zero gaps, zero exceptions, zero untested code**
