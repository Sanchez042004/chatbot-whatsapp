import { generateResponse, isAwaitingAdvisor, deactivateAdvisorMode } from '../src/services/gemini';
import { normalizeText, matchBusinessFAQ } from '../src/domain/engine';
import { loadBusinessConfig } from '../src/domain/business-loader';

async function runTests(): Promise<void> {
  console.log('🧪 Iniciando verificación del motor de respuestas White-Label...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string): void {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test normalizador de texto
  console.log('--- 1. Pruebas de normalización agnóstica ---');
  const normalized1 = normalizeText('¿¡HÓLA! ¿Cuáles son los HORARIOS de atención?!');
  assert(normalized1 === 'hola cuales son los horarios de atencion', 'Normaliza tildes, mayúsculas y signos');

  // 2. Test Negocio GYM (Cargado por defecto)
  console.log('\n--- 2. Pruebas del Negocio: GYM ---');
  const resHorariosGym = await generateResponse('¿A qué hora abren los domingos y festivos?', 'user_1@s.whatsapp.net');
  assert(resHorariosGym.includes('Horarios de Atención') && resHorariosGym.includes('5:00 am a 10:00 pm'), 'Gym: FAQ Horarios');

  const resPlanesGym = await generateResponse('¿cuánto vale la mensualidad y qué planes tienen?', 'user_2@s.whatsapp.net');
  assert(resPlanesGym.includes('Plan Mensual Básico') && resPlanesGym.includes('$80.000'), 'Gym: FAQ Planes y Precios');

  const resClasesGym = await generateResponse('¿Tienen clases grupales de spinning o crossfit?', 'user_3@s.whatsapp.net');
  assert(resClasesGym.includes('Spinning') && resClasesGym.includes('CrossFit'), 'Gym: FAQ Clases');

  const resUbicacionGym = await generateResponse('¿Dónde quedan ubicados y tienen parqueadero?', 'user_4@s.whatsapp.net');
  assert(resUbicacionGym.includes('Cra 8 # 28-18') && resUbicacionGym.includes('parqueadero gratuito'), 'Gym: FAQ Ubicación');

  const testUserAdvisor = 'user_adv@s.whatsapp.net';
  deactivateAdvisorMode(testUserAdvisor);
  const resAdvisorGym = await generateResponse('Necesito hablar con un asesor humano por favor', testUserAdvisor);
  assert(resAdvisorGym.includes('asesor') && isAwaitingAdvisor(testUserAdvisor), 'Gym: Modo Asesor');

  const resFallbackGym = await generateResponse('Quisiera comprar una nave espacial con criptomonedas marcianas', 'user_fb@s.whatsapp.net');
  assert(resFallbackGym.includes('No logré entender') && resFallbackGym.includes('Horarios'), 'Gym: Fallback amable con menú');

  // 3. Test Negocio RESTAURANT (Demostración multi-negocio sin tocar código)
  console.log('\n--- 3. Pruebas del Negocio: RESTAURANT (Trattoria Bella Italia) ---');
  const restaurantConfig = loadBusinessConfig('restaurant');
  assert(restaurantConfig.id === 'restaurant' && restaurantConfig.name === 'Trattoria Bella Italia', 'Carga configuración de restaurante');

  const resMenuRest = matchBusinessFAQ('¿Me puedes mostrar el menú y las pizzas que tienen?', restaurantConfig);
  assert(resMenuRest.matched && resMenuRest.response.includes('Pizzas a la Leña') && resMenuRest.category === 'menu', 'Restaurant: FAQ Menú y Platos');

  const resDomicilioRest = matchBusinessFAQ('¿Hacen domicilios y cuánto se demora la entrega?', restaurantConfig);
  assert(resDomicilioRest.matched && resDomicilioRest.response.includes('Servicio de Domicilios') && resDomicilioRest.category === 'domicilios', 'Restaurant: FAQ Domicilios');

  const resReservaRest = matchBusinessFAQ('Quiero apartar una mesa para cumpleaños de 4 personas', restaurantConfig);
  assert(resReservaRest.matched && resReservaRest.response.includes('Reservas de Mesa') && resReservaRest.category === 'reservas', 'Restaurant: FAQ Reservas');

  const resAdvisorRest = matchBusinessFAQ('Quiero hablar con el mesero o encargado', restaurantConfig);
  assert(resAdvisorRest.matched && resAdvisorRest.category === 'advisor', 'Restaurant: Escalamiento a humano');

  const resFallbackRest = matchBusinessFAQ('Quiero reparar la rueda de mi bicicleta', restaurantConfig);
  assert(!resFallbackRest.matched && resFallbackRest.response.includes('Trattoria Bella Italia') === false && resFallbackRest.response.includes('Domicilios'), 'Restaurant: Fallback dinámico');

  console.log(`\n======================================================`);
  console.log(`Total pruebas: ${passed + failed} | Aprobadas: ${passed} | Fallidas: ${failed}`);
  console.log(`======================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err: unknown) => {
  console.error('Error fatal corriendo tests:', err);
  process.exit(1);
});
