# ext-pack Development Skills

This directory contains project-specific skills for ext-pack development to ensure all developers and AI agents follow consistent workflows and coding standards.

## Installation

Install the ext-pack-dev skill globally to use it across all sessions:

```bash
npx skills add ./ext-pack-dev.skill -g -y
```

Or use the skill from this directory (project-level):

```bash
npx skills add ./.claude/skills/ext-pack-dev -y
```

## What the Skill Provides

The `ext-pack-dev` skill enforces:

- **Architecture patterns**: ESM modules, layer separation (command → UI → core)
- **Development workflows**: Test → Commit → Push pattern
- **Coding standards**: Use dedicated tools, no backwards-compatibility hacks
- **Testing practices**: Always test changes automatically
- **Git conventions**: Commit message style and branching strategy

## When to Use

The skill automatically triggers when working on ext-pack codebase for:
- Making code changes (bug fixes, features, refactors)
- Understanding the architecture and patterns
- Testing changes
- Committing and pushing code

## Updating the Skill

After making changes to `.claude/skills/ext-pack-dev/SKILL.md`:

1. Package the updated skill:
   ```bash
   python3 ~/.claude/skills/skill-creator/scripts/package_skill.py .claude/skills/ext-pack-dev
   ```

2. Commit the changes:
   ```bash
   git add .claude/skills/ext-pack-dev ext-pack-dev.skill
   git commit -m "Update ext-pack-dev skill"
   git push
   ```

3. Reinstall (if using global installation):
   ```bash
   npx skills add ./ext-pack-dev.skill -g -y --force
   ```
