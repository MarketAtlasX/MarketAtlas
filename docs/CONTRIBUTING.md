# Contributing to MarketAtlas

Thank you for contributing to MarketAtlas!

## Development Workflow
1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. Run test suites locally before pushing:
   ```bash
   npm --prefix frontend test
   pytest backend/tests
   ```
3. Commit your changes using Conventional Commits format:
   ```
   feat(scope): concise description
   fix(scope): fix description
   test(scope): add tests
   docs(scope): update docs
   ```
4. Push to your branch and open a Pull Request against `main`.
