# Changelog

All notable changes to the `@goodandready/dsh-dsml-artifact-guard` plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.1] - 2026-09-18

### Fixed
- **Theme Semantic Standardization (`lib/client.js`)**: Eliminated all 42 hardcoded hex/rgba color literals in favor of canonical DeepSeek Harness theme CSS custom properties (`--dsw-alias-...`) and `color-mix()` tints, guaranteeing high contrast and legibility across Dark and Light modes ([#26](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/26)).
- **Theme Regression Test Guard (`test/theme.test.js`)**: Added automated regression test asserting zero hardcoded hex and rgba color literals in client surfaces.
- **Repository Hygiene**: Fixed `.gitignore` whitespace rule for `AGENTS.md` and untracked `package-lock.json` in alignment with zero-dependency architecture.

---

## [0.2.0] - 2026-09-17

### Added
- **Native Settings Card (`lib/client.js`)**: Registered UI card in slot `settings.plugin.item` with snapshot status check, configuration inputs, and disabled warning indicator ([#17](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/17)).
- **One-Click In-Place Updater (`lib/updater.js`)**: Standard HTTP endpoint `/api/dsh-dsml-artifact-guard/update` with SemVer comparison, loopback/same-origin protection, and update execution ([#18](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/18)).
- **Core Primitive Chevron**: Requested `IconChevronDownOutline14` with SVG fallback.

### Fixed
- **Package Hygiene**: Deduplicated multilingual READMEs in `docs/` and restricted `package.json#files` allowlist, reducing package size by ~40% ([#20](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/20)).
- **Repository Cleanliness**: Removed `AGENTS.md` from git tracking ([#19](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/19)) and eliminated legacy `.tgz` archives from source tree ([#21](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/21)).

---

## [0.1.5] - 2026-09-17

### Documentation
- Fixed Mermaid diagram edge label syntax on GitHub and added standard community support block ([#15](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/15)).

---

## [0.1.4] - 2026-09-12

### Changed
- Schema `mode` default set to `sanitize` for out-of-the-box protection ([#11](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/11)).
- Added robust open/close tag balancing in `sanitizeDsmlArtifacts` to handle prior closed blocks in prose ([#11](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/11)).
- Updated design contract documentation and verified package hygiene ([#11](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/11)).

---

## [0.1.3] - 2026-09-06

### Changed
- Wrapped `llm/stream` handler in `ctx.effect` for clean lifecycle unmount ([#8](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/8)).
- Updated `cordis.patch.yml` to use `config: {}`, allowing schema defaults to apply automatically unless overridden ([#9](https://github.com/GooDAnDReaDY/dsh-dsml-artifact-guard/issues/9)).

---

## [0.1.2] - 2026-09-02

### Fixed
- Packaging and runtime compatibility adjustments for DSH profile loader.

---

## [0.1.1] - 2026-08-30

### Added
- Initial release: synchronous, fail-open DSML protocol closing tag sanitizer for DeepSeek Harness model streams.
