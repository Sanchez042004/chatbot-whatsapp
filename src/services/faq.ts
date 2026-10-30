/**
 * Módulo de FAQs autónomo del gimnasio (FitBot)
 * Normaliza el texto entrante y hace coincidir las preguntas con la información oficial del gimnasio.
 */

export interface FAQMatchResult {
  matched: boolean;
  category?: 'horarios' | 'planes' | 'clases' | 'requisitos' | 'freepass' | 'ubicacion' | 'advisor' | 'greeting';
  response: string;
}

/**
 * Normaliza un texto:
 * - Convierte a minúsculas
 * - Remueve tildes y diacríticos (á -> a, é -> e, etc.)
 * - Remueve signos de puntuación y caracteres especiales
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^\w\s]/gi, ' ')       // reemplaza signos por espacio
    .replace(/\s+/g, ' ')            // colapsa espacios
    .trim();
}

/** Comprueba si el texto contiene una palabra o frase con límites de palabra para evitar falsos positivos */
function containsKeyword(normalizedText: string, keyword: string): boolean {
  const normKw = normalizeText(keyword);
  if (normKw.includes(' ')) {
    return normalizedText.includes(normKw);
  }
  const regex = new RegExp(`(^|\\s)${normKw}(\\s|$)`, 'i');
  return regex.test(normalizedText);
}

function anyKeyword(normalizedText: string, keywords: string[]): boolean {
  return keywords.some(kw => containsKeyword(normalizedText, kw));
}

export const ADVISOR_KEYWORDS = [
  'asesor',
  'asesores',
  'humano',
  'humanos',
  'agente',
  'persona',
  'hablar con alguien',
  'quiero asesor',
  'necesito asesor',
  'operador',
  'recepcion'
];

export const GREETING_KEYWORDS = [
  'hola',
  'buenas',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'hey',
  'saludos',
  'que tal',
  'hi',
  'hello',
  'buen dia',
  'inicio',
  'empezar',
  'menu'
];

export const FAQ_RESPONSES = {
  horarios: `🕒 *Nuestros Horarios de Atención:*

• *Lunes a Viernes:* 5:00 am a 10:00 pm
• *Sábados:* 6:00 am a 6:00 pm
• *Domingos:* 7:00 am a 2:00 pm
• *Festivos y puentes:* 7:00 am a 1:00 pm
*(Solo cerramos el 25 de diciembre y 1 de enero)*

💡 *Tip:* Las horas más tranquilas son de 10:00 am a 4:00 pm. Horas pico: 6:00-8:30 am y 5:30-8:30 pm.`,

  planes: `📋 *Planes y Tarifas:*

• 🥉 *Plan Mensual Básico:* $80.000 / mes (acceso ilimitado a zona de pesas y cardio).
• 🥇 *Plan Premium:* $120.000 / mes (incluye pesas, cardio, acceso a todas las clases grupales y zona húmeda/sauna).
• 💎 *Plan Anual:* $1.000.000 (¡incluye 2 meses gratis!).

💳 *Métodos de pago:* Efectivo en recepción, tarjetas débito/crédito, transferencias por PSE, Nequi y Daviplata.
✨ *Sin permanencia:* En planes mensuales no tienes cláusula de permanencia mínima.`,

  clases: `🚴 *Clases Grupales (Multinivel):*

• 🚴 *Spinning:* Lunes a viernes a las 6:00 am, 7:00 am, 6:00 pm y 7:00 pm. Sábados: 8:00 am y 9:00 am.
• 🧘 *Yoga y Pilates:* Martes y jueves a las 7:00 am y 5:00 pm. Sábados: 10:00 am.
• 💃 *Zumba:* Lunes, miércoles y viernes a las 8:00 am y 6:30 pm.
• 🏋️ *CrossFit y Funcional:* Lunes a viernes a las 6:00 am, 8:00 am, 5:00 pm y 7:00 pm. Sábados: 9:00 am.

📱 *Reservas:* Reserva tu cupo desde nuestra app o en recepción con hasta 2 horas de anticipación. Pases de clase suelta por $15.000.`,

  requisitos: `📝 *Requisitos de Ingreso e Inscripción:*

1. Presentar documento de identidad original.
2. Diligenciar formulario de registro y declaración de salud (PAR-Q).
3. Traer toalla personal de entrenamiento, hidratación en termo cerrado y ropa deportiva con tenis limpios.

👶 *Menores de edad:* La edad mínima para entrenar es de 14 años. Menores entre 14 y 17 años deben presentar autorización escrita firmada por padres o acudiente con fotocopia de su documento.`,

  freepass: `🎟️ *Pase de Prueba Gratis (Free Pass):*

¡Queremos que nos conozcas! Ofrecemos un *Free Pass de 1 día totalmente gratis*.
Solo acércate a la recepción con tu documento de identidad original para activarlo y comenzar a entrenar de inmediato. ¡También puedes usarlo para invitar a un amigo! 💪`,

  ubicacion: `📍 *Ubicación y Parqueadero:*

Estamos ubicados en la *Cra 8 # 28-18*.
🚗 Contamos con *parqueadero gratuito* para nuestros afiliados por hasta 3 horas continuas mientras entrenas.`,

  advisor: `¡Claro! 🧑‍💼 En un momento un asesor de nuestro equipo se comunicará contigo. ¡Gracias por tu paciencia! 🙏`,

  fallback: `😕 No logré entender del todo tu consulta.

Por favor escribe alguna de las siguientes opciones o palabras clave para brindarte la información exacta:

• 🕒 *Horarios* (atención semanal y festivos)
• 📋 *Planes* (precios, mensualidades y formas de pago)
• 🚴 *Clases* (Spinning, Yoga, Zumba, CrossFit)
• 📝 *Requisitos* (inscripción y menores de edad)
• 🎟️ *Free Pass* (pase gratis de 1 día de cortesía)
• 📍 *Ubicación* (dirección y parqueadero gratuito)
• 🧑‍💼 *Asesor* (hablar directamente con una persona)

¡Estoy listo para ayudarte! 💪`,

  menu: `¡Hola! 👋🏋️‍♂️ Bienvenido/a a *FitBot*, tu asistente virtual del gimnasio.

¿En qué puedo colaborarte hoy? Puedes consultarme sobre:
• 🕒 *Horarios* (atención general y festivos)
• 📋 *Planes y Precios* (básico, premium, anual)
• 🚴 *Clases grupales* (Spinning, Yoga, Zumba, CrossFit)
• 📝 *Requisitos de ingreso* (inscripción y edades)
• 🎟️ *Free Pass* (pase de prueba gratis de 1 día)
• 📍 *Ubicación y parqueadero gratuito*
• 🧑‍💼 *Hablar con un asesor* (escribe *"asesor"*)

¡Escríbeme tu duda y con gusto te ayudo! 💪`
};

