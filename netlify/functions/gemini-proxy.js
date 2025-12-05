// netlify/functions/gemini-proxy.js - VERSIÓN FORENSE

export default async (req, context) => {
  try {
    // --- Bloque 1: Verificación inicial ---
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method Not Allowed',
        details: `Se recibió un método ${req.method}, pero solo se acepta POST.`
      }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Bloque 2: Lectura del cuerpo de la petición ---
    let prompt;
    try {
      const body = await req.json();
      prompt = body.prompt;
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON',
        details: `No se pudo parsear el cuerpo de la petición: ${e.message}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Bloque 3: Lógica principal de la API ---
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          error: 'API Key Missing',
          details: 'La variable de entorno GEMINI_API_KEY no está configurada en el servidor.'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      const MODEL_NAME = 'gemini-2.5-flash';
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

      console.log(`>>> Enviando prompt a Gemini: "${prompt.substring(0, 50)}..."`);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: 'Gemini API Error',
          details: `La API de Gemini respondió con estado ${response.status}.`,
          geminiResponse: data // Incluimos la respuesta de Gemini para más detalles
        }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
      }

      console.log(">>> Respuesta de Gemini exitosa.");
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (e) {
      console.error("!!! ERROR EN BLOQUE 3 (LLAMADA A GEMINI) !!!");
      console.error(e);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error during API call',
        details: e.message 
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (e) {
    console.error("!!! ERROR GENERAL EN LA FUNCIÓN !!!");
    console.error(e);
    return new Response(JSON.stringify({ 
      error: 'Unexpected Server Error',
      details: e.message 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};