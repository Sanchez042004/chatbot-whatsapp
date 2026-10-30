import { GoogleGenAI } from '@google/genai';
import { config } from '../src/config/env';

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

async function test() {
  console.log('Testing gemini API...');
  const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'Hola'
  });
  console.log('Response:', response);
}

test();
