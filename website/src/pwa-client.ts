interface InstallPrompt extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function standalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = className
  element.textContent = label
  return element
}

function start(): void {
  const header = document.querySelector('.header-inner')
  const main = document.querySelector('main')
  const install = button('Install', 'btn btn-outline btn-sm docs-install')
  install.hidden = true
  install.setAttribute('aria-label', 'Install Gambrel documentation')
  header?.append(install)
  const footer = document.createElement('footer')
  footer.className = 'docs-app-footer'
  const connection = document.createElement('span')
  connection.className = 'docs-connection'
  connection.setAttribute('role', 'status')
  const helpButton = button('Install on your device', 'docs-text-button')
  helpButton.hidden = standalone()
  const help = document.createElement('dialog')
  help.className = 'docs-install-help'
  help.setAttribute('aria-labelledby', 'docs-install-title')
  help.innerHTML = `<div class="docs-help-content">
<h2 id="docs-install-title">Keep the documentation close</h2>
<p>Install Gambrel to open it in its own window. Saved guides and the icon catalog can be read offline.</p>
<dl>
<dt>Chrome or Edge</dt><dd>Use Install in the address bar or browser menu when available.</dd>
<dt>iPhone or iPad</dt><dd>Open the Share menu and choose Add to Home Screen.</dd>
<dt>Safari on Mac</dt><dd>Use File → Add to Dock when supported.</dd>
</dl>
<p class="docs-help-note">Installation options depend on the browser. You can always use the website normally.</p>
</div>`
  const closeHelp = button('Close', 'btn btn-outline')
  help.querySelector('.docs-help-content')?.append(closeHelp)
  closeHelp.addEventListener('click', () => help.close())
  helpButton.addEventListener('click', () => help.showModal())
  footer.append(connection, helpButton)
  if (main !== null) main.after(footer)
  else document.body.append(footer)
  document.body.append(help)
  const notice = document.createElement('aside')
  notice.className = 'docs-update'
  notice.hidden = true
  notice.setAttribute('aria-label', 'Documentation update')
  const text = document.createElement('span')
  text.textContent = 'An updated version of the docs is ready.'
  const reload = button('Reload', 'btn btn-primary btn-sm')
  const later = button('Later', 'docs-text-button')
  const feedback = document.createElement('span')
  feedback.className = 'docs-update-feedback'
  feedback.setAttribute('role', 'status')
  notice.append(text, reload, later, feedback)
  document.body.append(notice)
  let deferred: InstallPrompt | undefined
  let registration: ServiceWorkerRegistration | undefined
  let requesting = false
  let dismissed = false
  const hadController = 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null
  const updateConnection = (): void => {
    connection.textContent = navigator.onLine ? '' : 'Offline'
    connection.hidden = navigator.onLine
  }
  updateConnection()
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPrompt
    install.hidden = standalone()
  })
  window.addEventListener('appinstalled', () => {
    deferred = undefined
    install.hidden = true
    helpButton.hidden = true
  })
  matchMedia('(display-mode: standalone)').addEventListener('change', () => {
    if (standalone()) {
      install.hidden = true
      helpButton.hidden = true
    }
  })
  install.addEventListener('click', () => {
    void (async () => {
      const prompt = deferred
      if (prompt === undefined || requesting) return
      requesting = true
      install.disabled = true
      try {
        deferred = undefined
        await prompt.prompt()
        await prompt.userChoice
        install.hidden = true
      } catch {
        install.hidden = true
        helpButton.hidden = false
      } finally {
        requesting = false
        install.disabled = false
      }
    })()
  })
  later.addEventListener('click', () => {
    dismissed = true
    notice.hidden = true
  })
  reload.addEventListener('click', () => {
    const waiting = registration?.waiting
    if (waiting === null || waiting === undefined) return
    reload.disabled = true
    feedback.textContent = 'Reloading…'
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
  })
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    helpButton.hidden = true
    return
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload()
  })
  const root = new URL('./', document.baseURI)
  void navigator.serviceWorker.register(new URL('sw.js', root), {
    scope: root.pathname,
    updateViaCache: 'none'
  }).then((registered) => {
    registration = registered
    const showUpdate = (): void => {
      if (registered.waiting !== null && !dismissed) notice.hidden = false
    }
    showUpdate()
    registered.addEventListener('updatefound', () => {
      const worker = registered.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') showUpdate()
      })
    })
    let lastCheck = Date.now()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastCheck > 60 * 60 * 1000) {
        lastCheck = Date.now()
        void registered.update().catch(() => undefined)
      }
    })
  }).catch((error: unknown) => {
    console.error('[gambrel-docs] offline registration failed', error)
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()