# Security Policy

## Supported Versions

AutomataLab only provides security updates for the current major release. If you are on an older version, please update via the automatic updater or download the latest release from GitHub.

| Version | Supported          |
| ------- | ------------------ |
| 5.0.x   | :white_check_mark: |
| < 5.0.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within AutomataLab, please **do NOT** open a public issue on GitHub. 

Instead, please report it via the **[GitHub Security Advisory](https://github.com/reeshavsinha/AutomataLab/security/advisories/new)** feature.

### Scope of Security
Because AutomataLab operates as a completely local, client-side application without cloud backends, the primary security concerns we monitor are:
1. **Malicious Payloads:** Exploits triggered by importing maliciously crafted `.autolab.json` or `.jff` files (e.g., prototype pollution or arbitrary code execution via the parser).
2. **Tauri Vulnerabilities:** Local privilege escalation or IPC bridging issues inherited from the Tauri framework.
3. **Web Worker Escapes:** Vulnerabilities related to our background Web Workers executing untrusted computations.

All verified security vulnerabilities will be promptly addressed, and patched releases will be pushed via the auto-updater.
