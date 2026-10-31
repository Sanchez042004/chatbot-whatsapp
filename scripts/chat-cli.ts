import readline from 'readline';
import { generateResponse, isAwaitingAdvisor, deactivateAdvisorMode } from '../src/services/gemini';
import { activeBusiness } from '../src/domain/business-loader';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SIMULATED_PHONE = '573001234567@s.whatsapp.net';

console.log('====================================================');
console.log(`🤖 SIMULADOR INTERACTIVO ${activeBusiness.name.toUpperCase()} (WhatsApp CLI)`);
console.log(`   Negocio activo: [${activeBusiness.id}] - ${activeBusiness.industry}`);
console.log('====================================================');
console.log('Escribe un mensaje como si fueras un usuario de WhatsApp.');
console.log('Comandos especiales:');
console.log('  !bot on    -> Reactivar bot si está en modo asesor');
console.log('  !reset     -> Limpiar sesión y empezar de nuevo');
console.log('  exit       -> Salir del simulador\n');

function promptUser() {
  rl.question('\n👤 Tú: ', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      promptUser();
      return;
    }

    if (trimmed.toLowerCase() === 'exit') {
      console.log('👋 ¡Hasta luego!');
      rl.close();
      process.exit(0);
    }

    if (trimmed.toLowerCase() === '!reset') {
      deactivateAdvisorMode(SIMULATED_PHONE);
      console.log('🔄 Sesión reiniciada.');
      promptUser();
      return;
    }

    if (trimmed.toLowerCase() === '!bot on') {
      deactivateAdvisorMode(SIMULATED_PHONE);
      console.log('🤖 Bot reactivado para este chat.');
      promptUser();
      return;
    }

    if (isAwaitingAdvisor(SIMULATED_PHONE)) {
      console.log('\n⏸️  [SISTEMA]: El bot está en PAUSA porque estás en modo ASESOR.');
      console.log('    Escribe "!bot on" para reactivar el bot.');
      promptUser();
      return;
    }

    console.log(`⏳ ${activeBusiness.name} está escribiendo...`);
    try {
      const response = await generateResponse(trimmed, SIMULATED_PHONE);
      console.log(`\n🤖 ${activeBusiness.name}:\n${response}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error generando respuesta:', msg);
    }

    promptUser();
  });
}

promptUser();

