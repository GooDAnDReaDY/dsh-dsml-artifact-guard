# Changelog

All notable changes to the `@goodandready/dsh-dsml-artifact-guard` plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.16] - 2026-11-12

### Added
- **Project Governance & Deploy Layer**: added `AGENTS.md`, `index.md`, `deploy.sh`, and `.gitattributes` (`export-ignore`), removed `AGENTS.md` from `.gitignore`, and kept `scripts/publish-github.sh` excluding internal workflow/docs files (#75).
- **Unified Request Trust Module**: extracted `lib/request-trust.js` (`isTrustedRequest`, `isLoopback`, `isPrivateLan`, `getConnection`) shared across `/stats` and `/update` endpoints (#76).

### Fixed
- **Updater Auth & GET/POST Hardening**: secured `GET`/`HEAD`/`POST /api/dsh-dsml-artifact-guard/update` through `isTrustedRequest` with DSH `connection.requestRejection` verification, fail-closed loopback/LAN fallback, and case-insensitive `Origin`/`Host` validation (#76).
- **Streaming Orphan `</think>` & Reasoning Block Guard**: tracked `<think>` nesting depth during delta emission so orphan `</think>` tags are stripped even on responses exceeding the `KEEP = 96` sliding window, synchronized `block-end` text, guarded `block-end` against touching `reasoning` blocks, removed `.test()` calls on `/g` regexes, deduplicated tail sanitization via `sanitizeTailArtifacts`, and preserved `removed: 0` in `recordArtifact` for `think-repair` (#77).
- **Client Version Sync, Loading Label & UX Polish**: updated `FALLBACK_VERSION` in `lib/client.js` to match `package.json` (`0.2.16`), added distinct `loading` i18n text instead of showing `Saving…`, fixed `{ updated: false }` updater notice and telemetry reset error feedback, added `role="button"`/`aria-expanded` keyboard navigation on the card header, cleaned up save timers on unmount, and compacted `lib/client.js` below 600 lines (#78).

## [0.2.15] - 2026-11-10

### Fixed
- **DSH Stream Block-End Sanitization**: in `lib/index.js`, sanitize trailing DSML protocol tags and reasoning artifacts on `block-end` chunks for text blocks, and sanitize `block.text` inside the `block-end` payload so DSH kernel persists and renders clean text (#71).
- **Repository Package Lock**: removed `package-lock.json` from `.gitignore` and committed `package-lock.json` to ensure deterministic builds and clean `npm ci && npm test` runs from a fresh clone (#72).
- **Telemetry Host & Auth Validation**: in `lib/telemetry.js`, implemented `isTrustedTelemetryRequest` verifying DSH core connection authentication (`connection.requestRejection`) and validating Host, Origin, and Loopback/LAN headers (rejecting external hosts and DNS rebinding with 403) (#73).

## [0.2.14] - 2026-11-05

### Added
- **Live Intercept Telemetry & Stats**: in `lib/telemetry.js`, implemented in-memory telemetry gathering `totalCleaned`, `sessionsGuarded`, `lastCleanedAt`, `lastModel`, `lastProvider`, and an in-memory ring buffer of recent incidents (#68).
- **Telemetry Web Endpoint**: mounted `/api/dsh-dsml-artifact-guard/stats` (GET for telemetry payload, POST with loopback/same-origin validation to reset counters) (#68).
- **Settings Card Telemetry Dashboard**: in `lib/client.js`, added a responsive telemetry block displaying live counters, a reset button, and an expandable recent incidents log (#68).
- **Reasoning Think Artifact Cleaning**: in `lib/index.js`, added `cleanThinkArtifacts` configuration option to strip orphan `</think>` tags, trailing reasoning markers (`<｜end of sentence｜>`, `<｜thought｜>`), and auto-heal unclosed reasoning blocks at stream finish (#69).
- **Incomplete Trailing DSML Sanitization**: in `lib/index.js`, added detection and stripping of incomplete trailing DSML closing tag tokens (`</｜DSML｜...`) at stream finish when balanced tags precede it (#69).

## [0.2.13] - 2026-10-21

### Fixed
- **Desktop Profile Auto-Detection**: in `lib/updater.js`, updated `runtime()` to detect profile from `process.cwd()` when `cordis.yml` or `cordis.patch.yml` exists, properly resolving the `desktop` profile in DSH Desktop without requiring `DSH_PROFILE_DIR` (#66).
- **DSH Desktop Origin Trust**: in `lib/updater.js`, updated `isTrustedUpdateRequest()` to accept loopback requests from Electron UI origin `dsh-app://app` (#66).

## [0.2.12] - 2026-10-15

### Fixed
- **Settings Form Entry ID Query**: in `lib/client.js` `PluginCard`, changed `_ctx.configForms.get(...)` to query strictly `ROW_ID` (`'dsh-dsml-artifact-guard'`), removing fallback to package name `NS` (`'@goodandready/dsh-dsml-artifact-guard'`) (#64).
- **Settings Scope Binding**: bound `_ctx.settingsScope` using `namespace: ROW_ID`, fixing settings form read failure and resolving `dshmarket` verifier warning for unserved config namespaces (#64).

## [0.2.11] - 2026-10-15

### Fixed
- **Settings Policy Owner Attribution**: passed `ctx.fiber` as the owner argument to `ctx.settings.configure({ auto: false }, ctx.fiber)`, ensuring settings policy correctly attributes to the plugin fiber and suppresses generic duplicate form generation (#62).
- **Live Configuration Updates via Volatile Event**: subscribed to `loader/volatile-update` in `apply()`, allowing live settings mutations saved in the Web UI card to take effect in place without requiring a server restart (#62).

## [0.2.10] - 2026-10-07

### Removed
- **Dead `settings.register` Fallback**: removed dead legacy registration path in `apply()` and eliminated potential un-unwrapped volatile box leak on host settings delivery (#54, #55, #59).
- **Dead `settings.plugin.item` Slot**: removed dead slot registration in client bundle, routing exclusively through active `plugins.row.config` and `plugins.item` seats (#59).

### Optimized
- **Single-Pass Config Unwrapping**: optimized `unwrapConfig` error fallback to evaluate raw plain config in a single pass instead of three recursive walks (#56).

## [0.2.9] - 2026-10-07

### Fixed
- **Safe Locale Extraction**: safely extracted active language string from `LocaleSnapshot` object (`snap?.active`), resolving fatal `TypeError: rawLang.startsWith is not a function` on settings card render (#50, #57).
- **Locale Dictionary Isolation**: removed embedded `ru` dictionary from the plugin bundle to avoid `(namespace, 'ru')` collision in DSH core with `dsh-russian-lang` (#58).
- **Fallback Translator Binding**: bound fallback translator to `ctx.locale.bind(NS)` inside `PluginCard` for clean localization rendering.

## [0.2.8] - 2026-09-26

### Added
- **Global Model Regex Scoping**: replaced rigid single `providerId`/`modelId` requirements with universal case-insensitive `modelPattern` RegExp (default `deepseek`), automatically protecting all DeepSeek models across all providers (#48).
- **Whitelist Provider Filtering**: added optional `providers` array parameter to restrict protection to specified provider IDs while allowing empty array to guard all providers (#48).
- **Backward-Compatible Legacy Scope**: added automatic backward compatibility for existing user configs with legacy `providerId`/`modelId`, displaying an informational notice and clean action in the settings card (#48).
- **De-identified Defaults**: removed proprietary `opencode-go` default from public package distribution (#48).

## [0.2.7] - 2026-09-25

### Fixed
- **Client Locale Lifecycle**: bound client locale registration lifecycle via `ctx.effect` to ensure clean unregistration on HMR and card reload (#44).
- **DSH 0.1.7 SettingsForms Discovery**: marked each user-editable schema field volatile and registered fiber-attributed settings policy with `auto: false` (#17).

## [0.2.6] - 2026-09-24

### Fixed
- **Deep Audit Resolution**: removed nonexistent `ctx.locale.get()` calls in favor of injected `props.t` with `ctx.locale.bind(NS)` fallback (#36).
- **Arbitrary Tag Length Buffer Scanning**: upgraded stream buffer scanning to delimiter-based boundary tracking supporting DSML tags of arbitrary length without buffer truncation (#37).
- **LAN Same-Origin Security**: allowed same-origin update requests from LAN/reverse-proxy UIs while enforcing strict Host/Origin match and loopback origin security (#38).
- **Request Method Verification Integration**: integrated `checkRequestMethod` helper into updater POST handler, eliminating dead export (#39).
