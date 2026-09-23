// FitBot Landing Controller — Obsidian & Mint Emerald Theme

const navStatusBadge = document.getElementById('nav-status-badge');
const modalStatusBadge = document.getElementById('modal-status-badge');
const qrModal = document.getElementById('qr-modal');
const openQrNavBtn = document.getElementById('open-qr-nav-btn');
const openQrHeroBtn = document.getElementById('open-qr-hero-btn');
const closeQrModal = document.getElementById('close-qr-modal');
const qrContainer = document.getElementById('qr-container');
const modalInfoText = document.getElementById('modal-info-text');
const btnRefreshQr = document.getElementById('btn-refresh-qr');
const copyToast = document.getElementById('copy-toast');
const toastText = document.getElementById('toast-text');

let isModalOpen = false;

// Format status badge UI
function updateStatusUI(status, phone) {
  if (!navStatusBadge || !modalStatusBadge) return;
  const navDot = navStatusBadge.querySelector('.status-dot');
  const navText = navStatusBadge.querySelector('.status-text');
  const modalDot = modalStatusBadge.querySelector('.status-dot');
  const modalText = modalStatusBadge.querySelector('.modal-status-text');

  if (status === 'open') {
    navDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse status-dot';
    navText.textContent = '● En Línea';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-emerald-500/40 text-xs text-emerald-400 font-mono';

    modalDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse status-dot';
    modalText.textContent = `🟢 WhatsApp Conectado (${phone || 'Activo'})`;
    modalStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-base border border-emerald-500/40 text-xs font-mono text-emerald-400';
  } else if (status === 'qr_ready') {
    navDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse status-dot';
    navText.textContent = '🟡 Escanear QR';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-yellow-500/40 text-xs text-yellow-400 font-mono';

    modalDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse status-dot';
    modalText.textContent = '🟡 Esperando Escaneo QR';
    modalStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-base border border-yellow-500/40 text-xs font-mono text-yellow-400';
  } else if (status === 'connecting') {
    navDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse status-dot';
    navText.textContent = '⏳ Conectando...';
    modalText.textContent = '⏳ Conectando con WhatsApp...';
  } else {
    navDot.className = 'w-1.5 h-1.5 rounded-full bg-red-400 status-dot';
    navText.textContent = '🔴 Desconectado';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-red-500/40 text-xs text-red-400 font-mono';

    modalDot.className = 'w-1.5 h-1.5 rounded-full bg-red-400 status-dot';
    modalText.textContent = '🔴 Desconectado';
    modalStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-base border border-red-500/40 text-xs font-mono text-red-400';
  }
}

// Check server status via API
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      updateStatusUI(data.status, data.connectedPhone);
      if (isModalOpen) {
        renderModalContent(data);
      }
    }
  } catch (err) {
    updateStatusUI('close');
  }
}

// Fetch QR Code data and render inside modal
async function fetchAndRenderQr() {
  if (!qrContainer) return;
  qrContainer.innerHTML = `
    <div class="scan-line"></div>
    <div class="text-center text-xs text-text-muted font-mono flex flex-col items-center gap-2">
      <span class="material-symbols-outlined text-mint-emerald text-[28px] animate-spin">refresh</span>
      <span>Generando código QR...</span>
    </div>
  `;

  try {
    const res = await fetch('/api/qr');
    const data = await res.json();

    if (data.status === 'open') {
      qrContainer.innerHTML = `
        <div class="text-center p-4 flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-mint-emerald text-[48px]">check_circle</span>
          <h4 class="font-display font-bold text-sm text-text-primary">¡Bot Conectado y Listo!</h4>
          <p class="text-xs text-text-secondary">El chatbot está activo en WhatsApp y respondiendo consultas.</p>
        </div>
      `;
      if (modalInfoText) {
        modalInfoText.innerHTML = '🎉 El bot ya está conectado a WhatsApp. ¡Puedes escribirle ahora mismo al número oficial!';
      }
    } else if (data.qrImage) {
      qrContainer.innerHTML = `
        <div class="scan-line"></div>
        <img src="${data.qrImage}" alt="Escanear QR WhatsApp" class="w-full h-full object-contain rounded-lg shadow-md" />
      `;
      if (modalInfoText) {
        modalInfoText.innerHTML = 'Abre WhatsApp en tu celular ➡️ <strong>Dispositivos vinculados</strong> ➡️ <strong>Vincular un dispositivo</strong> y escanea el código en pantalla.';
      }
    } else {
      qrContainer.innerHTML = `
        <div class="text-center p-4 flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-yellow-400 text-[36px] animate-bounce">hourglass_top</span>
          <p class="text-xs font-mono text-text-primary">${data.message || 'Iniciando conexión...'}</p>
        </div>
      `;
    }
  } catch (err) {
    qrContainer.innerHTML = '<p class="text-xs text-red-400 font-mono">Error al consultar el código QR.</p>';
  }
}

