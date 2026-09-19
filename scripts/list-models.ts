import { GoogleGenAI } from '@google/genai';
import { config } from '../src/config/env';

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

async function test() {
  console.log('Listing models...');
  const response = await ai.models.list();
  for await (const model of response) {
    if (model.name.includes('flash') || model.name.includes('embed')) {
      console.log(model.name);
    }
  }
}

test();
