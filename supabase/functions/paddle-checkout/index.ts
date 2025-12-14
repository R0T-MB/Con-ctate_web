import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("Función paddle-checkout iniciada.");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Usuario no autenticado.')
    }
    console.log("Usuario verificado:", user.email);

    const { priceId } = await req.json()
    if (!priceId) {
        throw new Error('El ID del precio es requerido.');
    }
    console.log("Price ID recibido:", priceId);

    let customerId;

    console.log("Buscando cliente en Paddle...");
    const searchResponse = await fetch(`https://sandbox-api.paddle.com/customers?email=${encodeURIComponent(user.email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
      },
    });

    const searchData = await searchResponse.json();
    
    if (searchResponse.ok && searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
      console.log("Cliente existente encontrado con ID:", customerId);
    } else {
      console.log("Cliente no encontrado, creando uno nuevo...");
      const createResponse = await fetch('https://sandbox-api.paddle.com/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const createData = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(`Error al crear cliente en Paddle: ${createData.detail}`);
      }
      customerId = createData.id;
      console.log("Nuevo cliente creado con ID:", customerId);
    }

    console.log("Creando transacción de checkout con tipo 'redirect'...");
    const checkoutResponse = await fetch('https://sandbox-api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        checkout: {
          type: 'redirect' // <-- CAMBIO CLAVE: Forzar redirección
        },
        success_url: `https://conectate-platform.netlify.app/gracias?session_id={checkout_id}`,
        cancel_url: `https://conectate-platform.netlify.app/planes`,
      }),
    });

    const checkoutData = await checkoutResponse.json();
    if (!checkoutResponse.ok) {
        throw new Error(`Error al crear checkout en Paddle: ${JSON.stringify(checkoutData)}`);
    }

    console.log("Checkout creado con éxito. ID de la transacción:", checkoutData.data.id);
return new Response(JSON.stringify({ transactionId: checkoutData.data.id }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  status: 200,
})

  } catch (error) {
    console.error("Error general en la función:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})