window.__ModuleLoader__.load({ id: 'dsh-desktop-office', factory: require => {
  const React = require('react'), h = React.createElement
  const NS = 'desktop-office', EVENT = 'dsh-office-mode-change', staged = '@staged'
  const zh = { templates: '选择案例', preview: '查看案例', use: '做同款', close: '关闭预览', previous: '上一页', next: '下一页',
    select: '选用案例', loading: '正在加载…', retry: '重新加载', remove: '取消选择案例', selected: '已选案例', all: '全部',
    page: '第 {page} 页，共 {total} 页', expired: '案例已更新，请重新选择', common: '常用办公', other: '专业案例', empty: '该分类下暂无案例', zoom: '放大阅读', fit: '适合页面' }
  const en = { templates: 'Choose an example', preview: 'Preview example', use: 'Use this example', close: 'Close preview', previous: 'Previous page', next: 'Next page',
    select: 'Select example', loading: 'Loading…', retry: 'Retry', remove: 'Remove example', selected: 'Selected example', all: 'All',
    page: 'Page {page} of {total}', expired: 'This example was updated. Choose it again.', common: 'Everyday work', other: 'Specialist examples', empty: 'No examples in this category', zoom: 'Zoom to read', fit: 'Fit page' }
  const empty = Object.freeze({ templates: [], mode: null, selectedTemplateId: null, loaded: false, loading: false, busy: false, error: '' })
  const keyOf = id => id || staged
  const announce = (sessionId, mode) => window.dispatchEvent(new CustomEvent(EVENT, { detail: { sessionId, mode, origin: 'office' } }))

  class OfficeStore {
    constructor(connection) { this.connection = connection; this.states = new Map(); this.listeners = new Map(); this.revisions = new Map(); this.requests = new Map(); this.adopted = new Set() }
    snapshot(id) { return this.states.get(keyOf(id)) ?? empty }
    subscribe(id, listener) { const key = keyOf(id); const set = this.listeners.get(key) ?? new Set(); set.add(listener); this.listeners.set(key, set); return () => { set.delete(listener); if (!set.size) this.listeners.delete(key) } }
    update(id, change) { const key = keyOf(id); this.states.set(key, { ...this.snapshot(id), ...change }); for (const listener of this.listeners.get(key) ?? []) listener() }
    bump(id) { const key = keyOf(id), value = (this.revisions.get(key) ?? 0) + 1; this.revisions.set(key, value); return value }
    async call(id, endpoint, payload = {}, signal) {
      const timeout = AbortSignal.timeout(10_000)
      const combined = signal ? AbortSignal.any([timeout, signal]) : timeout
      const result = await this.connection.rpc.call('/api', 'office-templates', { endpoint, ...(id ? { sessionId: id } : {}), ...payload }, combined)
      combined.throwIfAborted()
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }
    async load(id, force = false) {
      const key = keyOf(id)
      if (this.requests.has(key) || this.snapshot(id).busy || (!force && this.snapshot(id).loaded && !this.snapshot(id).error)) return
      const revision = this.bump(id), controller = new AbortController()
      this.requests.set(key, controller); this.update(id, { loading: true, error: '' })
      try {
        let state = await this.call(id, 'state', {}, controller.signal)
        if (this.revisions.get(key) !== revision) return
        const local = this.snapshot(), selected = local.selectedTemplateId
        if (id && !this.adopted.has(id) && local.engaged && local.mode && !state.mode && !state.presentationMode) {
          state = await this.call(id, 'mode', { mode: local.mode }, controller.signal)
          if (selected) state = await this.call(id, 'select', { templateId: selected, revision: local.templates.find(item => item.id === selected)?.revision }, controller.signal)
          if (this.revisions.get(key) !== revision) return
          announce(id, state.mode)
        }
        if (id) { this.adopted.add(id); if (local.engaged) { this.bump(); this.update(undefined, { mode: null, selectedTemplateId: null, engaged: false }) } }
        this.update(id, { ...state, ...(!id && this.snapshot(id).engaged ? { mode: this.snapshot(id).mode, selectedTemplateId: this.snapshot(id).selectedTemplateId } : {}), loaded: true, loading: false, error: '' })
      } catch (error) {
        if (this.revisions.get(key) === revision) this.update(id, { loading: false, error: error.message })
      } finally { if (this.requests.get(key) === controller) this.requests.delete(key) }
    }
    async mutate(id, endpoint, payload) {
      if (this.snapshot(id).busy || this.snapshot(id).loading) return false
      const revision = this.bump(id), key = keyOf(id)
      if (!id) {
        this.update(id, endpoint === 'mode' ? { mode: payload.mode, selectedTemplateId: null, engaged: true, error: '' }
          : { selectedTemplateId: endpoint === 'select' ? payload.templateId : null, engaged: true, error: '' })
        announce(id, this.snapshot(id).mode); return true
      }
      this.update(id, { busy: true, error: '' })
      try {
        const state = await this.call(id, endpoint, payload)
        if (this.revisions.get(key) !== revision) return false
        this.update(id, { ...state, loaded: true, busy: false, error: '' }); announce(id, state.mode); return true
      } catch (error) { if (this.revisions.get(key) === revision) this.update(id, { busy: false, error: error.message }); return false }
    }
    syncPpt(detail) {
      if (detail.origin !== 'ppt') return
      const id = detail.sessionId
      this.requests.get(keyOf(id))?.abort(); this.requests.delete(keyOf(id))
      this.bump(id); this.update(id, { mode: null, selectedTemplateId: null, engaged: false, busy: false, loading: false, error: '' })
      void this.load(id, true)
    }
    reset() { for (const request of this.requests.values()) request.abort(); this.requests.clear(); for (const key of this.states.keys()) { this.bump(key); this.update(key, { loaded: false, loading: false, busy: false }); void this.load(key === staged ? undefined : key, true) } }
    dispose() { for (const request of this.requests.values()) request.abort(); this.requests.clear(); this.listeners.clear() }
  }
  function useOffice(store, sessionId) {
    const state = React.useSyncExternalStore(listener => store.subscribe(sessionId, listener), () => store.snapshot(sessionId), () => store.snapshot(sessionId))
    React.useEffect(() => { void store.load(sessionId) }, [store, sessionId])
    return state
  }
  const titleOf = (item, t) => t('common') === en.common ? item.titleEn ?? item.title : item.title

  function Thumbnail({ item }) {
    const ratio = item.pageAspectRatios[0]
    return h('span', { className: 'dso-thumbnail', style: { aspectRatio: ratio < 1 ? ratio * 2 : ratio } },
      h('img', { src: item.thumbnail, alt: '', loading: 'lazy', draggable: false }))
  }

  function TemplateCard({ item, selected, busy, t, choose, preview }) {
    return h('article', { className: 'dso-card', 'data-office-template': item.id, 'data-selected': selected },
      h('button', { type: 'button', className: 'dso-card-select', disabled: busy, 'aria-pressed': selected,
        'aria-label': `${t('select')} ${titleOf(item, t)}`, onClick: () => choose(item) },
        h('span', { className: 'dso-cover', 'data-mode': item.mode }, h(Thumbnail, { item })),
        h('strong', null, titleOf(item, t)), h('small', null, item.category === '常用办公' ? t('common') : t('other'))),
      h('button', { type: 'button', className: 'dso-card-preview', disabled: busy, 'aria-label': `${t('preview')} ${titleOf(item, t)}`, onClick: () => preview(item) },
        h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
          h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }), h('circle', { cx: 12, cy: 12, r: 3 }))))
  }

  // Share the existing Composer seat geometry used by the PPT chooser.
  function useDockGeometry(root, panel, visible) {
    React.useLayoutEffect(() => {
      if (!visible || !root.current || !panel.current) return
      const element = root.current, body = element.closest('[data-conversation-scroll]')
      const card = element.closest('[data-composer-seat]')?.querySelector('[data-composer-card]')
      if (!body || !card) return
      const sync = () => {
        const bodyRect = body.getBoundingClientRect(), cardRect = card.getBoundingClientRect()
        element.style.setProperty('--dso-dock-width', `${Math.min(cardRect.width, bodyRect.width)}px`)
        element.style.setProperty('--dso-dock-height', `${Math.max(200, Math.floor(bodyRect.bottom - panel.current.getBoundingClientRect().top - 12))}px`)
      }
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null
      observer?.observe(body); observer?.observe(card)
      window.addEventListener('resize', sync)
      const frame = window.requestAnimationFrame(sync)
      return () => {
        window.cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', sync)
        element.style.removeProperty('--dso-dock-width'); element.style.removeProperty('--dso-dock-height')
      }
    }, [root, panel, visible])
  }

  function Preview({ item, store, sessionId, t, choose, close, busy, actionError }) {
    const dialog = React.useRef(), stage = React.useRef(), opener = React.useRef(document.activeElement), active = React.useRef(true)
    const [page, setPage] = React.useState(1), [preview, setPreview] = React.useState(null), [error, setError] = React.useState(''), [retry, setRetry] = React.useState(0)
    const [zoom, setZoom] = React.useState(false)
    React.useEffect(() => { if (stage.current) stage.current.scrollTop = 0 }, [page, zoom])
    React.useEffect(() => { active.current = true; const element = dialog.current; element.showModal(); return () => { active.current = false; element.close(); if (opener.current?.isConnected) opener.current.focus() } }, [])
    React.useEffect(() => {
      const controller = new AbortController(); setPreview(null); setError('')
      store.call(sessionId, 'preview', { templateId: item.id, revision: item.revision, page }, controller.signal).then(value => { if (!controller.signal.aborted) setPreview(value) }, error => { if (!controller.signal.aborted) setError(error.message) })
      return () => controller.abort()
    }, [store, sessionId, item.id, item.revision, page, retry])
    const move = value => setPage(Math.min(item.pages, Math.max(1, value)))
    const pageLabel = t('page').replace('{page}', page).replace('{total}', item.pages)
    return h('dialog', { ref: dialog, className: 'dso-modal', 'aria-modal': true, 'aria-label': titleOf(item, t), onCancel: event => { event.preventDefault(); if (!busy) close() },
      onClick: event => { if (event.target === dialog.current && !busy) close() }, onKeyDown: event => {
        if (event.target.tagName === 'SELECT' || busy) return
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); move(event.key === 'Home' ? 1 : event.key === 'End' ? item.pages : page + (event.key === 'ArrowRight' ? 1 : -1)) }
      } },
      h('header', null, h('strong', null, titleOf(item, t)), h('span', { className: 'dso-preview-actions' },
        h('button', { type: 'button', 'aria-pressed': zoom, onClick: () => setZoom(value => !value) }, t(zoom ? 'fit' : 'zoom')),
        h('button', { type: 'button', onClick: close, disabled: busy, 'aria-label': t('close') }, '×'))),
      item.sheets?.length ? h('nav', { className: 'dso-sheets', 'aria-label': 'Excel' }, item.sheets.map(sheet => h('button', { key: sheet.name, type: 'button', 'aria-pressed': sheet.pages.includes(page), onClick: () => move(sheet.pages[0]) }, sheet.name))) : null,
      h('div', { ref: stage, className: 'dso-page', 'data-zoom': zoom, 'aria-busy': !preview && !error }, preview ? h('img', { src: preview.image, alt: `${titleOf(item, t)} · ${pageLabel}`, draggable: false }) : error ? h('div', { role: 'alert' }, error, h('button', { type: 'button', onClick: () => setRetry(value => value + 1) }, t('retry'))) : h('span', { role: 'status' }, t('loading'))),
      actionError ? h('p', { role: 'alert' }, actionError) : null,
      h('footer', null, h('button', { type: 'button', disabled: page === 1, onClick: () => move(page - 1), 'aria-label': t('previous') }, '‹'),
        h('span', { role: 'status', 'aria-live': 'polite' }, pageLabel), h('button', { type: 'button', disabled: page === item.pages, onClick: () => move(page + 1), 'aria-label': t('next') }, '›'),
        choose ? h('button', { type: 'button', className: 'dso-use', disabled: busy || !!error || !preview, onClick: async () => { if (await choose(item) && active.current) close() } }, busy ? t('loading') : t('use')) : null))
  }

  function ModeActions({ store, sessionId, t }) {
    const state = useOffice(store, sessionId)
    return h('div', { className: 'dso-actions' }, ['word', 'excel'].map(mode => h('button', { key: mode, type: 'button', 'data-office-mode': mode,
      'aria-pressed': state.mode === mode, disabled: state.loading || state.busy, onClick: () => store.mutate(sessionId, 'mode', { mode: state.mode === mode ? null : mode }) }, mode === 'word' ? 'Word' : 'Excel')),
      state.error ? h('span', { role: 'alert' }, state.error, h('button', { type: 'button', onClick: () => store.load(sessionId, true) }, t('retry'))) : null)
  }
  function Dock({ store, sessionId, session, t }) {
    const state = useOffice(store, sessionId), [opened, setOpened] = React.useState(null), [category, setCategory] = React.useState('all')
    const root = React.useRef(), panel = React.useRef(), visible = !!state.mode && (session == null || session.blank === true)
    useDockGeometry(root, panel, visible)
    React.useEffect(() => { setOpened(null); setCategory('all') }, [sessionId, state.mode])
    React.useEffect(() => { if (opened && state.templates.find(item => item.id === opened.id)?.revision !== opened.revision) setOpened(null) }, [state.templates, opened])
    if (!visible) return null
    const items = state.templates.filter(item => item.mode === state.mode && (category === 'all' || (item.category === '常用办公') === (category === 'common')))
    return h('div', { ref: root, className: 'dso-dock-root' }, h('section', { ref: panel, className: 'dso-dock', 'data-office-dock': state.mode, 'aria-label': t('templates') },
      h('div', { className: 'dso-toolbar' }, h('strong', null, t('templates')), h('nav', null, ['all', 'common', 'other'].map(value => h('button', { key: value, type: 'button', 'aria-pressed': category === value, onClick: () => setCategory(value) }, t(value))))),
      h('div', { className: 'dso-viewport', 'data-native-wheel-owner': '' },
      state.error ? h('div', { role: 'alert' }, state.error, h('button', { type: 'button', onClick: () => store.load(sessionId, true) }, t('retry'))) : null,
      state.selectionExpired ? h('p', { role: 'status' }, t('expired')) : null,
      state.loading ? h('p', { role: 'status' }, t('loading')) : !items.length ? h('p', { role: 'status' }, t('empty')) : null,
      h('div', { className: 'dso-grid' }, items.map(item => h(TemplateCard, { key: item.id, item, t, selected: state.selectedTemplateId === item.id,
        busy: state.busy || state.loading, preview: setOpened, choose: item => store.mutate(sessionId, 'select', { templateId: item.id, revision: item.revision }) })))),
      opened ? h(Preview, { key: `${sessionId}:${opened.id}`, item: opened, store, sessionId, t, close: () => setOpened(null), busy: state.busy, actionError: state.error,
        choose: item => store.mutate(sessionId, 'select', { templateId: item.id, revision: item.revision }) }) : null))
  }
  function Accessory({ store, sessionId, t }) {
    const state = useOffice(store, sessionId), [opened, setOpened] = React.useState(false)
    React.useEffect(() => setOpened(false), [sessionId, state.selectedTemplateId])
    const item = state.templates.find(item => item.id === state.selectedTemplateId && item.mode === state.mode)
    if (!item) return null
    return h('div', { className: 'dso-selected', 'data-office-selected': item.id },
      h('button', { type: 'button', className: 'dso-selected-preview', 'aria-label': `${t('preview')} ${titleOf(item, t)}`, onClick: () => setOpened(true) }, h(Thumbnail, { item })),
      h('button', { type: 'button', disabled: state.busy, 'aria-label': t('remove'), onClick: () => store.mutate(sessionId, 'deselect', {}) }, '×'),
      opened ? h(Preview, { item, store, sessionId, t, close: () => setOpened(false), busy: state.busy }) : null)
  }
  const css = `
.dso-preview-actions{display:flex;gap:8px;align-items:center}.dso-page[data-zoom=true]{display:block;overflow:auto}.dso-page[data-zoom=true]>img{display:block;width:100%;height:auto;min-height:auto}
.dso-actions{display:flex;gap:8px;align-items:center}.dso-actions>button{font:inherit;font-size:12px;border-radius:999px;padding:7px 13px;background:transparent;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);color:var(--dsw-alias-label-secondary);cursor:pointer}.dso-actions>button[aria-pressed=true]{color:var(--dsw-alias-state-business-primary);border-color:currentColor;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent)}
.dso-dock-root{box-sizing:border-box;position:relative;width:100%;height:0;padding:0 var(--dsh-composer-side-clearance);overflow:visible}.dso-dock{box-sizing:border-box;position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;width:var(--dso-dock-width,var(--dsh-composer-card-max-width,100%));max-width:calc(100vw - 32px);height:var(--dso-dock-height,calc(100dvh - 178px));margin-top:8px;color:var(--dsw-alias-label-primary);font-size:12px}.dso-viewport{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:4px 4px 12px;scrollbar-width:none}.dso-viewport::-webkit-scrollbar{display:none}.dso-toolbar,.dso-sheets{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px;flex:none}.dso-toolbar{min-height:38px;padding-inline:4px}.dso-toolbar nav,.dso-sheets{display:flex;overflow:auto;gap:4px}.dso-toolbar button,.dso-sheets button{font:inherit;border:0;border-radius:999px;padding:5px 10px;color:var(--dsw-alias-label-secondary);background:transparent;cursor:pointer}.dso-toolbar button[aria-pressed=true],.dso-sheets button[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dso-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px}.dso-card{min-width:0;position:relative}.dso-card-select{font:inherit;display:flex;flex-direction:column;gap:5px;width:100%;padding:0;min-width:0;border:0;text-align:left;background:transparent;color:inherit;cursor:pointer}.dso-card-select:disabled{cursor:default;opacity:.65}.dso-cover{box-sizing:border-box;display:block;position:relative;width:100%;aspect-ratio:16/9;border:2px solid transparent;border-radius:12px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,var(--dsw-alias-bg-layer-1))}.dso-cover[data-mode=excel]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,var(--dsw-alias-bg-layer-1))}.dso-thumbnail{display:block;width:100%;border-radius:8px;overflow:hidden}.dso-thumbnail img{display:block;width:100%;height:auto}.dso-cover>.dso-thumbnail{position:absolute;left:13%;top:14%;width:74%;box-shadow:0 2px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);transform-origin:center top;transition:transform 180ms cubic-bezier(.23,1,.32,1)}.dso-cover[data-mode=excel]>.dso-thumbnail{left:8%;width:84%}.dso-card[data-selected=true] .dso-cover{border-color:var(--dsw-alias-state-business-primary)}.dso-card strong{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.dso-card small{font-size:10px;color:var(--dsw-alias-label-tertiary)}.dso-card-preview{position:absolute;right:10px;top:10px;z-index:1;display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity 120ms ease}.dso-card:hover .dso-card-preview,.dso-card:focus-within .dso-card-preview{opacity:1}.dso-card-preview:disabled{cursor:default}.dso-card-select:active:not(:focus-visible) .dso-thumbnail{transform:scale(.98)}
@media(hover:hover) and (pointer:fine){.dso-card:has(.dso-card-select:enabled):hover .dso-thumbnail{transform:translateY(-3px) scale(1.045)}}@media(hover:none){.dso-card-preview{opacity:1}}@media(prefers-reduced-motion:reduce){.dso-cover>.dso-thumbnail,.dso-card-preview{transition:none}.dso-card:has(.dso-card-select:enabled):hover .dso-thumbnail,.dso-card-select:active:not(:focus-visible) .dso-thumbnail{transform:none}}
.dso-modal{box-sizing:border-box;width:min(1100px,94vw);height:min(860px,92dvh);max-width:94vw;max-height:92dvh;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:16px;padding:16px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.dso-modal[open]{display:flex;flex-direction:column;gap:12px}.dso-modal::backdrop{background:color-mix(in srgb,var(--dsw-alias-label-primary) 35%,transparent)}.dso-modal header,.dso-modal footer{display:flex;align-items:center;gap:12px;flex:none}.dso-modal header{justify-content:space-between}.dso-modal button{font:inherit;font-size:12px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:8px;padding:6px 12px;background:var(--dsw-alias-interactive-bg-hover);color:inherit;cursor:pointer}.dso-modal button:disabled{opacity:.45;cursor:default}.dso-page{display:flex;justify-content:center;align-items:center;flex:1;min-height:0;min-width:0;overflow:hidden;background:var(--dsw-alias-bg-layer-2);border-radius:8px}.dso-page>img{width:100%;height:100%;object-fit:contain;min-height:0}.dso-modal .dso-use{margin-left:auto;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground)}
.dso-selected{display:flex;gap:4px;align-items:flex-start;font-size:12px}.dso-selected button{font:inherit;color:var(--dsw-alias-label-secondary);background:transparent;border:0;cursor:pointer}.dso-selected-preview{display:block;padding:0}.dso-selected .dso-thumbnail{width:112px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:6px}.dso-actions button:focus-visible,.dso-card-select:focus-visible,.dso-card-preview:focus-visible,.dso-modal button:focus-visible,.dso-selected button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:3px}@media(max-width:540px){.dso-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dso-modal{padding:10px}.dso-modal footer{gap:6px}.dso-toolbar{flex-wrap:wrap}}`
  function apply(ctx) {
    const store = new OfficeStore(ctx.get('connection'))
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'Office dictionaries')
    ctx.effect(() => { if (document.querySelector('style[data-plugin-css="desktop-office/styles"]')) return; const tag = document.createElement('style'); tag.dataset.plugin = NS; tag.dataset.pluginCss = 'desktop-office/styles'; tag.textContent = css; document.head.append(tag); return () => tag.remove() }, 'Office styles')
    ctx.effect(() => { const listener = event => store.syncPpt(event.detail ?? {}); window.addEventListener(EVENT, listener); return () => { window.removeEventListener(EVENT, listener); store.dispose() } }, 'Office mode synchronization')
    ctx.on('connection/reset', () => store.reset())
    for (const [seat, component] of [['conversation.hero.modeActions', ModeActions], ['conversation.input.accessory', Accessory], ['conversation.hero.dock', Dock], ['conversation.composer.dock', Dock]]) {
      ctx.slots.inject(seat, () => ctx.slots.register({ name: seat, id: NS, order: 10, locale: NS, inject: () => ({ store }) }, component))
    }
  }
  return { apply, inject: ['slots', 'locale', 'connection'] }
} })
