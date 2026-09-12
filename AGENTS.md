# AGENTS.md

Этот файл дополняет корневой `A:\mnt\external\Project\DEV\AGENTS.md` и
содержит только правила и факты, специфичные для данного проекта.

При противоречии с корневыми правилами агент обязан остановиться, описать
противоречие и согласовать дальнейшие действия с пользователем.

## Product / Purpose

- Проект: `dsh-dsml-artifact-guard`
- DEV: `/mnt/external/Project/DEV/dhsplugins/dsh-dsml-artifact-guard`
- Назначение: Host-only runtime stream interceptor для DeepSeek Harness, санитизирующий просачивающиеся закрывающие теги протокола DSML (`</｜DSML｜parameter>`, `</｜DSML｜invoke>`, `</｜DSML｜tool_calls>`) из стримов ассистента до их попадания в чат.

## Package policy (только для DSH-плагина)

- Все плагины проектируются публичными с первого коммита.
- Имя пакета: `@goodandready/dsh-dsml-artifact-guard`.
- До прямой команды владельца «публикуем» пакет не публикуется в GitHub/npm.
- Scope: `@goodandready` во всех трёх местах (`package.json`, `cordis.patch.yml`, client id).
- Host-only: клиентский UI отсутствует, плагин подключается через событие `llm/stream` Cordis.

## Architecture & Lifecycles

- Обработчик `llm/stream` обязан возвращать `AsyncIterable` строго синхронно (без async-обёртки, чтобы избежать `stream is not async iterable`).
- Подписка `ctx.on('llm/stream', ...)` оборачивается в `ctx.effect(() => ...)`.
- Буфер `KEEP = 96` удерживает последние байты стрима для надёжного вырезания тегов, разбитых между чанками.
- Балансировка тегов: отслеживается глубина открывающих/закрывающих тегов DSML, чтобы сохранять легитимные примеры DSML в прозе и санитизировать сиротские закрывающие теги в конце.
- Конфигурация: `@deepseek-ai/schemastery`, режим по умолчанию `mode: sanitize`.

## Verification

- `npm test` (node:test)
- `npm run check` (node --check)
- `npm pack --dry-run` (лимит 256 KiB)
