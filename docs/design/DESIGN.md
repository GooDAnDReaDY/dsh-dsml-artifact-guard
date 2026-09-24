# Design Contract: dsh-dsml-artifact-guard

## 1. Product Purpose & User Scenarios
- **Purpose**: Streaming guard for DeepSeek Harness that intercepts assistant stream chunks and strips leaked DSML protocol closing tags (`</｜DSML｜parameter>`, `</｜DSML｜invoke>`, `</｜DSML｜tool_calls>`) emitted by upstream providers before text reaches the user interface.
- **Primary Scenarios**:
  - Assistant responds through an upstream gateway exhibiting DSML leakage (e.g. `opencode-go` + `deepseek-v4-flash`). Leaked protocol closing tags at the end of the response are stripped automatically.
  - User views and configures settings (`mode`, `providerId`, `modelId`) through the native DSH Settings UI card without manual config editing.
  - User checks for updates and triggers one-click updater directly from the plugin settings card.
  - User disables the guard (`mode === 'disabled'`); the settings card clearly indicates that protection is inactive with a warning banner.
  - User and assistant discuss DSML syntax or generate markdown/code examples with DSML tags. Legitimate open tags and their matching closing tags are preserved intact (fail-open).
  - Out-of-scope providers/models pass through with zero buffering or regex evaluation.

## 2. User Surfaces
- **Web UI**:
  - Settings Card in slot `settings.plugin.item` (Key: `@goodandready/dsh-dsml-artifact-guard`).
  - Card Header: title, description, version pill (`v0.1.5` / `v0.2.0`), `OFF` warning pill when disabled, chevron toggle with `IconChevronDownOutline14` support.
  - Card Body:
    - One-Click Updater block: version status, update check, "Update Now" action, restart notice.
    - Disabled Warning Banner: displayed when `mode === 'disabled'`.
    - Settings Form: `mode` (select), `providerId` (input), `modelId` (input), "Save Settings" button with loading and success feedback.
- **DSH Configuration & Scope**:
  - Namespace: `@goodandready/dsh-dsml-artifact-guard`.
  - `mode`: `"sanitize"` (default, strips tags), `"audit"` (logs to `ctx.logger.info`), `"disabled"` (bypasses).
  - `providerId`: target provider (default `"opencode-go"`).
  - `modelId`: target model (default `"deepseek-v4-flash"`).
- **HTTP Routes**:
  - `/api/dsh-dsml-artifact-guard/update` (GET for version status, POST for executing update; protected by loopback and strict same-origin validation for localhost and LAN/reverse-proxy UIs).
- **Documentation**:
  - Full trilingual documentation: `README.md` (EN), `README.ru.md` (RU), `README.zh.md` (ZH).

## 3. Visual & Component States
- **Card Styling & Theming**:
  - Border radius: 12px.
  - Zero hardcoded hex or rgba color literals: `lib/client.js` is strictly governed by CSS custom properties and `color-mix()` functions.
  - Tokens used:
    - Backgrounds: `var(--dsw-alias-bg-card, var(--dsw-alias-bg-layer-3))`, `var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))`.
    - Borders: `var(--dsw-alias-border-l2)`.
    - Labels: `var(--dsw-alias-label-primary)`, `var(--dsw-alias-label-secondary)`, `var(--dsw-alias-label-tertiary)`.
    - Brand / Accent: `var(--dsw-alias-brand-primary, var(--dsw-alias-state-brand-primary))`.
    - Status States: `var(--dsw-alias-state-success-primary)`, `var(--dsw-alias-state-warning-primary)`, `var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))`.
    - Substrates / Tints: `color-mix(in srgb, var(--dsw-alias-...) N%, transparent)` for badges, banners, and updater panels.
    - Contrast Buttons: `background: var(--dsw-alias-label-primary)`, `color: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card))` ensures perfect legibility across dark and light palettes.
  - Style Marker: `data-dsh-plugin="@goodandready/dsh-dsml-artifact-guard"`.
  - Automated Guard: `test/theme.test.js` enforces zero hex/rgba regressions on every build.
- **States**:
  - `loading`: shows loading indicator while reading settings snapshot.
  - `unavailable`: shows error message if settings service is unmounted.
  - `ready`: form inputs enabled and populated.
  - `disabled`: prominent red/amber indicator and banner warning that guard is bypassed.
  - `saving`: save button disabled with "Saving…" indicator.
  - `saved`: green confirmation indicator.

## 4. Streaming & Buffering Contract
- **Synchronous Hook Contract**: The `llm/stream` listener returns an `AsyncIterable` synchronously. Returning a `Promise` breaks the Cordis event dispatcher.
- **Sliding Buffer (KEEP = 96)**: Preserves the terminal window across chunk splits.
- **Tag Balancing**: Delimiter-based boundary scanning (`<` and `>`) that accurately tracks opening and closing DSML tags across arbitrary chunk boundaries and tag lengths without fixed-buffer truncation, ensuring fail-open guarantees for legitimate user prose.
- **Lifecycle Cleanup**: Registered with `ctx.effect` for clean unmount.

## 5. Do / Don't
- **Do**:
  - Check settings snapshot status (`loading`, `unavailable`, `ready`) before rendering.
  - Protect all POST route mutations with loopback & same-origin check (`isTrustedUpdateRequest`).
  - Support English (`en`) as default fallback and Chinese (`zh`) in client bundle.
  - Preserve fail-open guarantees for all user prose.
  - Use `color-mix()` for transparent backgrounds and canonical CSS variables for all UI elements.
- **Don't**:
  - Do not hardcode CSS colors or rgba() literals in client code.
  - Do not make the stream hook async.
  - Do not bypass pnpm quarantine with `--config.minimumReleaseAge=0` in updater.

## 6. Decisions Log
- **2026-09-06**: Added `ctx.effect` lifecycle wrapper and switched patch to schema-driven defaults (`#8, #9`).
- **2026-09-12**: Changed schema default mode to `sanitize` for out-of-the-box protection, implemented robust open/close tag balancing across streaming chunks, and tracked `package-lock.json` (`#11`).
- **2026-09-17**: Added native DSH Settings Card (`settings.plugin.item`), host settings registration, and one-click updater endpoint `/api/dsh-dsml-artifact-guard/update` (`#17, #18`).
- **2026-09-18**: Fixed theme regression (`#26`): replaced all 42 hardcoded hex/rgba instances in `lib/client.js` with canonical `--dsw-alias-...` CSS tokens and `color-mix()`. Added automated test guard `test/theme.test.js`. Fixed `.gitignore` whitespace bug for `AGENTS.md`. Untracked `package-lock.json` and added it to `.gitignore` since the package has 0 runtime and 0 dev dependencies, relying entirely on native Node.js built-ins.

- **2026-09-24**: Deep audit resolution:
  - Eliminated nonexistent `ctx.locale.get()` in `lib/client.js` in favor of injected `props.t` with `ctx.locale.bind(NS)` fallback (#36).
  - Upgraded stream buffer scanning to delimiter-based boundary tracking supporting DSML tags of arbitrary length without buffer truncation (#37).
  - Allowed same-origin update requests from LAN/reverse-proxy UIs while enforcing strict Host/Origin match and loopback origin security (#38).
  - Integrated `checkRequestMethod` helper into updater POST handler, eliminating dead export (#39).
