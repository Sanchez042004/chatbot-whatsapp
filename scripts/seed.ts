import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { config } from '../src/config/env';

const supabase = createClient(config.supabase.url, config.supabase.anonKey);
const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

const gymFAQs = [
  // ── Ubicación y Horarios Generales ──
  "Estamos ubicados en la Cra 8 # 28-18 . Contamos con parqueadero gratuito para nuestros afiliados por hasta 3 horas.",
  "Nuestros horarios de atención son de lunes a viernes de 5:00 am a 10:00 pm, sábados de 6:00 am a 6:00 pm y domingos de 7:00 am a 2:00 pm.",
  "En días festivos y lunes de puente abrimos en horario especial de 7:00 am a 1:00 pm. Solo cerramos los días 25 de diciembre y 1 de enero.",
  "Las horas de mayor afluencia (horas pico) son de 6:00 am a 8:30 am y de 5:30 pm a 8:30 pm. Las horas más tranquilas y con menor afluencia son entre las 10:00 am y las 4:00 pm.",

  // ── Membresías, Precios y Métodos de Pago ──
  "Planes y tarifas: El plan mensual básico cuesta $80.000 (acceso a zona de pesas y cardio). El plan premium cuesta $120.000 e incluye acceso ilimitado a todas las clases grupales y zona húmeda. El plan anual cuesta $1.000.000 con 2 meses gratis.",
  "Métodos de pago aceptados: Recibimos efectivo en recepción, tarjetas débito y crédito (Visa, Mastercard), transferencias por PSE, Nequi y Daviplata.",
  "Congelar o pausar membresía: Puedes congelar tu plan por viajes (mínimo 15 días, máximo 30 días acumulados por año) solicitándolo con 3 días de anticipación en recepción. Por incapacidad médica certificada se congela sin costo adicional ni límite de tiempo presentando el certificado médico.",
  "Cancelación y permanencia: No tenemos cláusula de permanencia mínima en planes mensuales. Puedes cancelar o cambiar de plan avisando con al menos 5 días de anticipación a tu fecha de corte. Los planes anuales no tienen reembolso en dinero pero son transferibles a otra persona.",
  "Atraso en pagos: Tienes 3 días de gracia después de tu fecha de vencimiento para realizar el pago. Al 4to día el torniquete de ingreso se bloqueará automáticamente hasta que registres el pago, sin cobrarte intereses de mora.",
  "Descuentos y convenios: Ofrecemos 10% de descuento a estudiantes con carné vigente, plan parejas con 15% de descuento en la segunda membresía, convenios empresariales con tarifas especiales y programa de referidos donde ganas 15 días gratis por cada amigo que se afilie.",
  "Requisitos de inscripción: Presentar documento de identidad original, llenar el formulario de registro y firmar la declaración de salud (cuestionario PAR-Q). No se exige certificado médico obligatorio a menos que declares alguna condición médica o cardiovascular preexistente.",
  "Menores de edad: La edad mínima para ingresar y entrenar es de 14 años. Los menores entre 14 y 17 años deben presentar autorización escrita firmada por sus padres o acudiente legal junto con fotocopia del documento del acudiente.",

  // ── Clases Grupales ──
  "Horarios exactos de clases grupales:\n- Spinning: Lunes a viernes a las 6:00 am, 7:00 am, 6:00 pm y 7:00 pm. Sábados a las 8:00 am y 9:00 am.\n- Yoga y Pilates: Martes y jueves a las 7:00 am y 5:00 pm. Sábados a las 10:00 am.\n- Zumba: Lunes, miércoles y viernes a las 8:00 am y 6:30 pm.\n- CrossFit y Funcional: Lunes a viernes a las 6:00 am, 8:00 am, 5:00 pm y 7:00 pm. Sábados a las 9:00 am.",
  "Reserva de cupos en clases: Puedes reservar tu cupo para cualquier clase grupal desde nuestra app o directamente en recepción hasta con 2 horas de anticipación. Puedes cancelar tu reserva sin penalidad hasta 1 hora antes de que inicie la clase.",
  "Nivel de las clases: Todas las clases grupales son multinivel, aptas tanto para principiantes como para niveles intermedios y avanzados. Nuestros instructores siempre indican variaciones de baja y alta intensidad según tu capacidad.",
  "Clases sueltas para plan básico: Si tienes plan básico o no estás afiliado, puedes ingresar a una clase grupal individual adquiriendo un pase de clase suelta por $15.000 en la recepción.",
  "Lista de espera en clases: Si el cupo de una clase está lleno, el sistema te ubica en lista de espera. Si otro afiliado cancela, se te notifica automáticamente y tienes 15 minutos para confirmar tu lugar.",

  // ── Servicios e Instalaciones ──
  "Entrenador personalizado: Contamos con servicio de personal trainer certificado. El paquete mensual de 12 sesiones cuesta $350.000 y la sesión individual cuesta $35.000. Puedes consultar perfiles y agendar con la coordinación deportiva en recepción.",
  "Valoración inicial y medición corporal: Con tu inscripción recibes gratis una valoración física inicial con análisis de composición corporal InBody (mide % de grasa, masa muscular, agua) y una rutina de entrenamiento personalizada, con seguimiento y actualización cada 6 semanas.",
  "Lockers, duchas y vestieres: Contamos con vestieres amplios, duchas con agua caliente y lockers de uso diario gratuito mientras entrenas. Es obligatorio traer tu propio candado para asegurar tus pertenencias y desocupar el casillero al salir.",
  "Nutricionista y suplementación: Ofrecemos consulta con nutricionista deportiva profesional por $60.000 la cita (incluye plan nutricional a medida). En recepción tenemos tienda fitness con suplementos certificados como proteínas, creatina, pre-entrenos y bebidas hidratantes.",
  "Zonas disponibles en el gimnasio: Zona de musculación y peso libre, zona cardiovascular (trotadoras, elípticas, escaladoras), salón de spinning, zona de entrenamiento funcional y crossfit, y zona húmeda con sauna (disponible de lunes a viernes de 6:00 am a 11:00 am y de 5:00 pm a 9:00 pm). No disponemos de piscina.",

  // ── Operación del Día a Día y Normas ──
  "Requisitos y vestimenta para entrenar: Es obligatorio ingresar con ropa deportiva adecuada, tenis limpios, toalla personal de entrenamiento para colocar sobre las máquinas e hidratación en termo cerrado.",
  "Normas de convivencia y uso de equipos: Descargar barras y mancuernas devolviéndolas a su lugar tras su uso, limpiar y desinfectar las máquinas con el alcohol y toallas disponibles. Se permite tomar fotos y videos personales con el celular siempre que no graben a otros usuarios sin su consentimiento ni interrumpan el paso.",
  "Objetos perdidos: Si dejaste olvidado algún objeto personal en el gimnasio, acércate a la recepción o consúltanos por WhatsApp indicando el día y la descripción. Guardamos los objetos encontrados en custodia por un plazo de 30 días.",
  "Máquinas dañadas o en mantenimiento: Si detectas alguna máquina con fallas mecánicas o ruidos extraños, por favor repórtalo a cualquier entrenador de piso o en recepción. El equipo técnico realiza reparaciones en un lapso de 24 a 48 horas.",
  "Lesiones, embarazo o condiciones médicas: Si tienes alguna lesión previa, molestia articular o estás en embarazo, coméntaselo al entrenador de piso antes de comenzar para adaptar tu rutina con ejercicios seguros de bajo impacto.",

  // ── Contacto, Asesor y Pase Gratis ──
  "Canales oficiales de contacto: WhatsApp: +57 317 750 9725, Teléfono fijo: (601) 745 2818, Correo: contacto@fitbotgym.com, Instagram y Facebook: @fitbotgym.",
  "Pase de prueba gratis (Free Pass): Puedes solicitar un pase de prueba gratis por 1 día (Free Pass) directamente en recepción presentando tu documento de identidad. También puedes usar el Free Pass para invitar a un amigo o familiar a entrenar contigo.",
  "Peticiones, quejas y reclamos (PQRS): Puedes radicar cualquier queja, sugerencia o felicitación enviando un correo a soporte@fitbotgym.com, depositándola en el buzón físico de sugerencias en recepción o solicitando hablar con la administración de la sede.",
  "Atención personalizada con asesor: Si deseas hablar con un asesor humano o resolver dudas complejas, puedes escribir 'asesor' o 'humano' en este chat en cualquier momento y un integrante de nuestro equipo tomará la conversación."
];

async function seedData() {
  console.log('Iniciando proceso de seeding...');

  // Borrar datos anteriores para evitar duplicados
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) {
    console.error('Error borrando datos anteriores:', deleteError.message);
    return;
  }
  console.log('Datos anteriores eliminados correctamente.');

  for (const text of gymFAQs) {
    try {
      // 1. Generar embedding
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,

      });
      const embedding = response.embeddings?.[0]?.values;

      if (!embedding) {
        console.warn(`No se generó embedding para: ${text}`);
        continue;
      }

      // 2. Insertar en Supabase
      const { error } = await supabase
        .from('documents')
        .insert({
          content: text,
          embedding: embedding
        });

      if (error) {
        console.error(`Error insertando en Supabase: ${error.message}`);
      } else {
        console.log(`Ingresado correctamente: "${text.substring(0, 30)}..."`);
      }
    } catch (error) {
      console.error(`Error procesando texto:`, error);
    }
  }

  console.log('Seeding finalizado.');
}

seedData();
