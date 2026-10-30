import { generateResponse, isAwaitingAdvisor, deactivateAdvisorMode } from '../src/services/gemini';
import { normalizeText, matchFAQ } from '../src/services/faq';

async function runTests() {
  console.log('🧪 Iniciando verificación del motor de respuestas y FAQs...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test normalizador de texto
  console.log('--- 1. Pruebas de normalización ---');
  const normalized1 = normalizeText('¿¡HÓLA! ¿Cuáles son los HORARIOS de atención?!');
  assert(normalized1 === 'hola cuales son los horarios de atencion', 'Normaliza tildes, mayúsculas y signos');

  // 2. Test FAQ Horarios
  console.log('\n--- 2. Pruebas de FAQs y Respuestas ---');
  const resHorarios = await generateResponse('¿A qué hora abren los domingos y festivos?', 'user_1@s.whatsapp.net');
  assert(resHorarios.includes('Horarios de Atención') && resHorarios.includes('5:00 am a 10:00 pm'), 'FAQ Horarios coincide');

  // 3. Test FAQ Planes y Precios
  const resPlanes = await generateResponse('¿cuánto vale la mensualidad y qué planes tienen?', 'user_2@s.whatsapp.net');
  assert(resPlanes.includes('Plan Mensual Básico') && resPlanes.includes('$80.000'), 'FAQ Planes y Precios coincide');

  // 4. Test FAQ Clases Grupales
  const resClases = await generateResponse('¿Tienen clases grupales de spinning o crossfit?', 'user_3@s.whatsapp.net');
  assert(resClases.includes('Spinning') && resClases.includes('CrossFit'), 'FAQ Clases Grupales coincide');

  // 5. Test FAQ Requisitos de Ingreso
  const resRequisitos = await generateResponse('¿Qué requisitos piden para inscribirse? ¿Pueden menores?', 'user_4@s.whatsapp.net');
  assert(resRequisitos.includes('Requisitos') && resRequisitos.includes('14 años'), 'FAQ Requisitos de ingreso coincide');

  // 6. Test FAQ Free Pass
  const resFreePass = await generateResponse('¿Tienen pase de cortesía o prueba gratis de 1 día?', 'user_5@s.whatsapp.net');
  assert(resFreePass.includes('Free Pass') && resFreePass.includes('1 día'), 'FAQ Free Pass coincide');

  // 7. Test FAQ Ubicación y Parqueadero
  const resUbicacion = await generateResponse('¿Dónde quedan ubicados y tienen parqueadero?', 'user_6@s.whatsapp.net');
  assert(resUbicacion.includes('Cra 8 # 28-18') && resUbicacion.includes('parqueadero gratuito'), 'FAQ Ubicación y Parqueadero coincide');

  // 8. Test Asesor
  console.log('\n--- 3. Pruebas de Modo Asesor ---');
  const testUserAdvisor = 'user_7@s.whatsapp.net';
  deactivateAdvisorMode(testUserAdvisor);
  const resAdvisor = await generateResponse('Necesito hablar con un asesor humano por favor', testUserAdvisor);
  assert(resAdvisor.includes('asesor') && isAwaitingAdvisor(testUserAdvisor), 'Detecta asesor y activa modo asesor');

  // 9. Test Caso no reconocido -> Respaldo amable con menú de opciones
  console.log('\n--- 4. Pruebas de Fallback no reconocido ---');
  const resUnrecognized = await generateResponse('Quisiera comprar una nave espacial con criptomonedas marcianas', 'user_8@s.whatsapp.net');
  assert(resUnrecognized.includes('No logré entender') && resUnrecognized.includes('Horarios') && resUnrecognized.includes('Planes'), 'Caso no reconocido devuelve menú de respaldo amable');

  console.log(`\n================================`);
  console.log(`Total pruebas: ${passed + failed} | Aprobadas: ${passed} | Fallidas: ${failed}`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

