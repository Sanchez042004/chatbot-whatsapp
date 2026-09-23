// FitBot Discord-Style Landing Controller

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

let isModalOpen = false;

// Format status badge UI
function updateStatusUI(status, phone) {
  const navText = navStatusBadge.querySelector('.status-text');
  const modalText = modalStatusBadge.querySelector('.modal-status-text');

  navStatusBadge.className = 'status-indicator';
  modalStatusBadge.className = 'modal-status-badge';

  if (status === 'open') {
    navStatusBadge.classList.add('online');
    modalStatusBadge.classList.add('online');
    navText.textContent = '🟢 En Línea';
    modalText.textContent = `🟢 Conectado (${phone || 'WhatsApp Activo'})`;
  } else if (status === 'qr_ready') {
    navStatusBadge.classList.add('waiting');
    modalStatusBadge.classList.add('waiting');
    navText.textContent = '🟡 Escanear QR';
    modalText.textContent = '🟡 Esperando Escaneo QR';
  } else if (status === 'connecting') {
    navText.textContent = '⏳ Conectando...';
    modalText.textContent = '⏳ Conectando con WhatsApp...';
  } else {
    navStatusBadge.classList.add('offline');
    modalStatusBadge.classList.add('offline');
    navText.textContent = '🔴 Desconectado';
    modalText.textContent = '🔴 Desconectado';
  }
}

// Check server status
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

// Fetch QR Code data and render in modal
async function fetchAndRenderQr() {
  qrContainer.innerHTML = `
    <div class="qr-loading">
      <div class="spinner"></div>
      <span>Cargando código QR...</span>
    </div>
  `;

  try {
    const res = await fetch('/api/qr');
    const data = await res.json();

    if (data.status === 'open') {
      qrContainer.innerHTML = `
        <div style="text-align: center; color: #166534; padding: 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 10px;">✅</div>
          <h4 style="color: #14532d; margin-bottom: 6px;">¡Bot Conectado y Listo!</h4>
          <p style="color: #15803d; font-size: 0.9rem;">El chatbot está activo y respondiendo mensajes en tiempo real.</p>
        </div>
      `;
      modalInfoText.innerHTML = '<p>🎉 El bot ya está vinculado a WhatsApp. ¡Puedes escribirle ahora mismo!</p>';
    } else if (data.qrImage) {
      qrContainer.innerHTML = `<img src="${data.qrImage}" alt="Escanear QR WhatsApp" />`;
      modalInfoText.innerHTML = '<p>Abre WhatsApp en tu teléfono ➡️ <strong>Dispositivos vinculados</strong> ➡️ <strong>Vincular dispositivo</strong> y escanea el código.</p>';
    } else {
      qrContainer.innerHTML = `
        <div style="text-align: center; color: #0a0c10; padding: 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">⏳</div>
          <p style="font-weight: 600;">${data.message || 'Iniciando conexión...'}</p>
        </div>
      `;
      modalInfoText.innerHTML = '<p>Iniciando servicio de WhatsApp... Haz clic en actualizar en unos segundos.</p>';
    }
  } catch (err) {
    qrContainer.innerHTML = '<p style="color: #b91c1c; font-weight: 600;">Error cargando código QR.</p>';
  }
}

// Render modal content depending on state
function renderModalContent(statusData) {
  if (statusData.status === 'open') {
    qrContainer.innerHTML = `
      <div style="text-align: center; color: #166534; padding: 20px;">
        <div style="font-size: 3.5rem; margin-bottom: 10px;">✅</div>
        <h4 style="color: #14532d; margin-bottom: 6px;">¡Bot Conectado y Listo!</h4>
        <p style="color: #15803d; font-size: 0.9rem;">El chatbot está activo y respondiendo mensajes en tiempo real.</p>
      </div>
    `;
    modalInfoText.innerHTML = '<p>🎉 El bot ya está vinculado a WhatsApp. ¡Puedes escribirle ahora mismo!</p>';
  } else if (statusData.lastQrRaw) {
    fetchAndRenderQr();
  }
}

// Open / Close Modal
function openModal() {
  isModalOpen = true;
  qrModal.classList.add('active');
  fetchAndRenderQr();
}

function closeModal() {
  isModalOpen = false;
  qrModal.classList.remove('active');
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

// Copy Prompts to Clipboard
const promptCards = document.querySelectorAll('.prompt-card');
promptCards.forEach((card) => {
  card.addEventListener('click', async () => {
    const promptText = card.getAttribute('data-prompt');
    if (!promptText) return;

    try {
      await navigator.clipboard.writeText(promptText);
      showToast(`✓ Pregunta copiada: "${promptText.slice(0, 30)}..."`);
    } catch (err) {
      // Fallback
      showToast('✓ Pregunta copiada');
    }
  });
});

function showToast(msg) {
  copyToast.textContent = msg;
  copyToast.classList.add('show');
  setTimeout(() => {
    copyToast.classList.remove('show');
  }, 3000);
}

// Initial status check & Interval Polling
checkStatus();
setInterval(checkStatus, 6000);
