# Security Policy

## Supported Versions

The project actively supports the latest development branch and the most recent stable release.

| Version | Supported |
| ------- | :-------: |
| `main` | ✅ |
| Latest release | ✅ |
| Older releases | ❌ |

Only supported versions receive security updates and bug fixes.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not create a public GitHub issue.**

Instead, report the issue privately to the project maintainers using one of the following methods:

- GitHub Security Advisories (if enabled)
- Private communication with the repository maintainers

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Expected and actual behavior
- Potential impact
- A proof of concept (if available)
- Project version or commit hash
- Browser, operating system, and environment details

Maintainers will acknowledge valid reports as quickly as possible and keep reporters informed throughout the investigation.

---

## Response and Patch Timeline

The project aims to follow these response targets:

| Stage | Target Time |
| ------- | ----------- |
| Acknowledge report | Within 3 business days |
| Initial assessment | Within 7 business days |
| Status updates | During investigation |
| Security patch | As soon as a validated fix is available |

The exact timeline depends on the severity and complexity of the issue.

---

## Dependency Security

This project depends on several third-party JavaScript packages managed with **npm**.

To reduce security risks:

- Dependencies should be kept up to date.
- Security advisories should be reviewed regularly.
- High and critical vulnerabilities should be patched promptly.
- Pull requests updating vulnerable dependencies are encouraged.

Maintainers may use automated dependency scanning tools such as:

- GitHub Dependabot
- `npm audit`
- GitHub Dependency Graph

Before each release, contributors are encouraged to run:

```bash
npm install
npm audit
npm audit fix
```

Review any remaining vulnerabilities before deployment.

---

## Secure Development Guidelines

When contributing to this project:

- Never commit API keys, access tokens, or secrets.
- Store sensitive configuration in environment variables.
- Validate all user-provided input.
- Keep dependencies updated.
- Review third-party packages before adding them.
- Follow secure coding practices for React and JavaScript.

---

## Scope

Examples of security issues include:

- Cross-Site Scripting (XSS)
- Injection attacks
- Authentication or authorization bypass
- Sensitive data exposure
- Dependency vulnerabilities
- Insecure API usage
- Misconfigured environment variables

The following are generally **not** considered security vulnerabilities:

- Documentation improvements
- UI layout issues
- Styling bugs
- Accessibility improvements
- Feature requests
- Performance optimizations without security implications

---

## Responsible Disclosure

Please allow maintainers a reasonable amount of time to investigate and resolve reported vulnerabilities before publicly disclosing them.

Responsible disclosure helps protect users while fixes are being developed and released.

---

## Acknowledgements

We appreciate everyone who responsibly reports security issues and helps improve the safety and reliability of Pollution-Control-Hub.