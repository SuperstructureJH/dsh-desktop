window.__ModuleLoader__.load({
  id: 'dsh-desktop-office-controls',
  factory: require => {
    const React = require('react')
    const NS = 'settings.desktopOffice'
    const PATH = '/dsh-desktop/office'
    const names = new Set(['dsh-office', 'dsh-ppt', 'dsh-ppt-composer'])
    const zh = {
      tab: '内置能力', title: 'Office 办公', description: '制作和编辑 PPT、Word、Excel',
      pptDescription: '制作和编辑 PPT',
      enabled: '已启用', disabled: '已停用', loading: '正在读取设置…',
      pending: '当前任务结束后生效', saving: '正在更新…',
      retained: '历史文件、个人模板和配置会保留。', failed: '设置更新失败，请重试。', retry: '重试'
    }
    const en = {
      tab: 'Built-in capabilities', title: 'Office', description: 'Create and edit PPT, Word and Excel files',
      pptDescription: 'Create and edit PPT files',
      enabled: 'Enabled', disabled: 'Disabled', loading: 'Loading settings…',
      pending: 'Applies when current tasks finish', saving: 'Updating…',
      retained: 'Existing files, personal templates and settings are kept.', failed: 'Could not update settings. Try again.', retry: 'Retry'
    }
    const css = `.dshOfficeControls{max-width:720px;color:var(--dsw-alias-label-primary)}
      .dshOfficeControlCard{display:flex;align-items:flex-start;gap:24px;padding:20px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-3)}
      .dshOfficeControlText{flex:1;min-width:0}.dshOfficeControlTitle{margin:0 0 5px;font-size:16px;line-height:24px;font-weight:600}
      .dshOfficeControlDescription{margin:0;font-size:13px;line-height:21px;color:var(--dsw-alias-label-secondary)}
      .dshOfficeControlStatus{margin:12px 0 0;font-size:12px;line-height:19px;color:var(--dsw-alias-label-tertiary)}
      .dshOfficeControlSwitch{flex:none;margin:2px 0 0;appearance:none;width:38px;height:22px;border:0;border-radius:12px;background:var(--dsw-alias-border-l3);padding:3px;cursor:pointer}
      .dshOfficeControlSwitch:after{content:'';display:block;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0002}
      .dshOfficeControlSwitch:checked{background:var(--dsw-alias-brand-primary)}.dshOfficeControlSwitch:checked:after{transform:translateX(16px)}
      .dshOfficeControlSwitch:disabled{opacity:.5;cursor:wait}.dshOfficeControlSwitch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
      .dshOfficeControlError{margin:12px 0;color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px}
      .dshOfficeControlRetry{background:transparent;color:inherit;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;padding:4px 10px;margin-left:10px;cursor:pointer}`

    async function request(enabled, path = PATH) {
      const response = await fetch(path, {
        method: enabled === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        ...(enabled === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) })
      })
      const state = await response.json()
      if (!response.ok) throw new Error(state.error || `HTTP ${response.status}`)
      return state
    }

    function OfficeTab({ store, t }) {
      const value = React.useSyncExternalStore(store.subscribe, store.snapshot)
      const { state, error, saving } = value
      const busy = saving || !state || ['loading', 'saving', 'pending', 'applying'].includes(state.phase)
      const status = !state ? 'loading' : state.phase === 'pending' ? 'pending' : busy ? 'saving' : state.applied ? 'enabled' : 'disabled'
      return React.createElement('section', { className: 'dshOfficeControls' },
        React.createElement('div', { className: 'dshOfficeControlCard' },
          React.createElement('div', { className: 'dshOfficeControlText' },
            React.createElement('h3', { id: 'dsh-office-controls-title', className: 'dshOfficeControlTitle' }, t('title')),
            React.createElement('p', { className: 'dshOfficeControlDescription' }, t(state?.formats?.includes('word') ? 'description' : 'pptDescription')),
            React.createElement('p', { className: 'dshOfficeControlStatus', role: 'status' }, t(status)),
            React.createElement('p', { className: 'dshOfficeControlStatus' }, t('retained'))),
          React.createElement('input', {
            type: 'checkbox', role: 'switch', className: 'dshOfficeControlSwitch',
            'aria-labelledby': 'dsh-office-controls-title', checked: state?.enabled ?? true,
            disabled: busy, onChange: event => void store.set(event.target.checked)
          })),
        error ? React.createElement('p', { className: 'dshOfficeControlError', role: 'alert' }, t('failed'),
          React.createElement('button', { type: 'button', className: 'dshOfficeControlRetry', onClick: () => void store.refresh() }, t('retry'))) : null)
    }

    function apply(ctx) {
      const listeners = new Set()
      let value = { state: undefined, error: undefined, saving: false }
      let disposed = false
      let inFlight
      let synchronizedGeneration
      const publish = update => { value = { ...value, ...update }; for (const listener of listeners) listener() }
      const reconcile = async state => {
        if (state.phase !== 'idle') return
        // The browser Loader disposes only these plugin occupants. Conversation
        // drafts and attachment handles remain in their existing owning services.
        await ctx.loader.await()
        if (state.applied && synchronizedGeneration !== state.generation) {
          // A client opened while Office was disabled has no Office bundles.
          // Refresh the advertised arrivals and let Cordis create those entries.
          const manifest = ctx.modules.updateGraph(await request(undefined, `${PATH}?clients=1`))
          const existing = new Set([...ctx.loader.entries()].map(entry => entry.options.name))
          for (const row of manifest.plugins) {
            if (names.has(row.id) && !existing.has(row.id)) await ctx.loader.create({ name: row.id })
          }
        }
        const entries = [...ctx.loader.entries()].filter(entry => names.has(entry.options.name.replace(/\/client(?:-standard)?$/u, '')))
        for (const entry of entries) {
          if (entry.disabled !== !state.applied) await entry.update({ disabled: !state.applied })
        }
        synchronizedGeneration = state.generation
      }
      const store = {
        subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
        snapshot: () => value,
        refresh: async () => {
          if (inFlight || disposed) return inFlight
          inFlight = (async () => {
            try {
              const state = await request()
              if (disposed) return
              await reconcile(state)
              publish({ state, error: state.error })
            } catch (error) { if (!disposed) publish({ error }) }
            finally { inFlight = undefined }
          })()
          return inFlight
        },
        set: async enabled => {
          if (value.saving) return
          await inFlight
          publish({ saving: true, error: undefined })
          try {
            const state = await request(enabled)
            if (!disposed) publish({ state, error: state.error })
          } catch (error) { if (!disposed) publish({ error }) }
          finally {
            if (!disposed) { publish({ saving: false }); await store.refresh() }
          }
        }
      }
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.pluginCss = 'dsh-desktop-office-controls'
        style.textContent = css
        document.head.appendChild(style)
        const timer = setInterval(() => void store.refresh(), 1000)
        void store.refresh()
        return () => { disposed = true; clearInterval(timer); style.remove(); listeners.clear() }
      }, 'Office controls: live state and client lifecycle')
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'Office controls: translations')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab', id: 'desktop-office', order: 10,
        label: () => t('tab'), inject: () => ({ store, t })
      }, OfficeTab))
    }
    return { apply, inject: ['slots', 'locale', 'loader', 'modules'] }
  }
})