/**
 * Busca coincidencia directa en las preguntas frecuentes del gimnasio
 */
export function matchFAQ(rawMessage: string): FAQMatchResult {
  const normalized = normalizeText(rawMessage);

  // 1. Asesor
  if (anyKeyword(normalized, ADVISOR_KEYWORDS)) {
    return {
      matched: true,
      category: 'advisor',
      response: FAQ_RESPONSES.advisor
    };
  }

  // 2. Saludo o menú
  const isGreeting = GREETING_KEYWORDS.some(kw => {
    return normalized === kw || normalized.startsWith(kw + ' ') || normalized.endsWith(' ' + kw);
  });
  if (isGreeting && normalized.split(' ').length <= 4) {
    return {
      matched: true,
      category: 'greeting',
      response: FAQ_RESPONSES.menu
    };
  }

  // 3. Ubicación y Parqueadero (evaluar antes para evitar colisión de parqueadero)
  const ubicacionKeywords = [
    'ubicacion', 'ubicados', 'ubicado', 'direccion', 'donde queda', 'donde quedan',
    'donde estan', 'donde es', 'como llegar', 'parqueadero', 'parqueaderos',
    'estacionamiento', 'parquear', 'parqueo', 'mapa', 'sede', 'cra 8'
  ];
  if (anyKeyword(normalized, ubicacionKeywords)) {
    return {
      matched: true,
      category: 'ubicacion',
      response: FAQ_RESPONSES.ubicacion
    };
  }

  // 4. Free Pass / Pase de prueba
  const freePassKeywords = [
    'free pass', 'freepass', 'pase', 'pases', 'prueba', 'cortesia', 'gratis',
    'dia gratis', 'clase gratis', 'probar', 'conocer'
  ];
  if (anyKeyword(normalized, freePassKeywords)) {
    return {
      matched: true,
      category: 'freepass',
      response: FAQ_RESPONSES.freepass
    };
  }

  // 5. Horarios
  const horarioKeywords = [
    'horario', 'horarios', 'hora', 'horas', 'abren', 'abierto', 'abre',
    'cierran', 'cierra', 'cerrado', 'festivo', 'festivos', 'domingo', 'domingos',
    'sabado', 'sabados', 'lunes', 'puente', 'hora pico', 'atienden'
  ];
  if (anyKeyword(normalized, horarioKeywords)) {
    return {
      matched: true,
      category: 'horarios',
      response: FAQ_RESPONSES.horarios
    };
  }

  // 6. Planes y Precios
  const planesKeywords = [
    'plan', 'planes', 'precio', 'precios', 'costo', 'costos', 'tarifa', 'tarifas',
    'cuanto vale', 'cuanto cuesta', 'mensualidad', 'mensual', 'premium', 'anual',
    'suscripcion', 'membresia', 'metodos de pago', 'formas de pago', 'nequi',
    'daviplata', 'tarjeta', 'tarjetas', 'efectivo', 'congelar', 'cancelar', 'permanencia'
  ];
  if (anyKeyword(normalized, planesKeywords)) {
    return {
      matched: true,
      category: 'planes',
      response: FAQ_RESPONSES.planes
    };
  }

  // 7. Clases grupales
  const clasesKeywords = [
    'clase', 'clases', 'spinning', 'spin', 'yoga', 'pilates', 'zumba',
    'crossfit', 'funcional', 'baile', 'grupal', 'grupales', 'cupo', 'reserva', 'reservar'
  ];
  if (anyKeyword(normalized, clasesKeywords)) {
    return {
      matched: true,
      category: 'clases',
      response: FAQ_RESPONSES.clases
    };
  }

  // 8. Requisitos de ingreso
  const requisitosKeywords = [
    'requisito', 'requisitos', 'inscribir', 'inscripcion', 'afiliar', 'afiliacion',
    'edad', 'edad minima', 'menor', 'menores', 'par q', 'parq', 'documento',
    'cedula', 'que necesito', 'ropa', 'toalla', 'candado'
  ];
  if (anyKeyword(normalized, requisitosKeywords)) {
    return {
      matched: true,
      category: 'requisitos',
      response: FAQ_RESPONSES.requisitos
    };
  }

  // No coincide con ninguna FAQ específica
  return {
    matched: false,
    response: FAQ_RESPONSES.fallback
  };
}
