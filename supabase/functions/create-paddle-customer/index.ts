import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')

serve(async (req) => {
  // Esta función debe ser llamada por un usuario logueado
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('No authorization header', { status: 401 })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  // Verificar el token del usuario y obtener su info
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    return new Response('Invalid token', { status: 401 })
  }
  
  if (!user.email) {
      return new Response('User email not found', { status: 400 });
  }

  console.log(`Creando cliente de Paddle para el usuario ${user.email}...`);

  try {
    // Llamar a la API de Paddle para crear el cliente
    const paddleResponse = await fetch('https://api.paddle.com/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        name: user.user_metadata?.full_name || user.email, // Usa el nombre si está disponible
      }),
    });

    if (!paddleResponse.ok) {
        const errorBody = await paddleResponse.text();
        console.error("Error from Paddle API:", errorBody);
        throw new Error(`Paddle API error: ${paddleResponse.status}`);
    }

    const paddleData = await paddleResponse.json();
    const paddleCustomerId = paddleData.id;

    console.log(`Cliente de Paddle creado con ID: ${paddleCustomerId}`);

    // Actualizar el perfil del usuario en Supabase con el nuevo ID
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: user.id, // Asegurarse de que actualizamos el perfil correcto
        paddle_customer_id: paddleCustomerId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('Error al actualizar el perfil en Supabase:', updateError);
      throw updateError;
    }

    console.log(`Perfil del usuario ${user.id} actualizado con paddle_customer_id`);

    return new Response(JSON.stringify({ success: true, customerId: paddleCustomerId }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error general en create-paddle-customer:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
})