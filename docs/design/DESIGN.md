# Design Contract: dsh-dsml-artifact-guard

## 1. Product Purpose & User Scenarios
- **Purpose**: Host-only streaming guard for DeepSeek Harness that intercepts assistant stream chunks and strips leaked DSML closing tags (`</｜DSML｜parameter>`, `</｜DSML｜invoke>`, `</｜DSML｜tool_calls>`) emitted by upstream providers before text reaches the user interface.
- **Primary Scenarios**:
  - Assistant responds through an upstream gateway exhibiting DSML leakage (e.g. `opencode-go` + `deepseek-v4-flash`). Leaked protocol closing tags at the end of the response are stripped automatically.
  - User and assistant discuss DSML syntax or generate markdown/code examples with DSML tags. Legitimate open tags and their matching closing tags are preserved intact (fail-open).
  - Out-of-scope providers/models pass through with zero buffering or regex evaluation.

## 2. User Surfaces
- **Web UI**: UI отсутствует на текущем этапе (host-only middleware plugin).
- **DSH Configuration**:
  - `mode`: `"sanitize"` (default, strips tags), `"audit"` (logs to `ctx.logger.info`), `"disabled"` (bypasses).
  - `providerId`: target provider (default `"opencode-go"`).
  - `modelId`: target model (default `"deepseek-v4-flash"`).
- **Documentation**:
  - Full trilingual documentation: `README.md` (EN), `docs/README.ru.md` (RU), `docs/README.zh.md` (ZH).

## 3. Streaming & Buffering Contract
- **Synchronous Hook Contract**: The `llm/stream` listener returns an `AsyncIterable` synchronously. Returning a `Promise` breaks the Cordis event dispatcher.
- **Sliding Buffer (KEEP = 96)**: Preserves the terminal window across chunk splits.
- **Tag Balancing**: Tracks opening and closing DSML tags across the stream so that only orphaned closing tags at the terminal tail are sanitized, leaving balanced code blocks untouched.

## 4. Do / Don't
- **Do**:
  - Preserve fail-open guarantees for all user prose.
  - Dispose hook registration with `ctx.effect`.
  - Pass non-target provider/model streams directly through.
- **Don't**:
  - Do not make the stream hook async.
  - Do not drop legitimate DSML discussion in chat.
  - Do not add heavy client-side UI for simple host middleware.

## 5. Decisions Log
- **2026-09-06**: Added `ctx.effect` lifecycle wrapper and switched patch to schema-driven defaults (`#8, #9`).
- **2026-09-12**: Changed schema default mode to `sanitize` for out-of-the-box protection, implemented robust open/close tag balancing across streaming chunks, and tracked `package-lock.json` (`#11`).
