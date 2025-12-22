import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET');

serve(async (req) => {
  // ---- ESTE ES EL MENSAJE CLAVE. SI VES ESTO EN LOS LOGS, EL CÓDIGO NUEVO ESTÁ CORRIENDO ----
  console.log("🚀 WEBHOOK INVOKED WITH NEW CODE! 🚀");

  // --- INICIO DE LA VERIFICACIÓN DE LA FIRMA (CORREGIDA) ---
  const signatureHeader = req.headers.get('paddle-signature');
  if (!signatureHeader) {
    console.error("Webhook recibido sin la cabecera 'paddle-signature'.");
    return new Response('Firma no encontrada', { status: 401 });
  }

  const [tsPart, v1Part] = signatureHeader.split(',');
  const ts = tsPart.split('=')[1];
  const v1Signature = v1Part.split('=')[1];

  if (!ts || !v1Signature) {
    console.error("Formato de la firma del webhook inválido.");
    return new Response('Formato de firma inválido', { status: 401 });
  }

  const body = await req.text();
  const signedPayload = `${ts}:${body}`;

  let isValid = false;
  try {
    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PADDLE_WEBHOOK_SECRET!),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = new Uint8Array(v1Signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    isValid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      signatureBytes,
      new TextEncoder().encode(signedPayload)
    );
  } catch (error) {
    console.error("Error durante la verificación criptográfica:", error);
    return new Response('Error al verificar la firma', { status: 500 });
  }

  if (!isValid) {
    console.error("Firma del webhook inválida. El secreto o el cuerpo no coinciden.");
    return new Response('Firma inválida', { status: 401 });
  }

  console.log("✅ Firma del webhook verificada con éxito.");
  // --- FIN DE LA VERIFICACIÓN DE LA FIRMA ---

  // --- INICIO DEL PROCESAMIENTO DEL EVENTO ---
  try {
    const event = JSON.parse(body);
    console.log("📩 Evento recibido:", event.event_type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (event.event_type === 'subscription.activated' || event.event_type === 'payment.succeeded') {
      const eventData = event.data;
      const customerId = eventData.customer_id;
      const planId = eventData.items?.[0]?.price?.id || 'default_plan_id';

      if (!customerId) {
        console.error("El evento no contiene 'customer_id'.");
        return new Response('Falta customer_id', { status: 400 });
      }

      console.log(`🔄 Procesando evento para el cliente ${customerId} con el plan ${planId}.`);

      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          paddle_customer_id: customerId,
          subscription_status: 'active',
          plan_id: planId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'paddle_customer_id'
        });

      if (error) {
        console.error("❌ Error al actualizar el perfil del usuario en Supabase:", error);
        throw error;
      }

      console.log(`✅ Perfil del cliente ${customerId} actualizado a 'active'.`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error("❌ Error general al procesar el webhook:", error);
    return new Response('Error interno del servidor', { status: 500 });
  }
});