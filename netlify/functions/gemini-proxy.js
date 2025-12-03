// netlify/functions/gemini-proxy.js

export default async (req, context) => {
  console.log(">>> Función invocada. Método:", req.method);

  const apiKey = process.env.GEMINI_API_KEY;
  console.log(">>> Clave de API leída:", !!apiKey); // Muestra 'true' o 'false', no la clave

  if (!apiKey) {
    console.log(">>> ERROR: La clave de API es nula o indefinida.");
    return new Response(
      JSON.stringify({ error: 'API key not configured on the server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (req.method !== 'POST') {
    console.log(">>> ERROR: Método no permitido:", req.method);
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log(">>> Intentando leer el cuerpo de la petición...");
    const { prompt } = await req.json();
    console.log(">>> Prompt recibido. Longitud:", prompt.length);

    const MODEL_NAME = 'gemini-2.5-flash';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    console.log(">>> Llamando a la API de Gemini...");

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    console.log(">>> API de Gemini respondió. Status:", response.status);
    const data = await response.json();
    console.log(">>> Respuesta de Gemini parseada correctamente.");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("!!! ERROR CAPTURADO EN LA FUNCIÓN !!!");
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};