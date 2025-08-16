# Contributing to StripeMeter 🤝

Thank you for your interest in contributing to StripeMeter! We're excited to have you as part of our community. This guide will help you get started.

## 🌟 Ways to Contribute

We welcome all kinds of contributions:

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new features or improvements
- 📝 **Documentation**: Improve our docs, tutorials, or examples
- 🧪 **Testing**: Add tests or improve test coverage
- 🎨 **Design**: Improve UI/UX of our dashboards and widgets
- 🔧 **Code**: Fix bugs or implement new features
- 💬 **Community**: Help others in discussions and issues

## 🚀 Quick Start for Contributors

### 1. Set Up Your Development Environment

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/stripemeter.git
cd stripemeter

# Add the original repository as upstream
git remote add upstream https://github.com/geminimir/stripemeter.git

# Install dependencies
pnpm install

# Start development environment
./scripts/setup.sh
```

### 2. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-amazing-feature

# Or for bug fixes
git checkout -b fix/issue-123
```

### 3. Make Your Changes

- Write clear, concise commit messages
- Follow our coding standards (enforced by ESLint/Prettier)
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run all tests
pnpm test

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Test specific packages
pnpm --filter '@stripemeter/core' test
```

### 5. Submit Your Pull Request

```bash
# Push your branch
git push origin feature/your-amazing-feature

# Create a pull request on GitHub
# Use our PR template and provide clear description
```

## 📋 Pull Request Guidelines

### Before Submitting

- ✅ Tests pass locally
- ✅ Code follows our style guide (auto-formatted by Prettier)
- ✅ Documentation is updated if needed
- ✅ Commit messages are clear and descriptive

### PR Description Template

```markdown
## What does this PR do?
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
- [ ] Added new tests
- [ ] All existing tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Breaking Changes
List any breaking changes and migration steps
```

## 🏗️ Development Guidelines

### Code Style

We use automated formatting and linting:

- **Prettier** for code formatting
- **ESLint** for code quality
- **TypeScript** for type safety

Run `pnpm lint:fix` to automatically fix style issues.

### Commit Messages

We follow [Conventional Commits](https://conventionalcommits.org/):

```bash
# Good examples
feat(api): add usage projection endpoint
fix(worker): handle late events correctly
docs(readme): improve quick start guide
test(core): add idempotency key tests

# Format
type(scope): description

# Types: feat, fix, docs, test, refactor, chore
```

### Testing

- **Unit tests**: Test individual functions and components
- **Integration tests**: Test API endpoints and database interactions
- **E2E tests**: Test complete user workflows

Add tests for:
- New features
- Bug fixes
- Edge cases
- Error conditions

### Documentation

Update documentation when you:
- Add new features
- Change APIs
- Fix bugs that were caused by unclear docs
- Add new configuration options

## 🐛 Reporting Bugs

Found a bug? Here's how to report it effectively:

### Before Reporting

1. Check if the issue already exists in [GitHub Issues](https://github.com/stripemeter/stripemeter/issues)
2. Make sure you're using the latest version
3. Try to reproduce the issue with minimal steps

### Bug Report Template

```markdown
## Bug Description
Clear description of what went wrong

## Steps to Reproduce
1. Step one
2. Step two
3. See error

## Expected Behavior
What should have happened

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., macOS 12.0]
- Node.js version: [e.g., 20.10.0]
- StripeMeter version: [e.g., 1.0.0]
- Browser (if applicable): [e.g., Chrome 120]

## Additional Context
- Error messages
- Screenshots
- Logs
- Configuration details
```

## 💡 Suggesting Features

We love new ideas! Here's how to suggest features:

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Problem It Solves
What problem does this feature address?

## Proposed Solution
How would you like this feature to work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
- Use cases
- Examples from other tools
- Mockups or diagrams
```

## 🌍 Community Guidelines

### Code of Conduct

We're committed to providing a welcoming and inclusive environment. Please:

- ✅ Be respectful and inclusive
- ✅ Welcome newcomers and help them learn
- ✅ Focus on constructive feedback
- ✅ Assume good intentions

- ❌ No harassment, discrimination, or offensive behavior
- ❌ No spam or self-promotion
- ❌ No sharing of private information

### Getting Help

Need help? Here are the best places to ask:

- 💬 **[Discord Community](https://discord.gg/stripemeter)** - Real-time chat
- 🐙 **[GitHub Discussions](https://github.com/stripemeter/stripemeter/discussions)** - Longer-form discussions
- 📧 **[Email Support](mailto:support@stripemeter.io)** - Direct support

### Recognition

We appreciate our contributors! You'll get:

- 🎉 Listed in our [contributors page](https://github.com/stripemeter/stripemeter/graphs/contributors)
- 🏅 Special role in our Discord community
- 📧 Early access to new features
- 🎁 StripeMeter swag (for significant contributions)

## 📚 Resources

### Learning Resources

- [Architecture Documentation](./docs/architecture.md)
- [API Reference](https://docs.stripemeter.io/api)
- [Development Setup](./docs/development.md)
- [Testing Guide](./docs/testing.md)

### Tools We Use

- **Language**: TypeScript/JavaScript
- **Framework**: Fastify (API), React (UI)
- **Database**: PostgreSQL + Redis
- **Testing**: Vitest
- **Deployment**: Docker
- **CI/CD**: GitHub Actions

## 🎯 Good First Issues

New to the project? Look for issues labeled [`good first issue`](https://github.com/stripemeter/stripemeter/labels/good%20first%20issue). These are:

- Well-defined and scoped
- Don't require deep knowledge of the codebase
- Have clear acceptance criteria
- Include helpful context and guidance

## 🚀 Advanced Contributing

### Release Process

1. Features are merged to `main`
2. Releases are created from `main`
3. We follow [Semantic Versioning](https://semver.org/)
4. Changelogs are automatically generated

### Becoming a Maintainer

Interested in becoming a maintainer? We look for contributors who:

- Consistently contribute high-quality code
- Help others in the community
- Understand the project architecture
- Align with our project values

Reach out to current maintainers if you're interested!

## 🙏 Thank You

Every contribution, no matter how small, makes StripeMeter better. Thank you for being part of our community and helping build the future of usage-based billing!

---

**Questions?** Don't hesitate to ask in our [Discord](https://discord.gg/stripemeter) or [GitHub Discussions](https://github.com/stripemeter/stripemeter/discussions).
