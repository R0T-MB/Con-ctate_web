import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std/crypto/mod.ts";

const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET');

serve(async (req) => {
  // 1. Verificar la firma del webhook (Paso de seguridad CRÍTICO)
  const signature = req.headers.get('Paddle-Signature');
  if (!signature) {
    console.error("Webhook recibido sin firma.");
    return new Response('No signature', { status: 401 });
  }

  const body = await req.text();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PADDLE_WEBHOOK_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const isValid = await crypto.subtle.verify(
    'HMAC',
    secretKey,
    Uint8Array.from(atob(signature.split('=')[1], c => c.charCodeAt(0))),
    new TextEncoder().encode(body)
  );

  if (!isValid) {
    console.error("Firma del webhook inválida.");
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Procesar el evento
  try {
    const event = JSON.parse(body);
    console.log("Webhook recibido:", event.event_type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usamos la clave de servicio para poder escribir en cualquier perfil
    );

    // 3. Manejar los eventos que nos interesan
    if (event.event_type === 'transaction.completed' || event.event_type === 'subscription.activated') {
      const eventData = event.data;
      const customerId = eventData.customer_id;
      const subscriptionId = eventData.subscription_id || eventData.items[0].subscription_id;

      if (!customerId) {
        console.error("Evento no contiene customer_id.");
        return new Response('Missing customer_id', { status: 400 });
      }

      console.log(`Procesando evento para el cliente ${customerId}`);

      // 4. Actualizar el perfil del usuario en Supabase
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          paddle_customer_id: customerId,
          subscription_status: 'active',
          subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'paddle_customer_id'
        });

      if (error) {
        console.error("Error al actualizar el perfil del usuario:", error);
        throw error;
      }

      console.log(`Perfil del cliente ${customerId} actualizado a 'active'.`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
});