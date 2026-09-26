# Changelog

All notable changes to the `@goodandready/dsh-dsml-artifact-guard` plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.8] - 2026-09-26

### Added
- **Universal DeepSeek Model Matching**: replaced strict single `providerId`/`modelId` pair with case-insensitive `modelPattern` RegExp (default: `deepseek`), automatically protecting all DeepSeek models regardless of provider gateway or vendor prefix (#48).
- **Target Providers Filter**: added optional `providers` array filter (empty = all providers) (#48).
- **Russian Localization**: added native `ru` translations in the Web UI settings card alongside English and Chinese (#48).

### Changed
- **De-identification**: removed proprietary `opencode-go` default in public package configuration.
- **Backward Compatibility**: user configs with legacy `providerId` and `modelId` continue to work as an additional exact rule, with a deprecation notice and one-click clear button in the Web UI settings card.
- **Documentation**: added dedicated section explaining lack of DSML processing in core DSH 0.1.7-rc.2.

## [0.2.7] - 2026-09-25

### Fixed
- **Volatile Config Unwrapping**: introduced `unwrapConfig` helper to gracefully handle pre-resolved volatile schema references passed by Cordis to `apply` and `ctx.on('config')`, avoiding TypeError on functions inside volatile schemas (#47).

## [0.2.6] - 2026-09-25

### Fixed
- **SettingsForms Migration (DSH 0.1.7)**: marked Config schema as volatile and configured settings policy (`auto: false`) to suppress generic auto-generated form duplicates, while resolving row ID `dsh-dsml-artifact-guard` via client `configForms` with live subscription support (#17).
- **Client Locale Lifecycle**: wrapped client locale registration in `ctx.effect` to ensure clean namespace disposal on HMR and avoid collision on module reload (#44).

## [0.2.5] - 2026-09-24

### Fixed
- **Preflight & Locale Contract**: eliminated nonexistent `locale.get()` call in `lib/client.js`, using injected `props.t` with canonical `ctx.locale.bind(NS)` fallback (#36).
- **Streaming Buffer & Tag Balancing**: replaced fixed 64-character buffer slicing with delimiter-based tag boundary scanning (`<` and `>`), ensuring DSML parameter tags of arbitrary length preserve open/close tag balance without premature truncation (#37).
- **One-Click Updater LAN Support**: updated `isTrustedUpdateRequest` to allow same-origin requests matching Host/Origin, enabling one-click updates from LAN and reverse-proxy Web UIs while retaining strict loopback verification for local endpoints (#38).
- **Dead Code Elimination**: connected `checkRequestMethod` helper to updater POST handler (#39).

## [0.2.4] - 2026-09-22

### Fixed
- The settings card no longer waits for the removed `settingsScope` service. It uses `configForms` on current DeepSeek Harness (#41).

## [0.2.3] - 2026-09-19

### Fixed
- **Settings reachable again on the plugin's own page**: the card registered into
  `settings.plugin.item` / `plugins.row.config`, and the current DSH core
  (0.1.6-alpha.2) only renders a plugin's configuration page for entries registered
  in the plugin list seat `plugins.item` — that is how `dsh-agentrouter` and
  `dsh-agent-orchestrator` show their settings. The view-aware `PluginItem` is now
  registered there as well (`id: 'dsh-dsml-artifact-guard'`, order 95, static label),
  with the row seat and the legacy card kept as fallbacks.
- The render path was hardened on the way: `PluginCard` is wrapped in its own error
  boundary so a throw inside this card cannot take the whole client batch down.

## [0.2.2] - 2026-09-18

### Fixed
- **Settings reachable again (`lib/client.js`)**: the settings card registered into `settings.plugin.item`, a slot the current DSH core no longer renders, so the plugin's settings were unreachable. The surface now registers into the Plugins page row seat `plugins.row.config`, keyed `@goodandready/dsh-dsml-artifact-guard#dsh-dsml-artifact-guard`: the plugin's row gains a configure control whose page is the settings form (`view: 'page'`, rendered bare — `PluginCard` accepts `bare` and drops the card wrapper because the host page draws the title, icon, crumb and padding) plus a one-line state under the title (`view: 'summary'`). The legacy seat stays registered as a fallback for older cores ([#31](http://192.168.1.111:3005/goodandready/dsh-dsml-artifact-guard/issues/31)).
- **Row-seat guard (`test/row-config-seat.test.js`)**: asserts the row key, the seat order (row seat first, legacy seat kept) and the bare page render.

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
