# Design Contract: dsh-dsml-artifact-guard

## 1. Product Purpose & User Scenarios
- **Purpose**: Streaming guard for DeepSeek Harness that intercepts assistant stream chunks and strips leaked DSML closing tags (`</｜DSML｜parameter>`, `</｜DSML｜invoke>`, `</｜DSML｜tool_calls>`) emitted by upstream providers before text reaches the user interface.
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
  - `/api/dsh-dsml-artifact-guard/update` (GET for version status, POST for executing update; protected by loopback and same-origin validation).
- **Documentation**:
  - Full trilingual documentation: `README.md` (EN), `README.ru.md` (RU), `README.zh.md` (ZH).

## 3. Visual & Component States
- **Card Styling**:
  - Border radius: 12px.
  - Colors: derived strictly from theme variables (`--dsw-alias-border-l2`, `--dsw-alias-bg-card`, `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-accent-primary`, `--dsw-alias-bg-field`).
  - Style Marker: `data-dsh-plugin="@goodandready/dsh-dsml-artifact-guard"`.
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
- **Tag Balancing**: Tracks opening and closing DSML tags across the stream so that only orphaned closing tags at the terminal tail are sanitized, leaving balanced code blocks untouched.
- **Lifecycle Cleanup**: Registered with `ctx.effect` for clean unmount.

## 5. Do / Don't
- **Do**:
  - Check settings snapshot status (`loading`, `unavailable`, `ready`) before rendering.
  - Protect all POST route mutations with loopback & same-origin check (`isTrustedUpdateRequest`).
  - Support English (`en`) as default fallback and Chinese (`zh`) in client bundle.
  - Preserve fail-open guarantees for all user prose.
- **Don't**:
  - Do not hardcode CSS colors outside theme variables.
  - Do not make the stream hook async.
  - Do not bypass pnpm quarantine with `--config.minimumReleaseAge=0` in updater.

## 6. Decisions Log
- **2026-09-06**: Added `ctx.effect` lifecycle wrapper and switched patch to schema-driven defaults (`#8, #9`).
- **2026-09-12**: Changed schema default mode to `sanitize` for out-of-the-box protection, implemented robust open/close tag balancing across streaming chunks, and tracked `package-lock.json` (`#11`).
- **2026-09-17**: Added native DSH Settings Card (`settings.plugin.item`), host settings registration, and one-click updater endpoint `/api/dsh-dsml-artifact-guard/update` (`#17, #18`).
