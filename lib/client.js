window.__ModuleLoader__.load({
  id: '@goodandready/dsh-dsml-artifact-guard',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const NS = '@goodandready/dsh-dsml-artifact-guard';
    // Row seat (#31): the Plugins page keys a row's configuration page by
    // '<package name>#<row id>', with the row id exactly as cordis.patch.yml
    // declares it. Keep all three in step with package.json and the patch.
    const PKG = '@goodandready/dsh-dsml-artifact-guard';
    const ROW_ID = 'dsh-dsml-artifact-guard';
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID;

    // Query core chevron primitive when available; fallback SVG otherwise
    let CoreChevron = null;
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
      CoreChevron = primitives && primitives.IconChevronDownOutline14;
    } catch (e) {
      /* Optional core chevron primitive not available; SVG fallback used */
    }

    const CHEVRON_DOWN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    const CHEVRON_UP_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';

    const en = {
      title: 'DSML Artifact Guard',
      sub: 'Sanitizes leaked terminal DSML protocol closing tags from model text streams',
      version: 'Version',
      updateChecking: 'Checking updates…',
      updateAvailable: 'Update available: v{v}',
      upToDate: 'Up to date',
      updateNow: 'Update Now',
      updating: 'Updating…',
      updateSuccess: 'Updated to v{v}. Restart DSH service to apply changes.',
      updateFailed: 'Update failed: {msg}',
      checkUpdateFailed: 'Check failed',
      mode: 'Operating Mode',
      modeSanitize: 'Sanitize (strip leaked closing tags)',
      modeAudit: 'Audit (log warnings only, preserve output)',
      modeDisabled: 'Disabled (bypass all streams)',
      providerId: 'Target Provider ID',
      modelId: 'Target Model ID',
      disabledNotice: '⚠️ Guard is currently disabled. DSML closing tags will reach the chat interface.',
      statusUnavailable: 'Settings service unavailable.',
      saving: 'Saving…',
      ready: 'Save Settings',
      saved: 'Settings saved',
      saveError: 'Save failed: {msg}',
    };

    const zh = {
      title: 'DSML 协议标签守卫',
      sub: '实时侦测并清洗模型文本流中泄漏的 DSML 协议末端闭合标签',
      version: '版本',
      updateChecking: '正在检查更新…',
      updateAvailable: '发现新版本: v{v}',
      upToDate: '已是最新版本',
      updateNow: '立即更新',
      updating: '正在更新…',
      updateSuccess: '已更新至 v{v}。请重启 DSH 服务以生效变更。',
      updateFailed: '更新失败: {msg}',
      checkUpdateFailed: '检查更新失败',
      mode: '运行模式',
      modeSanitize: 'Sanitize 清洗（自动剥除残留闭合标签）',
      modeAudit: 'Audit 审计（仅在日志记录警告，不修改正文）',
      modeDisabled: 'Disabled 禁用（直通所有数据流）',
      providerId: '目标服务商标识 (Provider ID)',
      modelId: '目标模型标识 (Model ID)',
      disabledNotice: '⚠️ 守卫当前已禁用，残留的 DSML 闭合标签将直接显示在聊天界面。',
      statusUnavailable: '配置服务不可用。',
      saving: '正在保存…',
      ready: '保存配置',
      saved: '配置已保存',
      saveError: '保存失败: {msg}',
    };

    const DEFAULTS = {
      mode: 'sanitize',
      providerId: 'opencode-go',
      modelId: 'deepseek-v4-flash',
    };

    function PluginCard({ ctx: _ctx, t, bare }) {
      const [expanded, setExpanded] = React.useState(false);
      const [draft, setDraft] = React.useState(DEFAULTS);
      const [status, setStatus] = React.useState('loading');
      const [saving, setSaving] = React.useState(false);
      const [msg, setMsg] = React.useState('');

      // Updater state
      const [updateState, setUpdateState] = React.useState({
        checking: false,
        updateAvailable: false,
        currentVersion: '0.1.5',
        latestVersion: '',
        updating: false,
        notice: '',
        error: '',
      });

      const scopeRef = React.useRef(null);
      if (!scopeRef.current && _ctx && _ctx.configForms) {
        try {
          scopeRef.current = _ctx.configForms.get(NS);
        } catch (e) {
          scopeRef.current = null;
        }
      }
      const scope = scopeRef.current;

      const currentLang = (_ctx?.locale?.get?.() || navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
      const dict = currentLang === 'zh' ? zh : en;
      const tt = (k, params) => {
        let str = (typeof t === 'function' ? t(k) : null) || dict[k] || en[k] || k;
        if (params && typeof params === 'object') {
          for (const [pk, pv] of Object.entries(params)) {
            str = str.replace(new RegExp('\\{' + pk + '\\}', 'g'), String(pv));
          }
        }
        return str;
      };

      // Load settings from snapshot
      React.useEffect(() => {
        if (!scope) {
          setStatus('unavailable');
          return;
        }
        let cancelled = false;
        (async () => {
          try {
            const snap = await scope.get();
            if (cancelled) return;
            if (snap && typeof snap === 'object' && 'status' in snap) {
              if (snap.status === 'ready' && snap.value) {
                setDraft({
                  mode: snap.value.mode || DEFAULTS.mode,
                  providerId: snap.value.providerId || DEFAULTS.providerId,
                  modelId: snap.value.modelId || DEFAULTS.modelId,
                });
                setStatus('ready');
              } else {
                setStatus(snap.status);
              }
            } else if (snap && typeof snap === 'object') {
              setDraft({
                mode: snap.mode || DEFAULTS.mode,
                providerId: snap.providerId || DEFAULTS.providerId,
                modelId: snap.modelId || DEFAULTS.modelId,
              });
              setStatus('ready');
            } else {
              setStatus('ready');
            }
          } catch {
            if (!cancelled) setStatus('unavailable');
          }
        })();
        return () => { cancelled = true; };
      }, [scope]);

      // Check updater status on mount
      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            setUpdateState(s => ({ ...s, checking: true, error: '' }));
            const res = await fetch('/api/dsh-dsml-artifact-guard/update');
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            if (cancelled) return;
            setUpdateState(s => ({
              ...s,
              checking: false,
              currentVersion: data.currentVersion || s.currentVersion,
              latestVersion: data.latestVersion || '',
              updateAvailable: !!data.updateAvailable,
            }));
          } catch {
            if (!cancelled) {
              setUpdateState(s => ({ ...s, checking: false, error: tt('checkUpdateFailed') }));
            }
          }
        })();
        return () => { cancelled = true; };
      }, []);

      const onTriggerUpdate = async () => {
        if (updateState.updating) return;
        setUpdateState(s => ({ ...s, updating: true, error: '', notice: '' }));
        try {
          const res = await fetch('/api/dsh-dsml-artifact-guard/update', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-dsh-plugin-update': '1',
            },
          });
          const data = await res.json();
          if (!res.ok || !data.ok && data.error) {
            throw new Error(data.error || String(res.status));
          }
          setUpdateState(s => ({
            ...s,
            updating: false,
            updateAvailable: false,
            currentVersion: data.updatedVersion || s.latestVersion,
            notice: tt('updateSuccess', { v: data.updatedVersion || s.latestVersion }),
          }));
        } catch (err) {
          setUpdateState(s => ({
            ...s,
            updating: false,
            error: tt('updateFailed', { msg: err.message || String(err) }),
          }));
        }
      };

      const onSave = async () => {
        if (!scope || saving) return;
        setSaving(true);
        setMsg('');
        try {
          const failures = [];
          for (const key of ['mode', 'providerId', 'modelId']) {
            try {
              await scope.set(key, draft[key]);
            } catch (err) {
              failures.push(key + ': ' + (err.message || String(err)));
            }
          }
          if (failures.length > 0) {
            setMsg(tt('saveError', { msg: failures.join(', ') }));
          } else {
            setMsg(tt('saved'));
            setTimeout(() => setMsg(''), 3000);
          }
        } catch (err) {
          setMsg(tt('saveError', { msg: err.message || String(err) }));
        } finally {
          setSaving(false);
        }
      };

      const isDisabled = draft.mode === 'disabled';

      const header = React.createElement('div', {
          onClick: () => setExpanded(v => !v),
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            cursor: 'pointer',
            userSelect: 'none',
          },
        },
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              React.createElement('span', { style: { fontSize: 16 } }, '🛡️'),
              React.createElement('span', {
                style: {
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary)',
                },
              }, tt('title')),
              React.createElement('span', {
                style: {
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'color-mix(in srgb, var(--dsw-alias-brand-primary, var(--dsw-alias-state-brand-primary)) 15%, transparent)',
                  color: 'var(--dsw-alias-brand-primary, var(--dsw-alias-state-brand-primary))',
                },
              }, 'v' + updateState.currentVersion),
              isDisabled && React.createElement('span', {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'color-mix(in srgb, var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary)) 15%, transparent)',
                  color: 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))',
                },
              }, 'OFF')
            ),
            React.createElement('span', {
              style: {
                fontSize: 13,
                color: 'var(--dsw-alias-label-secondary)',
              },
            }, tt('sub'))
          ),
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              color: 'var(--dsw-alias-label-tertiary)',
            },
          },
            CoreChevron
              ? React.createElement(CoreChevron, { style: { transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } })
              : React.createElement('span', { dangerouslySetInnerHTML: { __html: expanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG } })
          )
        );

        // Body. The row/page seat asks for the form alone: the host page draws
        // the title, icon and crumb and supplies its own padding, so rendering
        // our card chrome there would double the border and shift the block.
        const body = React.createElement('div', {
          style: {
            padding: bare ? '0' : '0 16px 16px',
            borderTop: bare ? 'none' : '1px solid var(--dsw-alias-border-l2)',
          },
        },
          // One-Click Updater block
          React.createElement('div', {
            style: {
              padding: '12px 14px',
              margin: '14px 0',
              background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)',
              borderRadius: 8,
              border: '1px solid var(--dsw-alias-border-l2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            },
          },
            React.createElement('div', { style: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } },
              React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } },
                tt('version') + ': ' + updateState.currentVersion
              ),
              updateState.checking && React.createElement('span', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12 } },
                tt('updateChecking')
              ),
              !updateState.checking && updateState.updateAvailable && React.createElement('span', { style: { color: 'var(--dsw-alias-state-warning-primary)', fontWeight: 600, fontSize: 12 } },
                tt('updateAvailable', { v: updateState.latestVersion })
              ),
              !updateState.checking && !updateState.updateAvailable && !updateState.error && React.createElement('span', { style: { color: 'var(--dsw-alias-state-success-primary)', fontSize: 12 } },
                '✓ ' + tt('upToDate')
              ),
              updateState.error && React.createElement('span', { style: { color: 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))', fontSize: 12 } },
                updateState.error
              )
            ),
            updateState.updateAvailable && React.createElement('button', {
              onClick: onTriggerUpdate,
              disabled: updateState.updating,
              style: {
                padding: '6px 14px',
                borderRadius: 6,
                background: 'var(--dsw-alias-label-primary)',
                color: 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card))',
                border: 0,
                fontSize: 12,
                fontWeight: 600,
                cursor: updateState.updating ? 'default' : 'pointer',
              },
            }, updateState.updating ? tt('updating') : tt('updateNow'))
          ),
          updateState.notice && React.createElement('div', {
            style: {
              padding: '8px 12px',
              marginBottom: 12,
              background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)',
              color: 'var(--dsw-alias-state-success-primary)',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 20%, transparent)',
            },
          }, updateState.notice),

          // Disabled Warning Banner
          isDisabled && React.createElement('div', {
            style: {
              padding: '8px 12px',
              marginBottom: 14,
              background: 'color-mix(in srgb, var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary)) 10%, transparent)',
              color: 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid color-mix(in srgb, var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary)) 20%, transparent)',
            },
          }, tt('disabledNotice')),

          // Status Loading / Unavailable
          status === 'loading' && React.createElement('div', {
            style: { padding: '16px 0', fontSize: 13, color: 'var(--dsw-alias-label-tertiary)' },
          }, tt('saving')),
          status === 'unavailable' && React.createElement('div', {
            style: { padding: '16px 0', fontSize: 13, color: 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))' },
          }, tt('statusUnavailable')),

          // Settings Fields
          status === 'ready' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            // Mode Select
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              React.createElement('label', {
                style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
              }, tt('mode')),
              React.createElement('select', {
                value: draft.mode,
                onChange: (e) => setDraft(d => ({ ...d, mode: e.target.value })),
                style: {
                  height: 34,
                  borderRadius: 6,
                  border: '1px solid var(--dsw-alias-border-l2)',
                  background: 'var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))',
                  color: 'var(--dsw-alias-label-primary)',
                  padding: '0 10px',
                  fontSize: 13,
                },
              },
                React.createElement('option', { value: 'sanitize' }, tt('modeSanitize')),
                React.createElement('option', { value: 'audit' }, tt('modeAudit')),
                React.createElement('option', { value: 'disabled' }, tt('modeDisabled'))
              )
            ),

            // Provider ID Field
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              React.createElement('label', {
                style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
              }, tt('providerId')),
              React.createElement('input', {
                type: 'text',
                value: draft.providerId,
                onChange: (e) => setDraft(d => ({ ...d, providerId: e.target.value })),
                style: {
                  height: 34,
                  borderRadius: 6,
                  border: '1px solid var(--dsw-alias-border-l2)',
                  background: 'var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))',
                  color: 'var(--dsw-alias-label-primary)',
                  padding: '0 10px',
                  fontSize: 13,
                },
              })
            ),

            // Model ID Field
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              React.createElement('label', {
                style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
              }, tt('modelId')),
              React.createElement('input', {
                type: 'text',
                value: draft.modelId,
                onChange: (e) => setDraft(d => ({ ...d, modelId: e.target.value })),
                style: {
                  height: 34,
                  borderRadius: 6,
                  border: '1px solid var(--dsw-alias-border-l2)',
                  background: 'var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))',
                  color: 'var(--dsw-alias-label-primary)',
                  padding: '0 10px',
                  fontSize: 13,
                },
              })
            ),

            // Actions
            React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--dsw-alias-border-l2)',
                marginTop: 4,
              },
            },
              React.createElement('button', {
                onClick: onSave,
                disabled: saving || status !== 'ready',
                style: {
                  height: 34,
                  padding: '0 18px',
                  border: 0,
                  borderRadius: 8,
                  background: 'var(--dsw-alias-label-primary)',
                  color: 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card))',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer',
                },
              }, saving ? tt('saving') : tt('ready')),
              msg && React.createElement('span', {
                style: {
                  fontSize: 13,
                  color: msg === tt('saved') ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))',
                },
              }, msg)
            )
          )
        );
      if (bare) {
        return React.createElement('div', {
          'data-dsh-plugin': NS,
          className: 'dsh-dsml-artifact-guard-form',
        }, body);
      }
      return React.createElement('div', {
        'data-dsh-plugin': NS,
        className: 'dsh-dsml-artifact-guard-card',
        style: {
          borderRadius: 12,
          border: '1px solid var(--dsw-alias-border-l2)',
          background: 'var(--dsw-alias-bg-card, var(--dsw-alias-bg-layer-3))',
          overflow: 'hidden',
          marginBottom: 12,
        },
      },
        header,
        expanded && body
      );
    }

    // View-aware entry for the host slots that carry a configuration page.
    // 'plugins.row.config' asks for view:'summary' (the one-liner under the row
    // title) and view:'page' (the form, bare). The older seat keeps the card.
    function PluginItem(props) {
      if (props && props.view === 'summary') {
        const ctx = props && props.ctx;
        const lang = (ctx && ctx.locale && typeof ctx.locale.get === 'function' ? ctx.locale.get() : null) || 'en';
        const dict = String(lang).startsWith('zh') ? zh : en;
        const tt = typeof props.t === 'function' ? props.t : (k) => dict[k] || en[k] || k;
        return React.createElement('div', {
          'data-dsh-plugin': NS,
          className: 'dsh-dsml-artifact-guard-sub',
          style: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' },
        }, tt('sub'));
      }
      return React.createElement(PluginCard, Object.assign({}, props, { bare: true }));
    }

    exports.inject = ['slots', 'configForms', 'locale'];
    exports.apply = function apply(ctx) {
      if (typeof ctx.locale?.register === 'function') {
        try {
          ctx.locale.register(NS, { en, zh });
        } catch (err) {
          /* Locale namespace already registered or unavailable */
        }
      }

      function registerSlotWhenReady(slotName, registerFn) {
        if (!ctx.slots) return;
        if (typeof ctx.slots.inject === 'function') {
          try {
            ctx.slots.inject(slotName, () => {
              try {
                return registerFn();
              } catch (err) {
                console.warn('[' + NS + '] Error registering slot ' + slotName + ':', err);
              }
            });
            return;
          } catch (err) {
            console.warn('[' + NS + '] Failed to inject slot ' + slotName + ':', err);
          }
        }
        if (typeof ctx.slots.register === 'function') {
          try {
            registerFn();
          } catch (err) {
            console.warn('[' + NS + '] Failed direct registration for ' + slotName + ':', err);
          }
        }
      }

      // Newest seat first: the Plugins page renders a row's own configuration
      // page from 'plugins.row.config'. Keep 'settings.plugin.item' below as the
      // fallback for cores that still render the old card slot.
      registerSlotWhenReady('plugins.row.config', () =>
        ctx.slots.register(
          {
            name: 'plugins.row.config',
            key: ROW_CONFIG_KEY,
            locale: NS,
            inject: () => ({ ctx }),
          },
          PluginItem
        )
      );

      // List seat (plugins.item): the seat the Plugins page really renders as the
      // plugin's own page with its configuration — the page draws the title, icon
      // and crumb and asks for view 'summary' (the card's one-liner) or view 'page'
      // (the form), both served by PluginItem. The label is a static string on
      // purpose: it is resolved while the page renders, and a locale lookup there
      // would take the whole client batch down with it.
      registerSlotWhenReady('plugins.item', () =>
        ctx.slots.register(
          {
            name: 'plugins.item',
            id: 'dsh-dsml-artifact-guard',
            order: 95,
            label: () => 'DSML Artifact Guard',
            locale: NS,
            inject: () => ({ ctx }),
          },
          PluginItem
        )
      );

      registerSlotWhenReady('settings.plugin.item', () =>
        ctx.slots.register(
          {
            name: 'settings.plugin.item',
            key: NS,
            order: 95,
            locale: NS,
            inject: () => ({ ctx }),
          },
          (props) => React.createElement(PluginCard, { ...props, ctx: (props && props.ctx) || ctx })
        )
      );
    };

    return module.exports;
  },
});
