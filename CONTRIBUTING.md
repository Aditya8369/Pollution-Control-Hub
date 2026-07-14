# 🤝 Contributing to Pollution Control Hub

Thank you for your interest in contributing to **Pollution Control Hub**! We appreciate every contribution, whether it's fixing bugs, improving the UI, enhancing documentation, or implementing new features.

Our goal is to maintain a welcoming, collaborative, and high-quality open-source project. Please read this guide before contributing.

---

# 📑 Table of Contents

* Code of Conduct
* Ways to Contribute
* Getting Started
* Development Setup
* Finding an Issue
* Issue Labels
* Branch Naming Convention
* Development Guidelines
* Commit Message Convention
* Pull Request Process
* Review Workflow
* Pull Request Checklist
* Reporting Bugs
* Suggesting Features
* Community & Support

---

# 🌍 Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) when contributing to this project.

We expect all contributors to:
- Be respectful and inclusive.
- Provide constructive feedback.
- Maintain a positive and collaborative environment.
---

# 🚀 Ways to Contribute

You can contribute by:

* 🐞 Fixing bugs
* ✨ Adding new features
* 🎨 Improving UI/UX
* 📱 Enhancing responsiveness
* 📚 Improving documentation
* ⚡ Refactoring code
* ♿ Improving accessibility
* 🧪 Writing or improving tests
* 🔒 Improving performance or security

---

# 🛠 Getting Started

## 1. Fork the Repository

Click the **Fork** button in the upper-right corner of the repository.

---

## 2. Clone Your Fork

```bash
git clone https://github.com/Aditya8369/Pollution-Control-Hub.git
cd pollution-control-hub
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Start the Development Server

```bash
npm run dev
```

The project will be available at:

```text
http://localhost:5173
```

---

# 📌 Finding an Issue

Browse the **Issues** section and look for:

* `good first issue`
* `beginner friendly`
* `help wanted`
* `bug`
* `enhancement`

If you would like to work on an issue:

1. Comment on the issue.
2. Wait until you're assigned (if required).
3. Create a branch.
4. Start working.

Please avoid working on issues already assigned to someone else unless requested by a maintainer.

---

# 🏷 Issue Labels

The repository uses labels to organize work.

| Label               | Meaning                              |
| ------------------- | ------------------------------------ |
| `good first issue`  | Suitable for first-time contributors |
| `beginner friendly` | Easy tasks for newcomers             |
| `bug`               | Something isn't working correctly    |
| `enhancement`       | Improvement to an existing feature   |
| `feature request`   | New functionality                    |
| `documentation`     | Documentation updates                |
| `UI/UX`             | User interface improvements          |
| `performance`       | Optimization tasks                   |
| `accessibility`     | Accessibility improvements           |
| `help wanted`       | Community contributions needed       |
| `high priority`     | Important issue requiring attention  |
| `duplicate`         | Already reported elsewhere           |
| `invalid`           | Not considered a valid issue         |
| `wontfix`           | Will not be addressed                |

---

# 🌿 Branch Naming Convention

Create a separate branch for every contribution.

Use the following naming format:

```text
feature/feature-name
bugfix/issue-name
fix/issue-name
docs/update-readme
refactor/component-name
style/navbar-spacing
test/add-unit-tests
```

Examples:

```text
feature/community-reports

bugfix/mobile-sidebar

docs/contributing-guide

style/dashboard-spacing

refactor/aqi-service
```

Never commit directly to the `main` branch.

---

# 💻 Development Guidelines

Please follow these guidelines:

* Keep components reusable.
* Follow the existing folder structure.
* Write meaningful variable names.
* Avoid duplicate code.
* Remove unused imports.
* Use consistent formatting.
* Keep pull requests focused on a single issue.
* Ensure responsiveness.
* Preserve accessibility.

---

# 📂 Suggested Project Structure

```text
src/
│
├── assets/
├── components/
├── hooks/
├── pages/
├── services/
├── utils/
├── styles/
├── App.jsx
└── main.jsx
```

---

# 📝 Commit Message Convention

Use descriptive commit messages following the Conventional Commits style.

Examples:

```text
feat: add pollution trend chart

fix: resolve mobile navigation overflow

docs: improve installation instructions

style: update dashboard spacing

refactor: simplify AQI calculation logic

test: add unit tests for AQI utilities
```

Avoid messages like:

```text
update

changes

fixed stuff

done

new
```

---

# 🔄 Pull Request Process

1. Sync your fork with the latest changes.

```bash
git checkout main
git pull upstream main
```

2. Create a new branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.

4. Commit your work.

```bash
git commit -m "feat: add pollution heatmap"
```

5. Push your branch.

```bash
git push origin feature/your-feature
```

6. Open a Pull Request.

---

# 📋 Pull Request Template

## Description

Briefly explain your changes.

---

## Related Issue

Closes #IssueNumber

---

## Type of Change

* [ ] Bug Fix
* [ ] New Feature
* [ ] UI Improvement
* [ ] Documentation
* [ ] Refactoring
* [ ] Performance
* [ ] Accessibility

---

## Screenshots

Include screenshots or screen recordings if the UI has changed.

---

## Additional Notes

Provide any additional context if necessary.

---

# 👀 Review Workflow

Once your Pull Request is submitted:

1. Automated checks (if configured) will run.
2. A maintainer will review your changes.
3. You may be asked to make revisions.
4. Push additional commits to the same branch.
5. The Pull Request will be reviewed again.
6. Once approved, it will be merged.

Please be patient during the review process.

---

# ✅ Pull Request Checklist

Before submitting your Pull Request, ensure that:

* [ ] My code builds successfully.
* [ ] I tested my changes.
* [ ] No console errors remain.
* [ ] I followed the existing coding style.
* [ ] I updated documentation if required.
* [ ] My branch is up to date.
* [ ] My Pull Request focuses on a single issue.
* [ ] I have added screenshots for UI changes.
* [ ] I have linked the related issue.

---

# 🐞 Reporting Bugs

Please include:

* Clear title
* Description
* Steps to reproduce
* Expected behavior
* Actual behavior
* Browser
* Operating system
* Screenshots (if applicable)
* Console logs (if relevant)

---

# 💡 Suggesting Features

Feature requests should include:

* Problem statement
* Proposed solution
* Expected outcome
* Mockups (optional)
* Additional context

---

# 📚 Documentation Contributions

Documentation improvements are always welcome.

Examples include:

* Fixing grammar
* Updating setup instructions
* Adding examples
* Improving explanations
* Adding screenshots
* Improving code comments

---

# ❤️ Thank You

Every contribution—big or small—helps improve **Pollution Control Hub** and supports our mission of making environmental information more accessible and actionable.

We appreciate your time, effort, and collaboration.

Happy Contributing! 🚀