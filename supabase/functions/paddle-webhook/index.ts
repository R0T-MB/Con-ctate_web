import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  console.log('🔥 WEBHOOK PADDLE VERSION FINAL CON MANEJO DE EVENTOS 🔥')

  if (!PADDLE_WEBHOOK_SECRET) {
    console.error('❌ Falta PADDLE_WEBHOOK_SECRET')
    return new Response('Config error', { status: 500 })
  }

  const signatureHeader = req.headers.get('paddle-signature')
  if (!signatureHeader) {
    console.error('❌ Firma no encontrada')
    return new Response('Firma no encontrada', { status: 401 })
  }

  const parts = signatureHeader.split(';')
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1]
  const h1Signature = parts.find(p => p.startsWith('h1='))?.split('=')[1]

  if (!ts || !h1Signature) {
    console.error('❌ Formato de firma inválido')
    return new Response('Formato de firma inválido', { status: 401 })
  }

  const rawBody = await req.arrayBuffer()

  const signedPayload = new Uint8Array([
    ...new TextEncoder().encode(`${ts}:`),
    ...new Uint8Array(rawBody),
  ])

  let isValid = false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PADDLE_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureBytes = Uint8Array.from(
      atob(h1Signature),
      c => c.charCodeAt(0)
    )

    isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      signedPayload
    )
  } catch (err) {
    console.error('❌ Error verificando firma:', err)
    return new Response('Error verificando firma', { status: 500 })
  }

  if (!isValid) {
    console.error('❌ Firma del webhook inválida')
    return new Response('Firma inválida', { status: 401 })
  }

  console.log('✅ Firma verificada')

  const bodyText = new TextDecoder().decode(rawBody)
  const event = JSON.parse(bodyText)

  console.log(`📩 Evento recibido: ${event.event_type} | ID: ${event.id}`)

  const supabase = createClient(
    SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY ?? ''
  )

  // --- INICIO DE LÓGICA DE IDEMPOTENCIA ---
  const { data: existingEvent } = await supabase
    .from('processed_paddle_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existingEvent) {
    console.log(`🔁 Evento ${event.id} ya fue procesado. Ignorando.`)
    return new Response('OK', { status: 200 })
  }
  // --- FIN DE LÓGICA DE IDEMPOTENCIA ---

  // Función helper para registrar el evento procesado
  const markEventAsProcessed = async (eventId: string) => {
    const { error: insertError } = await supabase
      .from('processed_paddle_events')
      .insert({ event_id: eventId });

    if (insertError) {
      console.error('⚠️ Error al guardar el evento procesado:', insertError);
    } else {
      console.log(`✅ Evento ${eventId} guardado como procesado.`);
    }
  };

  try {
    if (event.event_type === 'transaction.completed' && event.data?.subscription_id) {
      const { customer_id, subscription_id, items } = event.data
      const planId = items?.[0]?.price?.id ?? null

      console.log(`🔄 Procesando activación para suscripción ${subscription_id}...`)

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          paddle_customer_id: customer_id,
          subscription_status: 'active',
          plan_id: planId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'paddle_customer_id' }
      )

      if (upsertError) {
        throw upsertError
      }

      console.log('✅ Suscripción activada en la base de datos.')
      await markEventAsProcessed(event.id);

    } else if (event.event_type === 'subscription.cancelled') {
      const { customer_id } = event.data;
      console.log(`🔄 Procesando cancelación para el cliente ${customer_id}...`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          plan_id: null, // Limpiar el plan al cancelar
          updated_at: new Date().toISOString(),
        })
        .eq('paddle_customer_id', customer_id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Suscripción cancelada en la base de datos.');
      await markEventAsProcessed(event.id);

    } else if (event.event_type === 'payment.failed') {
      const { customer_id, subscription_id } = event.data;
      console.log(`🔄 Procesando pago fallido para la suscripción ${subscription_id}...`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'past_due', // Estado de "pago vencido"
          updated_at: new Date().toISOString(),
        })
        .eq('paddle_customer_id', customer_id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Estado de suscripción actualizado a "past_due" en la base de datos.');
      await markEventAsProcessed(event.id);
    }

  } catch (error) {
    console.error(`❌ Error al procesar el evento ${event.event_type}:`, error)
    // Devolvemos un 500 para que Paddle pueda reintentar más tarde.
    // Como no guardamos el event_id, el reintento se procesará correctamente.
    return new Response('Error processing event', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})