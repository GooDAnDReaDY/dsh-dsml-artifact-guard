# 📦 @goodandready/dsh-dsml-artifact-guard

<div align="center">

<h3>Предохранитель и потоковый очиститель от артефактов закрывающих тегов DSML и reasoning-разметки в DeepSeek Harness</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-dsml-artifact-guard"><img src="https://img.shields.io/npm/v/@goodandready/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/🌐_DSH_Hub-goodandready.app-ff4500.svg?style=for-the-badge&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>Если вам нравится этот плагин, поставьте ему звезду на GitHub</strong> — это покажет мне, что плагин вам полезен, и будет мотивировать меня развивать его дальше.
      <br><br>
      🐛 <strong>Если вы нашли баг или хотите предложить новый функционал</strong>, создайте issue на GitHub на любом языке — я рассмотрю ваше предложение и реализую полезные идеи в одной из следующих версий плагина.
    </td>
  </tr>
</table>

</div>

---

## ⚡ Назначение и решаемая проблема

При взаимодействии с некоторыми сторонними провайдерами моделей или прокси-шлюзами служебные теги протокола вызова инструментов DSML (DeepSeek Markup Language) могут просачиваться в видимый текстовый поток ассистента. В конце ответов пользователи нередко наблюдают протокольный мусор вида:

```text
Готово. Все тесты успешно пройдены.
</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
```

Кроме того, reasoning-модели (например, DeepSeek-R1 / V3) или обрывы сетевых сессий могут оставлять сиротливые теги `</think>`, концевые маркеры (`<｜end of sentence｜>`) или незакрытые блоки размышлений, ломающие вёрстку Markdown.

**`@goodandready/dsh-dsml-artifact-guard`** — легковесный плагин времени выполнения для DeepSeek Harness, перехватывающий и удаляющий эти паразитные терминальные артефакты в реальном времени до того, как текст попадёт в интерфейс:

1. **Строго синхронный контракт хука**: в среде Cordis обработчик события `llm/stream` возвращает `AsyncIterable` синхронно без Promise-обёрток.
2. **Буферизация фрагментированного хвоста**: скользящее окно размером 96 байт захватывает закрывающие теги, даже если они разрезаны между сетевыми чанками.
3. **Очистка неполных префиксов тегов при обрыве связи**: при получении сигнала `finish` срезает оборванные терминальные остатки (`</｜DSML｜...`).
4. **Защита от reasoning-артефактов (`cleanThinkArtifacts`)**: очищает сиротливые `</think>`, терминальные спецтокены шлюзов и закрывает аварийно оборванные `<think>`.
5. **100% Fail-Open архитектура**: плагин отслеживает баланс тегов и никогда не удаляет полезный пользовательский текст или обсуждения разметки.
6. **Панель телеметрии и статистики в UI**: отображение числа защищённых сессий, срезанных тегов, времени последней активности и журнала недавних перехватов с кнопкой сброса.

---

## 📦 Установка

Установка через CLI DeepSeek Harness:

```bash
dsh plugin --profile web add @goodandready/dsh-dsml-artifact-guard
```

Перезапустите экземпляр DeepSeek Harness.

---

## ⚙️ Конфигурация (`settings.yaml`)

Настройка параметров в `settings.yaml` или через веб-панель управления:

```yaml
# settings.yaml
dsh-dsml-artifact-guard:
  mode: sanitize
  modelPattern: "deepseek"
  providers: []
  cleanThinkArtifacts: false
```

### Таблица параметров конфигурации

| Параметр | Тип | По умолчанию | Описание |
|:---|:---|:---|:---|
| `mode` | `string` | `"sanitize"` | Режим работы: `"sanitize"` (удалять теги), `"audit"` (только логировать) или `"disabled"` |
| `modelPattern` | `string` | `"deepseek"` | Case-insensitive регулярное выражение для фильтрации моделей (например, `deepseek`, `deepseek-v4.*`) |
| `providers` | `string[]` | `[]` | Список разрешённых ID провайдеров. Если пуст — фильтруются все провайдеры |
| `cleanThinkArtifacts` | `boolean` | `false` | Очистка сиротливых `</think>`, концевых маркеров reasoning и починка незакрытых блоков |
| `providerId` | `string` | `undefined` | *(Устарело)* Идентификатор целевого провайдера; сохранено для обратной совместимости |
| `modelId` | `string` | `undefined` | *(Устарело)* Идентификатор целевой модели; сохранено для обратной совместимости |

### HTTP-эндпоинты управления

| Метод | Эндпоинт | Доступ | Назначение |
|:---|:---|:---|:---|
| `GET` | `/api/dsh-dsml-artifact-guard/stats` | Web UI / Localhost | Возвращает live-телеметрию и последние перехваченные инциденты |
| `POST` | `/api/dsh-dsml-artifact-guard/stats` | Loopback & Same-Origin | Сбрасывает счётчики телеметрии и очищает журнал инцидентов |
| `GET` | `/api/dsh-dsml-artifact-guard/update` | Web UI / Localhost | Получение статуса версии и проверки обновлений |
| `POST` | `/api/dsh-dsml-artifact-guard/update` | Loopback & Same-Origin | Запуск автоматического обновления пакета через DSH CLI |

---

## 🧪 Тестирование

Запуск автоматических тестов:

```bash
npm test
npm run check
```

---

## 📄 Лицензия

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
