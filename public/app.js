// FitBot Landing Controller — Public View

const navStatusBadge = document.getElementById('nav-status-badge');
const copyToast = document.getElementById('copy-toast');
const toastText = document.getElementById('toast-text');

// Format navbar status badge UI
function updateStatusUI(status, phone) {
  if (!navStatusBadge) return;
  const navDot = navStatusBadge.querySelector('.status-dot');
  const navText = navStatusBadge.querySelector('.status-text');

  if (status === 'open') {
    if (navDot) navDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse status-dot';
    if (navText) navText.textContent = '● En Línea';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-emerald-500/40 text-xs text-emerald-400 font-mono';
  } else if (status === 'qr_ready') {
    if (navDot) navDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse status-dot';
    if (navText) navText.textContent = '🟡 Preparando...';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-yellow-500/40 text-xs text-yellow-400 font-mono';
  } else if (status === 'connecting') {
    if (navDot) navDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse status-dot';
    if (navText) navText.textContent = '⏳ Conectando...';
  } else {
    if (navDot) navDot.className = 'w-1.5 h-1.5 rounded-full bg-red-400 status-dot';
    if (navText) navText.textContent = '🔴 Fuera de Línea';
    navStatusBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-red-500/40 text-xs text-red-400 font-mono';
  }
}

// Check server status via API
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      updateStatusUI(data.status, data.connectedPhone);
    }
  } catch (err) {
    updateStatusUI('close');
  }
}

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

      showToast(`✓ Consulta cargada en la vista previa`);
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
setInterval(checkStatus, 8000);