function renderModalContent(statusData) {
  if (statusData.status === 'open') {
    qrContainer.innerHTML = `
      <div class="text-center p-4 flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-mint-emerald text-[48px]">check_circle</span>
        <h4 class="font-display font-bold text-sm text-text-primary">¡Bot Conectado y Listo!</h4>
        <p class="text-xs text-text-secondary">El chatbot está activo y respondiendo consultas.</p>
      </div>
    `;
    if (modalInfoText) {
      modalInfoText.innerHTML = '🎉 El bot ya está conectado a WhatsApp. ¡Puedes escribirle ahora mismo!';
    }
  } else if (statusData.lastQrRaw) {
    fetchAndRenderQr();
  }
}

// Modal Handlers
function openModal() {
  isModalOpen = true;
  qrModal?.classList.remove('hidden');
  qrModal?.classList.add('flex');
  fetchAndRenderQr();
}

function closeModal() {
  isModalOpen = false;
  qrModal?.classList.add('hidden');
  qrModal?.classList.remove('flex');
}

openQrNavBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  openModal();
});
openQrHeroBtn?.addEventListener('click', openModal);
closeQrModal?.addEventListener('click', closeModal);
btnRefreshQr?.addEventListener('click', fetchAndRenderQr);

qrModal?.addEventListener('click', (e) => {
  if (e.target === qrModal) closeModal();
});

// Interactive Conversational Playground Logic
(function initPlayground() {
  const buttons = document.querySelectorAll('.playground-btn');
  const tagEl = document.getElementById('preview-tag');
  const queryEl = document.getElementById('preview-query');
  const answerEl = document.getElementById('preview-answer');
  const cta1El = document.getElementById('preview-cta1');
  const cta2El = document.getElementById('preview-cta2');
  const highlightEl = document.getElementById('preview-highlight');

  function formatMarkdown(text) {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-mint-emerald font-semibold">$1</strong>');
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Toggle styles
      buttons.forEach((b) => {
        b.classList.remove('active', 'border-mint-emerald/40', 'border-mint-emerald');
        b.classList.add('border-border-subtle');
      });

      btn.classList.add('active', 'border-mint-emerald/40');
      btn.classList.remove('border-border-subtle');

      const tag = btn.getAttribute('data-tag');
      const query = btn.getAttribute('data-query');
      const answer = btn.getAttribute('data-answer');
      const cta1 = btn.getAttribute('data-cta1');
      const cta2 = btn.getAttribute('data-cta2');
      const highlight = btn.getAttribute('data-highlight');

      if (tagEl) tagEl.textContent = tag;
      if (queryEl) queryEl.textContent = query;
      if (answerEl) answerEl.innerHTML = formatMarkdown(answer);
      if (highlightEl) highlightEl.textContent = highlight;

      if (cta1El && cta1) {
        cta1El.innerHTML = `<span>${cta1}</span><span class="material-symbols-outlined text-[14px]">arrow_forward</span>`;
      }
      if (cta2El && cta2) {
        cta2El.innerHTML = `<span>${cta2}</span><span class="material-symbols-outlined text-[14px]">visibility</span>`;
      }

      showToast(`✓ Consulta cargada en la simulación`);
    });
  });

  if (answerEl) {
    answerEl.innerHTML = formatMarkdown(answerEl.textContent);
  }
})();

// Toast Notification
function showToast(msg) {
  if (!copyToast || !toastText) return;
  toastText.textContent = msg;
  copyToast.classList.remove('translate-y-20', 'opacity-0');
  copyToast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    copyToast.classList.add('translate-y-20', 'opacity-0');
    copyToast.classList.remove('translate-y-0', 'opacity-100');
  }, 2500);
}

// Initial status check & Interval Polling
checkStatus();
setInterval(checkStatus, 7000);
