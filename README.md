# dsh-dsml-artifact-guard

Safe DeepSeek DSML artifact sanitizer for DeepSeek Harness.

## What it fixes

Some provider responses append protocol closing tags such as
`</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>` to the visible
assistant text. The guard detects that terminal artifact and can remove it
before the text reaches the chat UI.

The `llm/stream` hook is deliberately synchronous. Cordis expects a stream (an
`AsyncIterable`) immediately; making the hook `async` would return a `Promise`
and break every turn with `stream is not async iterable`.

## Configuration

The bundle accepts:

- `mode`: `audit` (default, log detections without changing text),
  `sanitize` (remove the terminal artifact), or `disabled`;
- `providerId`: provider identifier to inspect (default `opencode-go`);
- `modelId`: model identifier to inspect (default `deepseek-v4-flash`).

Only matching provider/model streams are changed. Other streams pass through
unchanged. The sanitizer is fail-open: malformed or non-text chunks are
forwarded, and only a terminal closing-tag sequence is considered an artifact.

## Compatibility

Version 0.1.0 is compatible with DeepSeek Harness 0.1.2 alpha and rc web
profiles and Cordis 4.x. The synchronous hook fix is required for the rc.1
runtime and remains valid for later 0.1.2 releases.

## Development and tests

```bash
npm test
npm run check
npm pack --dry-run --json
```

Tests cover split stream chunks, audit versus sanitize behavior, scope
matching, and the synchronous Cordis hook contract.

## Related fixes

- Gitea issue #4: synchronous `llm/stream` hook (`stream is not async iterable`).
- Gitea issue #6: package license, ignore rules, and deterministic package
  contents.

## Release v0.1.1

This public hotfix release packages the synchronous stream-hook repair and the deterministic package hygiene changes from Gitea PR #7. It is compatible with DeepSeek Harness 0.1.2 alpha/rc web profiles and keeps the fail-open, provider/model-scoped sanitizer behavior described above.
