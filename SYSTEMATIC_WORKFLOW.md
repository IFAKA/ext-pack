# Systematic Testing Workflow

## Overview

ext-pack now enforces a **systematic testing workflow** that ensures NO code is committed without complete testing. This approach eliminates gaps, prevents untested code from reaching users, and maintains high quality standards.

## 🎯 Core Principle

**Zero Gaps, Zero Exceptions, Zero Untested Code**

Every code change MUST pass the complete testing checklist before it can be committed.

## 🛠️ Components

### 1. Git Hooks (Automatic Enforcement)

**Pre-Commit Hook** (`.git/hooks/pre-commit`)
- Blocks commits without `.testing-verified` file
- Checks if testing was done recently (< 10 minutes)
- Automatically removes verification file after commit (forces re-testing for next commit)
- No way to bypass without intentionally disabling the hook

**Pre-Push Hook** (`.git/hooks/pre-push`)
- Final verification before pushing to remote
- Reminds about npm publish requirement
- Interactive confirmation in terminal, auto-passes in non-interactive mode (CI/automation)

### 2. Testing Checklist Skill

**Location:** `.claude/skills/testing-checklist/SKILL.md`

Comprehensive end-to-end testing guide covering:
- ✅ Test 1: Create Flow (extension selection, AI generation, pack creation, publish option)
- ✅ Test 2: Install Flow (registry browse, download, browser detection, installation, relaunch)
- ✅ Test 3: List Flow (display packs, management menu, JSON output)
- ✅ Test 4: Publish Flow (GitHub auth, AI tags, fork/branch, release, PR, auto-merge)
- ✅ Test 5: Error Handling (invalid files, network errors, missing dependencies, edge cases)

Each test has detailed checkboxes ensuring every aspect is verified.

### 3. Test Command

**Usage:** `npm test` or `npm run test`

Displays:
- Testing checklist overview
- Required tests (1-5)
- How to mark testing complete
- NO EXCEPTIONS reminder

Visual output using boxen for clear communication.

### 4. Updated ext-pack-dev Skill

**Location:** `.claude/skills/ext-pack-dev/SKILL.md`

Updated "Workflow 1: Making Code Changes" to enforce systematic testing:
1. Make changes
2. Install globally (`npm link`)
3. Run FULL testing checklist
4. Verify all tests pass (if ANY fails, fix and re-test from Test 1)
5. Mark complete (`touch .testing-verified`)
6. Commit
7. Push
8. Remind user to publish to npm

## 📋 Workflow (Step by Step)

### As a Developer/AI Agent

```bash
# 1. Make code changes
# (edit files)

# 2. Install changes globally
npm link

# 3. View testing checklist
npm test

# 4. Follow systematic testing guide
# Open: .claude/skills/testing-checklist/SKILL.md
# Complete ALL tests, check ALL boxes

# 5. Mark testing complete (required for commit)
touch .testing-verified

# 6. Commit
git add .
git commit -m "Your commit message"
# Pre-commit hook verifies .testing-verified exists

# 7. Push
git push
# Pre-push hook confirms testing and reminds about npm publish

# 8. Publish to npm (CRITICAL!)
npm publish --otp=YOUR_CODE
```

### Quick Reference

| Command | Purpose |
|---------|---------|
| `npm link` | Install changes globally for testing |
| `npm test` | Show testing checklist overview |
| `touch .testing-verified` | Mark testing complete (enables commit) |
| `git commit` | Commit (requires testing verification) |
| `git push` | Push to remote (confirms testing) |
| `npm publish --otp=CODE` | Publish to npm (REQUIRED!) |

## 🚨 Failure Protocol

**If ANY test fails:**

1. **DO NOT commit** - Fix the bug first
2. **DO NOT skip** - All tests are mandatory
3. **DO NOT make exceptions** - This is the systematic approach
4. **DEBUG** - Use console.log, check error messages, read code
5. **FIX** - Make necessary code changes
6. **RE-TEST** - Start from Test 1 again (full regression test)
7. **VERIFY** - Only commit when ALL tests pass

## 📦 Files Created/Modified

### New Files
- `.git/hooks/pre-commit` - Enforces testing verification
- `.git/hooks/pre-push` - Final confirmation and npm reminder
- `.claude/skills/testing-checklist/SKILL.md` - Systematic testing guide
- `bin/test-checklist.js` - Test command implementation
- `testing-checklist.skill` - Packaged skill file
- `SYSTEMATIC_WORKFLOW.md` - This document

### Modified Files
- `.claude/skills/ext-pack-dev/SKILL.md` - Updated workflows to enforce testing
- `ext-pack-dev.skill` - Repackaged with updates
- `package.json` - Added `"test"` script
- `README.md` - Added systematic testing workflow section
- `.gitignore` - Added `.testing-verified`

## 🎓 Benefits

1. **Quality Assurance** - Every change is tested end-to-end
2. **No Regressions** - Full testing checklist catches side effects
3. **Documentation** - Testing checklist serves as comprehensive docs
4. **Consistency** - All developers/agents follow same workflow
5. **Confidence** - Know that pushed code actually works
6. **User Protection** - Users never receive untested code

## 💡 Philosophy

Traditional development often has gaps:
- "I tested it locally" (but not all flows)
- "It works on my machine" (but didn't test edge cases)
- "I'll test it later" (forgets to test)
- "This is a small change" (breaks something unexpected)

**Systematic approach eliminates these gaps:**
- ✅ Mandatory checklist prevents skipping tests
- ✅ Git hooks enforce verification
- ✅ Every test is documented and must be checked
- ✅ No exceptions = No gaps

## 🔄 Continuous Improvement

This workflow itself follows the systematic approach:
- Created git hooks ✅
- Created testing checklist ✅
- Created test command ✅
- Updated skills ✅
- Tested `npm test` command ✅
- Tested pre-commit hook (blocked commit correctly) ✅
- Tested pre-push hook ✅
- Marked testing complete ✅
- Committed with verification ✅
- Pushed to remote ✅

**Next step:** User should run `npm publish --otp=CODE`

---

**Made with ❤️ for code quality and systematic development**
