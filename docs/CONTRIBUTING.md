# Contributing to Agents of Empire

Thank you for contributing! This guide will help you set up the project correctly and avoid common pitfalls.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Common Pitfalls](#common-pitfalls)
- [Package Management](#package-management)
- [Working with Submodules](#working-with-submodules)

## Prerequisites

### Required Tools

1. **pnpm** (v8.0.0 or higher)
   ```bash
   npm install -g pnpm
   ```

2. **Node.js** (v20 or higher)
   ```bash
   node --version
   ```

3. **Git** (with submodule support)
   ```bash
   git --version
   ```

## Project Structure

This is a **pnpm workspace monorepo** with the following structure:

```
agents-of-empire/
├── pnpm-workspace.yaml      # Workspace configuration
├── .npmrc                   # pnpm settings & npm enforcement
├── package.json             # Root package
├── node_modules/            # Shared dependencies (managed by pnpm)
├── deepagentsjs/            # Git submodule
│   ├── pnpm-workspace.yaml  # Submodule workspace config
│   ├── libs/                # DeepAgents libraries
│   └── examples/            # DeepAgents examples
└── app/                     # Next.js application code
```

### Why pnpm Workspaces?

- **Single `node_modules`**: All dependencies are hoisted to the root, preventing duplicate installations
- **No nested Git repos**: The submodule is properly integrated into the workspace
- **Faster installs**: pnpm uses a content-addressable store and hard links
- **Disk space efficiency**: Shared dependencies across projects

## Setup Instructions

### Initial Clone

```bash
# Clone with submodules
git clone --recurse-submodules <repository-url>
cd agents-of-empire

# Install all dependencies
pnpm install
```

### If Already Cloned Without Submodules

```bash
# Initialize submodules
git submodule update --init --recursive

# Install dependencies
pnpm install
```

## Common Pitfalls

### ❌ DO NOT Use npm or yarn

**Why?** This project uses pnpm workspaces. Using npm or yarn will:
- Create `package-lock.json` or `yarn.lock` (which are gitignored)
- Install dependencies incorrectly
- Create duplicate `node_modules` directories
- Break the workspace structure

**Solution:** Always use `pnpm` commands:
```bash
# ✅ Correct
pnpm install
pnpm add <package>
pnpm run dev

# ❌ Wrong
npm install
yarn add <package>
npm run dev
```

### ❌ DO NOT Create Nested Git Repositories

**Why?** The `deepagentsjs` directory is a **git submodule**, not a separate repository.

**Common mistake:**
```bash
# ❌ Don't do this inside deepagentsjs/
cd deepagentsjs
git init  # This creates a nested git repo!
```

**Solution:** Work from the root directory:
```bash
# ✅ Update submodule from root
git submodule update --remote deepagentsjs

# ✅ Commit changes to submodule
cd deepagentsjs
git checkout -b my-feature
git commit -m "feat: add new feature"
git push origin my-feature
cd ..
git add deepagentsjs
git commit -m "chore: update deepagentsjs submodule"
```

### ❌ DO NOT Install Dependencies in Submodules Separately

**Why?** The workspace handles all dependencies from the root.

**Common mistake:**
```bash
# ❌ Don't do this
cd deepagentsjs
pnpm install
```

**Solution:** Always install from root:
```bash
# ✅ Install all workspace dependencies
pnpm install

# ✅ Add dependency to specific workspace package
pnpm add <package> --filter deepagentsjs
```

### ❌ DO NOT Manually Create `node_modules` Directories

**Why?** pnpm manages the `node_modules` structure automatically.

**Solution:** If you have issues:
```bash
# Clean and reinstall
rm -rf node_modules
pnpm install
```

## Package Management

### Installing Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Add dependency to root package
pnpm add <package>

# Add dev dependency to root
pnpm add -D <package>

# Add dependency to a specific workspace package
pnpm add <package> --filter agents-of-empire
pnpm add <package> --filter deepagentsjs
```

### Removing Dependencies

```bash
# Remove from root
pnpm remove <package>

# Remove from specific workspace
pnpm remove <package> --filter <workspace-name>
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update <package>

# Update dependencies in specific workspace
pnpm update --filter <workspace-name>
```

### Running Scripts

```bash
# Run script in root package
pnpm dev
pnpm build
pnpm lint

# Run script in specific workspace
pnpm --filter deepagentsjs build

# Run script in all workspaces
pnpm -r build  # recursive
```

## Working with Submodules

### Updating the Submodule

```bash
# Update to latest commit on tracked branch
git submodule update --remote deepagentsjs

# Update to specific commit
cd deepagentsjs
git checkout <commit-hash>
cd ..
git add deepagentsjs
git commit -m "chore: update deepagentsjs to <commit-hash>"
```

### Making Changes to the Submodule

1. Create a branch in the submodule:
   ```bash
   cd deepagentsjs
   git checkout -b feature/my-changes
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: my changes"
   git push origin feature/my-changes
   ```

3. Update the parent repository:
   ```bash
   cd ..
   git add deepagentsjs
   git commit -m "chore: update deepagentsjs submodule"
   git push
   ```

## Troubleshooting

### Issue: "Command not found: pnpm"

**Solution:** Install pnpm globally:
```bash
npm install -g pnpm
```

### Issue: "ENOENT: no such file or directory" when running commands

**Solution:** Install dependencies:
```bash
pnpm install
```

### Issue: Duplicate dependencies or large `node_modules`

**Solution:** Clean and reinstall:
```bash
rm -rf node_modules
pnpm install
```

### Issue: Submodule is empty or not initialized

**Solution:** Initialize submodules:
```bash
git submodule update --init --recursive
```

### Issue: "This project uses pnpm but npm/yarn was detected"

**Solution:** The `.npmrc` file enforces pnpm usage. Delete any `package-lock.json` or `yarn.lock` files and use pnpm:
```bash
rm -f package-lock.json yarn.lock
pnpm install
```

## Best Practices

1. **Always use pnpm** - Never use npm or yarn in this project
2. **Install from root** - Don't run `pnpm install` in subdirectories
3. **Commit lock file** - Always commit `pnpm-lock.yaml` changes
4. **Update submodules** - Keep `deepagentsjs` submodule up to date
5. **Clean builds** - Run `pnpm install` after pulling changes
6. **Use workspace commands** - Use `--filter` to target specific packages

## Need Help?

If you encounter issues not covered here:

1. Check the [pnpm documentation](https://pnpm.io/)
2. Review existing issues in the repository
3. Ask in the project's communication channels
4. Create a new issue with details about your problem

---

Happy coding! 🚀
