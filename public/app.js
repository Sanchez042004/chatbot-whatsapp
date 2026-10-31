// White-Label Client Application Controller
// Carga dinámicamente la configuración del negocio activo y gestiona el chat web en tiempo real.

let currentBusiness = null;

// Formatea texto con negritas de WhatsApp / Markdown (*texto* o **texto**)
function formatChatText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\n/g, '<br/>');
}

// Actualiza el indicador de estado de conexión en la barra de navegación
function updateStatusBadge(status) {
  const badge = document.getElementById('nav-status-badge');
  if (!badge) return;

  const dot = badge.querySelector('.status-dot');
  const text = badge.querySelector('.status-text');

  if (status === 'open') {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse status-dot';
    if (text) text.textContent = 'En Línea';
    badge.className =
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-emerald-500/30 text-xs text-emerald-400 font-mono';
  } else if (status === 'qr_ready') {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse status-dot';
    if (text) text.textContent = 'Esperando QR';
    badge.className =
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-amber-500/30 text-xs text-amber-400 font-mono';
  } else {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-500 status-dot';
    if (text) text.textContent = 'Conectando';
    badge.className =
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-white/10 text-xs text-slate-400 font-mono';
  }
}

// Consulta el estado de conexión del servidor
async function checkServerStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      updateStatusBadge(data.status);
    }
  } catch {
    updateStatusBadge('close');
  }
}

// Carga la configuración del negocio activo e hidrata la página web
async function loadBusiness() {
  try {
    const res = await fetch('/api/business/config');
    const data = await res.json();
    if (!data.success || !data.business) return;

    currentBusiness = data.business;
    renderBusinessData(currentBusiness);
  } catch (err) {
    console.error('Error cargando configuración del negocio:', err);
  }
}

