interface InstallPrompt extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function installed(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

async function initialize(): Promise<void> {
  const dock = document.createElement('aside')
  dock.className = 'pwa-dock'
  dock.setAttribute('aria-label', 'Documentation app')
  const install = document.createElement('button')
  install.type = 'button'
  install.className = 'btn btn-outline btn-sm'
  install.textContent = 'Install docs'
  install.hidden = installed()
  const update = document.createElement('button')
  update.type = 'button'
  update.className = 'btn btn-primary btn-sm'
  update.textContent = 'Update available'
  update.hidden = true
  const status = document.createElement('span')
  status.className = 'pwa-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const help = document.createElement('dialog')
  help.className = 'pwa-help'
  help.setAttribute('aria-labelledby', 'pwa-help-title')
  help.innerHTML = `<div class="dialog-card">
<h2 id="pwa-help-title">Install Gambrel documentation</h2>
<p>Use your browser's Install app action when available.</p>
<p>On iPhone or iPad, use Share → Add to Home Screen.
On supported Safari versions for Mac, use File → Add to Dock.</p>
<p>Installation options depend on your browser. The website also works without installation.</p>
<button type="button" class="btn btn-outline">Close</button>
</div>`
  help.querySelector('button')?.addEventListener('click', () => help.close())
  dock.append(install, update, status)
  document.body.append(dock, help)
  let prompt: InstallPrompt | undefined
  let registration: ServiceWorkerRegistration | undefined
  let updateRequested = false
  const connection = (): void => {
    status.textContent = navigator.onLine ? '' : 'Offline'
    dock.classList.toggle('is-offline', !navigator.onLine)
  }
  connection()
  window.addEventListener('online', connection)
  window.addEventListener('offline', connection)
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    prompt = event as InstallPrompt
    install.hidden = installed()
  })
  window.addEventListener('appinstalled', () => {
    install.hidden = true
    prompt = undefined
  })
  install.addEventListener('click', () => {
    void (async () => {
      if (prompt === undefined) {
        help.showModal()
        return
      }
      const available = prompt
      prompt = undefined
      await available.prompt()
      const choice = await available.userChoice
      if (choice.outcome === 'accepted') install.hidden = true
    })().catch(() => {
      status.textContent = 'Installation could not be opened.'
    })
  })
  update.addEventListener('click', () => {
    const waiting = registration?.waiting
    if (waiting === undefined || waiting === null) return
    updateRequested = true
    update.disabled = true
    update.textContent = 'Updating…'
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
  })
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) location.reload()
  })
  const root = new URL('./', document.baseURI)
  registration = await navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname, updateViaCache: 'none' })
  const showWaiting = (): void => {
    update.hidden = registration?.waiting == null
  }
  showWaiting()
  registration.addEventListener('updatefound', () => {
    const worker = registration?.installing
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') showWaiting()
    })
  })
  await navigator.serviceWorker.ready
  if (navigator.onLine) status.textContent = 'Available offline'
  window.addEventListener('pageshow', () => {
    void registration?.update().catch(() => undefined)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initialize().catch(reportFailure)
  }, { once: true })
} else {
  void initialize().catch(reportFailure)
}

function reportFailure(error: unknown): void {
  console.error('[gambrel-docs] app setup failed', error)
  const status = document.querySelector('.pwa-status')
  if (status !== null) status.textContent = 'Offline setup unavailable'
}