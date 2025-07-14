# Yelm Coding Agent Git Strategy

## Branch Structure

### Protected Branches

#### `main` - Production Branch
- **Purpose**: Production-ready code deployed to users
- **Protection**: Fully protected, no direct pushes
- **Merge Requirements**: 
  - PR from `develop` only
  - All CI checks must pass (including performance tests)
  - Manual approval required
  - Claude Code automated review required
- **CI Pipeline**: Full performance testing, security scans, deployment preparation

#### `develop` - Integration Branch  
- **Purpose**: Working development branch for team integration
- **Protection**: Protected, no direct pushes
- **Merge Requirements**:
  - PR from feature branches only
  - All CI checks must pass (lint, test, build)
  - Claude Code automated review required
  - At least one team member approval
- **CI Pipeline**: Lint, test, build, basic regression testing

### Working Branches

#### Feature Branches: `feature/[task-name]`
- **Purpose**: Individual feature development
- **Naming**: `feature/task-1-gemini-cli-analysis`, `feature/context7-integration`
- **Lifecycle**: Created from `develop`, merged back to `develop`
- **Requirements**: Must be up-to-date with `develop` before merge

#### Hotfix Branches: `hotfix/[issue-name]`
- **Purpose**: Critical production fixes
- **Naming**: `hotfix/critical-bug-fix`
- **Lifecycle**: Created from `main`, merged to both `main` and `develop`
- **Requirements**: Expedited review process for critical issues

#### Release Branches: `release/[version]`
- **Purpose**: Release preparation and stabilization
- **Naming**: `release/v1.0.0`
- **Lifecycle**: Created from `develop`, merged to `main` and back to `develop`
- **Requirements**: Feature freeze, bug fixes only

## Workflow Process

### Feature Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/task-name
   ```

2. **Development Process**
   - Make commits with clear, descriptive messages
   - Run local tests before committing
   - Use agent hooks for code review and testing
   - Keep branch up-to-date with develop

3. **Pre-Merge Preparation**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/task-name
   git rebase develop  # or merge develop
   ```

4. **Create Pull Request**
   - Target: `develop` branch
   - Include: Clear description, testing notes, breaking changes
   - Assign: Claude Code automated reviewer
   - Labels: Add appropriate labels (feature, bugfix, etc.)

5. **CI/CD Pipeline (Develop)**
   - ESLint and Prettier checks
   - TypeScript compilation
   - Unit and integration tests
   - Build verification
   - Basic performance regression tests (future)

6. **Review Process**
   - Claude Code automated review
   - Team member review and approval
   - Address feedback and update PR
   - Final CI check before merge

7. **Merge to Develop**
   - Squash and merge (clean history)
   - Delete feature branch
   - Update local develop branch

### Release Workflow

1. **Release Preparation**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.0.0
   ```

2. **Release Stabilization**
   - Version bumping
   - Documentation updates
   - Bug fixes only (no new features)
   - Final testing and validation

3. **Release to Main**
   ```bash
   # Create PR: release/v1.0.0 → main
   # Full CI pipeline including performance tests
   # Manual approval required
   ```

4. **Post-Release**
   ```bash
   # Merge main back to develop
   git checkout develop
   git merge main
   git push origin develop
   
   # Tag release
   git tag v1.0.0
   git push origin v1.0.0
   ```

## CI/CD Pipeline Configuration

### Develop Branch CI
```yaml
name: Develop CI
on:
  pull_request:
    branches: [develop]
  push:
    branches: [develop]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:ci
      - run: npm run build
      # Future: Basic performance regression tests
```

### Main Branch CI
```yaml
name: Main CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  full-pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:ci
      - run: npm run test:performance
      - run: npm run build
      - run: npm run security-scan
      # Deployment preparation steps
```

## Deployment Strategy

### Proposed: Cut and Test Strategy

#### Option 1: Automated Release Pipeline
```
main → CI/CD → Staging → Automated Tests → Production
```

**Pros**: Fast, automated, consistent
**Cons**: Requires robust testing, potential for automated failures

#### Option 2: Manual Release Gates
```
main → CI/CD → Staging → Manual Validation → Production Release
```

**Pros**: Human oversight, safer for critical releases
**Cons**: Slower, requires manual intervention

#### Option 3: Hybrid Approach (Recommended)
```
main → CI/CD → Staging → Automated Tests + Manual Gate → Production
```

**Process**:
1. **Automated Staging**: Every main branch update deploys to staging
2. **Automated Testing**: Full test suite runs against staging
3. **Manual Gate**: Human approval required for production release
4. **Production Deploy**: Automated deployment with rollback capability

### Release Versioning

**Semantic Versioning**: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

**Version Tags**:
- `v1.0.0` - Major release
- `v1.1.0` - Minor feature release  
- `v1.1.1` - Patch release
- `v1.0.0-beta.1` - Pre-release versions

## Commit Message Standards

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(context): add Context7 CLI integration

Implement robust Context7 wrapper with caching and fallback handling.
Includes comprehensive error handling and performance optimization.

Closes #123
```

## Branch Protection Rules

### Main Branch
- Require pull request reviews (1 required)
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to administrators only
- Require Claude Code review
- Include administrators in restrictions

### Develop Branch  
- Require pull request reviews (1 required)
- Require status checks to pass
- Require branches to be up to date
- Allow force pushes for administrators only
- Require Claude Code review

## Emergency Procedures

### Hotfix Process
1. **Create hotfix branch from main**
2. **Implement critical fix**
3. **Expedited review process**
4. **Deploy to staging for validation**
5. **Merge to main with expedited approval**
6. **Immediate production deployment**
7. **Merge back to develop**

### Rollback Process
1. **Identify issue in production**
2. **Revert to previous stable version**
3. **Create hotfix branch for permanent fix**
4. **Follow standard hotfix process**

## Tools and Integrations

### Required Tools
- **Git**: Version control
- **GitHub**: Repository hosting and CI/CD
- **Claude Code**: Automated code review
- **ESLint/Prettier**: Code quality and formatting
- **Jest/Vitest**: Testing framework
- **GitHub Actions**: CI/CD pipeline

### Recommended Tools
- **Conventional Commits**: Commit message standardization
- **Husky**: Git hooks for local validation
- **lint-staged**: Run linters on staged files
- **Release Please**: Automated release management

## Team Responsibilities

### All Developers
- Follow git workflow and commit standards
- Run local tests before pushing
- Keep feature branches up-to-date
- Write clear PR descriptions
- Respond to review feedback promptly

### Lead Developer (You)
- Review and approve PRs to main
- Manage release process
- Configure CI/CD pipelines
- Handle emergency procedures
- Maintain git strategy documentation

### Claude Code Integration
- Automated code review on all PRs
- Standards compliance checking
- Security vulnerability detection
- Performance impact analysis

This git strategy provides a robust foundation for team collaboration while maintaining code quality and deployment safety. The strategy can be refined as the team grows and requirements evolve.