function renderBusinessData(b) {
  // 1. Título y SEO
  document.title = `${b.name} — Centro de Ayuda y Atención 24/7`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `${b.name} (${b.industry}). ${b.tagline || 'Atención al cliente y respuestas frecuentes 24/7 por WhatsApp y web.'}`;
  }

  // 2. Colores y Tematización CSS
  const primary = b.branding?.primaryColor || '#00F59B';
  document.documentElement.style.setProperty('--brand-primary', primary);

  // 3. Marca e Identidad en Header
  const brandNameEls = document.querySelectorAll('.dynamic-brand-name');
  brandNameEls.forEach((el) => (el.textContent = b.name));

  const taglineEl = document.getElementById('hero-tagline');
  if (taglineEl && b.tagline) taglineEl.textContent = b.tagline;

  const industryEl = document.getElementById('hero-industry');
  if (industryEl) industryEl.textContent = b.industry;

  // 4. Enlaces de WhatsApp
  const cleanPhone = (b.contact?.whatsapp || b.contact?.phone || '').replace(/[^\d]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${b.name}, tengo una consulta`)}`;
  const waButtons = document.querySelectorAll('.dynamic-wa-link');
  waButtons.forEach((btn) => {
    btn.href = waUrl;
  });

  // 5. Renderizar Ofertas / Servicios / Planes (si existen)
  const offersSection = document.getElementById('offers-section');
  const offersContainer = document.getElementById('offers-container');
  if (offersContainer && b.offers && b.offers.length > 0) {
    offersSection.classList.remove('hidden');
    offersContainer.innerHTML = b.offers
      .map(
        (offer) => `
      <div class="relative p-6 rounded-2xl bg-surface-raised border ${
        offer.highlight
          ? 'border-[var(--brand-primary)] shadow-[0_0_24px_rgba(0,245,155,0.12)]'
          : 'border-white/10'
      } flex flex-col justify-between gap-4 transition-all hover:border-[var(--brand-primary)]/50">
        ${
          offer.highlight
            ? `<span class="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--brand-primary)] text-slate-950 uppercase tracking-wider">Destacado</span>`
            : ''
        }
        <div class="space-y-2">
          <h3 class="text-lg font-bold text-white tracking-tight">${offer.name}</h3>
          <p class="text-2xl font-extrabold text-[var(--brand-primary)] font-mono">${offer.price}</p>
          <p class="text-xs text-slate-400 leading-relaxed">${offer.description || ''}</p>
        </div>
        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 rounded-xl bg-surface-hover hover:bg-white/10 border border-white/10 text-xs font-semibold text-center text-white transition-colors flex items-center justify-center gap-1.5">
          <span>Consultar por WhatsApp</span>
          <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </a>
      </div>
    `,
      )
      .join('');
  }

  // 6. Renderizar Horarios y Contacto
  const scheduleContainer = document.getElementById('schedule-container');
  if (scheduleContainer && b.schedule && b.schedule.length > 0) {
    scheduleContainer.innerHTML = b.schedule
      .map(
        (s) => `
      <div class="flex items-center justify-between py-2 border-b border-white/5 text-xs">
        <span class="font-medium text-slate-300">${s.day}</span>
        <span class="font-mono text-slate-400">${s.hours}</span>
      </div>
    `,
      )
      .join('');
  }

  const contactAddress = document.getElementById('contact-address');
  if (contactAddress && b.contact?.address) contactAddress.textContent = b.contact.address;

  const contactPhone = document.getElementById('contact-phone');
  if (contactPhone && b.contact?.phone) contactPhone.textContent = b.contact.phone;

  const contactEmail = document.getElementById('contact-email');
  if (contactEmail && b.contact?.email) contactEmail.textContent = b.contact.email;

  // 7. Renderizar botones de FAQs en el Playground interactivo
  const faqButtonsContainer = document.getElementById('faq-quick-buttons');
  if (faqButtonsContainer && b.faqs && b.faqs.length > 0) {
    faqButtonsContainer.innerHTML = b.faqs
      .map(
        (faq, idx) => `
      <button onclick="handleQuickFaq(${idx})" class="text-left px-3.5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-hover border border-white/10 hover:border-[var(--brand-primary)]/40 text-xs text-slate-300 transition-all flex items-center justify-between gap-2 group">
        <span class="font-medium group-hover:text-white">${faq.title}</span>
        <span class="material-symbols-outlined text-[14px] text-slate-500 group-hover:text-[var(--brand-primary)] transition-colors">chat</span>
      </button>
    `,
      )
      .join('');

    // Cargar la primera FAQ por defecto en la vista previa
    if (b.faqs[0]) {
      handleQuickFaq(0);
    }
  }
}

// Maneja clic en preguntas rápidas del playground
function handleQuickFaq(index) {
  if (!currentBusiness || !currentBusiness.faqs[index]) return;
  const faq = currentBusiness.faqs[index];

  const previewQuery = document.getElementById('chat-preview-query');
  const previewAnswer = document.getElementById('chat-preview-answer');

  if (previewQuery) previewQuery.textContent = faq.title;
  if (previewAnswer) previewAnswer.innerHTML = formatChatText(faq.answer);
}

// Enviar mensaje en el simulador de chat interactivo web
async function sendWebChatMessage() {
  const input = document.getElementById('web-chat-input');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  const previewQuery = document.getElementById('chat-preview-query');
  const previewAnswer = document.getElementById('chat-preview-answer');

  if (previewQuery) previewQuery.textContent = query;
  if (previewAnswer) {
    previewAnswer.innerHTML = `<span class="inline-flex items-center gap-1.5 text-slate-400 font-mono text-xs"><span class="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-ping"></span> Escribiendo respuesta...</span>`;
  }

  input.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
    });
    const data = await res.json();

    if (data.success && previewAnswer) {
      previewAnswer.innerHTML = formatChatText(data.response);
    }
  } catch (err) {
    if (previewAnswer) {
      previewAnswer.textContent = 'Error al conectar con el asistente. Intenta de nuevo.';
    }
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadBusiness();
  checkServerStatus();
  setInterval(checkServerStatus, 8000);

  const sendBtn = document.getElementById('btn-send-web-chat');
  const chatInput = document.getElementById('web-chat-input');

  sendBtn?.addEventListener('click', sendWebChatMessage);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendWebChatMessage();
    }
  });
});
