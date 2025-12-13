import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers para permitir que tu frontend llame a esta función
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Cambia esto por tu dominio en producción
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar peticiones preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear un cliente de Supabase para verificar al usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Obtener el usuario autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Usuario no autenticado.')
    }

    // Obtener el ID del precio desde el cuerpo de la petición
    const { priceId } = await req.json()
    if (!priceId) {
        throw new Error('El ID del precio es requerido.');
    }

    // 1. Crear un cliente en Paddle (o buscar uno existente)
    const createCustomerResponse = await fetch('https://sandbox-api.paddle.com/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
      }),
    });

    const customerData = await createCustomerResponse.json();
    if (!createCustomerResponse.ok) {
        throw new Error(`Error al crear cliente en Paddle: ${customerData.detail}`);
    }
    const customerId = customerData.data.id;

    // 2. Crear la transacción de pago (Checkout)
    const checkoutResponse = await fetch('https://sandbox-api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId, // El ID del precio que guardaste de Paddle
            quantity: 1,
          },
        ],
        customer_id: customerId,
        // Asegúrate de que estas URLs sean correctas
        success_url: `https://conectate-platform.netlify.app/gracias?session_id={checkout_id}`,
        cancel_url: `https://conectate-platform.netlify.app/planes`,
      }),
    });

    const checkoutData = await checkoutResponse.json();
    if (!checkoutResponse.ok) {
        throw new Error(`Error al crear checkout en Paddle: ${checkoutData.detail}`);
    }

    return new Response(JSON.stringify({ url: checkoutData.data.checkout.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})