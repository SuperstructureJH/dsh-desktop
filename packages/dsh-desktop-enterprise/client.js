window.__ModuleLoader__.load({
  id: 'dsh-desktop-enterprise',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { createElement: h, useCallback, useEffect, useState } = React
    const zh = navigator.language.toLowerCase().startsWith('zh')
    const copy = zh ? {
      nav: '账号与企业', title: '企业账号', lead: '登录毕昇企业账号，使用当前账号获准调用的模型。',
      platform: '毕昇平台地址', platformHint: '填写管理员提供的 HTTPS 地址，不要带 /api 或其他路径。',
      login: '在浏览器中登录', loggingIn: '等待浏览器授权…', connected: '已连接', disconnected: '未连接企业账号',
      refresh: '刷新模型与用量', logout: '退出登录', models: '可用模型', noModels: '当前账号没有可用模型。',
      modelsUnavailable: '模型权限读取失败，企业模型已暂停。', usage: '本月用量', usageUnavailable: '用量暂不可用',
      sessionExpires: '会话到期', manualTitle: '粘贴一次性授权码', manualHint: '仅用于当前浏览器登录未能回传的情况。',
      ticket: '一次性授权码', submitTicket: '完成登录', secureUnavailable: '系统安全存储不可用，企业登录已停用。',
      confirmTitle: '确认毕昇平台', confirmLead: '确认后会停用当前企业模型连接，并在该平台新建一次 PKCE 登录。',
      confirm: '确认并登录', cancel: '取消', requestId: '请求 ID'
    } : {
      nav: 'Account & Enterprise', title: 'Enterprise account', lead: 'Sign in to BiSheng and use the models assigned to this account.',
      platform: 'BiSheng platform URL', platformHint: 'Enter the HTTPS origin supplied by your administrator, without /api or another path.',
      login: 'Sign in in browser', loggingIn: 'Waiting for browser authorization…', connected: 'Connected', disconnected: 'No enterprise account connected',
      refresh: 'Refresh models and usage', logout: 'Sign out', models: 'Available models', noModels: 'No models are assigned to this account.',
      modelsUnavailable: 'Model access could not be verified. Enterprise models are paused.', usage: 'Monthly usage', usageUnavailable: 'Usage unavailable',
      sessionExpires: 'Session expires', manualTitle: 'Paste one-time ticket', manualHint: 'Use only when the active browser login could not return to Desktop.',
      ticket: 'One-time ticket', submitTicket: 'Complete sign-in', secureUnavailable: 'Operating-system secure storage is unavailable. Enterprise sign-in is disabled.',
      confirmTitle: 'Confirm BiSheng platform', confirmLead: 'Continuing pauses the current enterprise connection and starts a new PKCE login at this platform.',
      confirm: 'Confirm and sign in', cancel: 'Cancel', requestId: 'Request ID'
    }

    function installStyles() {
      if (document.getElementById('dsh-desktop-enterprise-style')) return
      const style = document.createElement('style')
      style.id = 'dsh-desktop-enterprise-style'
      style.textContent = `
        .dshEnterprise{max-width:780px;color:var(--ds-text-primary,#202124)}
        .dshEnterprise h2{margin:0 0 8px;font-size:22px}.dshEnterprise h3{margin:0 0 8px;font-size:15px}
        .dshEnterpriseLead,.dshEnterpriseHint{color:var(--ds-text-secondary,#6d7178);line-height:1.55}
        .dshEnterpriseCard{margin-top:18px;padding:18px;border:1px solid var(--ds-border,#dfe1e5);border-radius:14px;background:var(--ds-bg-elevated,#fff)}
        .dshEnterpriseRow{display:flex;align-items:center;justify-content:space-between;gap:16px}.dshEnterpriseStack{display:grid;gap:10px}
        .dshEnterpriseLabel{display:grid;gap:7px;font-size:13px;font-weight:650}.dshEnterpriseInput{box-sizing:border-box;width:100%;height:38px;padding:0 11px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:transparent;font:inherit}
        .dshEnterpriseActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.dshEnterpriseButton{min-height:36px;padding:7px 13px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:var(--ds-bg-primary,#fff);cursor:pointer;font:inherit;font-weight:650}.dshEnterpriseButton.primary{border-color:#2468f2;color:#fff;background:#2468f2}.dshEnterpriseButton.danger{color:#b42318}.dshEnterpriseButton:disabled{opacity:.5;cursor:default}
        .dshEnterpriseStatus{display:inline-flex;align-items:center;gap:7px;font-weight:700}.dshEnterpriseDot{width:8px;height:8px;border-radius:50%;background:#98a0aa}.dshEnterpriseDot.connected{background:#17a673}
        .dshEnterpriseMeta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}.dshEnterpriseMeta div{padding:11px;border-radius:10px;background:var(--ds-bg-secondary,#f5f6f8)}.dshEnterpriseMeta dt{margin-bottom:4px;color:var(--ds-text-secondary,#6d7178);font-size:12px}.dshEnterpriseMeta dd{margin:0;overflow-wrap:anywhere;font-size:14px}
        .dshEnterpriseModels{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 0;padding:0;list-style:none}.dshEnterpriseModels li{padding:5px 9px;border-radius:999px;background:var(--ds-bg-secondary,#f0f2f5);font-size:12px}.dshEnterpriseModels.paused{opacity:.5}
        .dshEnterpriseError{margin-top:12px;padding:10px 12px;border-radius:9px;color:#b42318;background:#fef3f2;font-size:13px;line-height:1.45}.dshEnterpriseConfirm{margin-top:18px;padding:18px;border:1px solid #8fb2ff;border-radius:14px;background:#edf4ff}.dshEnterpriseConfirm strong{display:block;margin:12px 0 4px;overflow-wrap:anywhere}
        @media(max-width:640px){.dshEnterpriseMeta{grid-template-columns:1fr}.dshEnterpriseRow{align-items:flex-start;flex-direction:column}}body[data-ds-dark-theme] .dshEnterprise{color:#f2f3f5}body[data-ds-dark-theme] .dshEnterpriseCard{background:#25262a;border-color:#45474f}body[data-ds-dark-theme] .dshEnterpriseInput,body[data-ds-dark-theme] .dshEnterpriseButton{color:#f2f3f5;background:#1f2024;border-color:#50535c}body[data-ds-dark-theme] .dshEnterpriseMeta div,body[data-ds-dark-theme] .dshEnterpriseModels li{background:#35373d}body[data-ds-dark-theme] .dshEnterpriseError{color:#ffb4ab;background:#421b1b}body[data-ds-dark-theme] .dshEnterpriseConfirm{background:#17294a;border-color:#4779d8}`
      document.head.appendChild(style)
    }

    async function api(path, body) {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${response.status})`)
      return payload
    }

    function usageText(usage) {
      if (!usage || usage.source === 'unavailable' || usage.quota_state === 'unavailable') return copy.usageUnavailable
      if (usage.limit === 0) return zh ? '额度为 0，模型调用已停用' : 'Limit is 0; model calls are disabled'
      if (usage.used === null || usage.limit === null) return copy.usageUnavailable
      return `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`
    }

    function EnterpriseSection() {
      const [state, setState] = useState(null)
      const [base, setBase] = useState('')
      const [ticket, setTicket] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [confirmation, setConfirmation] = useState(null)

      const refreshState = useCallback(async () => {
        const next = await api('/api/enterprise.state')
        setState(next)
        if (next.base) setBase(next.base)
        return next
      }, [])

      const inspectDeepLink = useCallback(async (url) => {
        setBusy(true); setError('')
        try { setConfirmation(await api('/api/enterprise.deep-link.inspect', { url })) }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setBusy(false) }
      }, [])

      useEffect(() => {
        refreshState().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
        const bridge = window.dshDesktopEnterprise
        if (!bridge?.onLoginLink) return undefined
        return bridge.onLoginLink((url) => { bridge.consumeLoginLink?.(); void inspectDeepLink(url) })
      }, [inspectDeepLink, refreshState])

      useEffect(() => {
        if (!['authorizing', 'refreshing'].includes(state?.phase)) return undefined
        const timer = window.setInterval(() => { refreshState().catch(() => {}) }, 1200)
        return () => window.clearInterval(timer)
      }, [state?.phase, refreshState])

      useEffect(() => {
        if (!state?.connected) return undefined
        const visible = () => {
          if (document.visibilityState !== 'visible') return
          api('/api/enterprise.refresh', {}).then(setState).catch(() => {})
        }
        const timer = window.setInterval(visible, 30_000)
        document.addEventListener('visibilitychange', visible)
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
      }, [state?.connected, refreshState])

      async function run(operation) {
        setBusy(true); setError('')
        try { await operation() }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setBusy(false) }
      }

      function openAuthorization(result) {
        window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer')
      }

      const connected = state?.connected === true
      const models = Array.isArray(state?.models) ? state.models : []
      const canPaste = state?.phase === 'authorizing' && state?.loginExpiresAt

      const status = h('div', { className: 'dshEnterpriseRow' },
        h('span', { className: 'dshEnterpriseStatus' },
          h('span', { className: `dshEnterpriseDot${connected ? ' connected' : ''}` }),
          connected ? `${copy.connected} · ${state.user?.display_name}` : copy.disconnected),
        connected ? h('span', { className: 'dshEnterpriseHint' }, state.tenant?.name) : null)

      const accountContent = connected
        ? h(React.Fragment, null,
          h('dl', { className: 'dshEnterpriseMeta' },
            h('div', null, h('dt', null, copy.platform), h('dd', null, state.base)),
            h('div', null, h('dt', null, copy.usage), h('dd', null, usageText(state.usage))),
            h('div', null, h('dt', null, copy.sessionExpires), h('dd', null, state.sessionExpiresAt || '—')),
            h('div', null, h('dt', null, copy.models), h('dd', null, state.modelsAvailable ? models.length : copy.modelsUnavailable))),
          h('h3', { style: { marginTop: 18 } }, copy.models),
          models.length
            ? h('ul', { className: `dshEnterpriseModels${state.modelsAvailable ? '' : ' paused'}` },
              ...models.map((model) => h('li', { key: model.id }, model.display_name)))
            : h('p', { className: 'dshEnterpriseHint' }, copy.noModels),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton', disabled: busy, onClick: () => run(async () => setState(await api('/api/enterprise.refresh', {}))) }, copy.refresh),
            h('button', { className: 'dshEnterpriseButton danger', disabled: busy, onClick: () => run(async () => { setState(await api('/api/enterprise.logout', {})); setBase('') }) }, copy.logout)))
        : h(React.Fragment, null,
          h('label', { className: 'dshEnterpriseLabel', style: { marginTop: 16 } }, copy.platform,
            h('input', { className: 'dshEnterpriseInput', type: 'url', inputMode: 'url', autoComplete: 'url', placeholder: 'https://bisheng.example.com', value: base, onChange: (event) => setBase(event.target.value) }),
            h('span', { className: 'dshEnterpriseHint' }, copy.platformHint)),
          state?.secureStorageAvailable === false
            ? h('p', { className: 'dshEnterpriseError' }, copy.secureUnavailable)
            : h('div', { className: 'dshEnterpriseActions' },
              h('button', { className: 'dshEnterpriseButton primary', disabled: busy || !base.trim(), onClick: () => run(async () => { const result = await api('/api/enterprise.login.start', { base }); openAuthorization(result); await refreshState() }) }, state?.phase === 'authorizing' ? copy.loggingIn : copy.login)))

      const failure = error || state?.error
      const errorPanel = failure
        ? h('p', { className: 'dshEnterpriseError', role: 'alert' }, failure,
          state?.requestId ? h('span', null, ` · ${copy.requestId}: ${state.requestId}`) : null)
        : null

      const manualPanel = canPaste
        ? h('div', { className: 'dshEnterpriseCard' },
          h('h3', null, copy.manualTitle),
          h('p', { className: 'dshEnterpriseHint' }, copy.manualHint),
          h('label', { className: 'dshEnterpriseLabel' }, copy.ticket,
            h('input', { className: 'dshEnterpriseInput', type: 'text', autoComplete: 'one-time-code', value: ticket, onChange: (event) => setTicket(event.target.value) })),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton', disabled: busy || !ticket.trim(), onClick: () => run(async () => { setState(await api('/api/enterprise.login.manual', { identityTicket: ticket.trim() })); setTicket('') }) }, copy.submitTicket)))
        : null

      const confirmationPanel = confirmation
        ? h('div', { className: 'dshEnterpriseConfirm', role: 'dialog', 'aria-modal': 'true' },
          h('h3', null, copy.confirmTitle),
          h('p', { className: 'dshEnterpriseHint' }, copy.confirmLead),
          h('strong', null, confirmation.base),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton primary', disabled: busy, onClick: () => run(async () => { const result = await api('/api/enterprise.deep-link.confirm', { base: confirmation.base }); setConfirmation(null); setBase(result.base); openAuthorization(result); await refreshState() }) }, copy.confirm),
            h('button', { className: 'dshEnterpriseButton', disabled: busy, onClick: () => setConfirmation(null) }, copy.cancel)))
        : null

      return h('section', { className: 'dshEnterprise' },
        h('h2', null, copy.title),
        h('p', { className: 'dshEnterpriseLead' }, copy.lead),
        h('div', { className: 'dshEnterpriseCard' }, status, accountContent, errorPanel),
        manualPanel,
        confirmationPanel)
    }

    const inject = ['slots']
    function apply(ctx) {
      installStyles()
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: 'enterprise-account', order: 15, label: () => copy.nav
      }, EnterpriseSection))
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
