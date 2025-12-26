import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PADDLE_API_KEY = Deno.env.get('PADDLE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const corsOrigin = 'https://conectate-platform.netlify.app';

serve(async (req) => {
  // Manejar la petición "preflight" de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      }
    })
  }

  if (req.method === 'POST') {
    console.log('🚀 FUNCIÓN create-paddle-customer INVOCADA');

    // --- PASO DE DEPURACIÓN CLAVE (ahora en el lugar correcto) ---
    console.log("🔍 DEPURACIÓN: La función está usando la siguiente PADDLE_API_KEY:");
    console.log(`   - Longitud: ${PADDLE_API_KEY?.length || 'NULL'}`);
    console.log(`   - Primeros 10 caracteres: ${PADDLE_API_KEY?.substring(0, 10) || 'NULL'}`);
    // --- FIN DEL PASO DE DEPURACIÓN ---

    if (!PADDLE_API_KEY) {
      console.error('❌ FALTA PADDLE_API_KEY');
      return new Response('Config error', { status: 500 })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No hay cabecera de autorización.');
      return new Response('No authorization header', { status: 401 })
    }

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      console.error('❌ Token de usuario inválido o no encontrado.', authError);
      return new Response('Invalid token', { status: 401 })
    }
    
    if (!user.email) {
        console.error('❌ El usuario no tiene email.');
        return new Response('User email not found', { status: 400 });
    }

    console.log(`✅ Usuario autenticado: ${user.email}. Creando cliente de Paddle...`);

    try {
      const paddleResponse = await fetch('https://api.paddle.com/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        }),
      });

      console.log(`Respuesta de Paddle API: ${paddleResponse.status}`);

      if (!paddleResponse.ok) {
          const errorBody = await paddleResponse.text();
          console.error("Error de la API de Paddle:", errorBody);
          throw new Error(`Paddle API error: ${paddleResponse.status}`);
      }

      const paddleData = await paddleResponse.json();
      const paddleCustomerId = paddleData.id;

      console.log(`✅ Cliente de Paddle creado con ID: ${paddleCustomerId}`);

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          paddle_customer_id: paddleCustomerId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (updateError) {
        console.error('❌ Error al actualizar el perfil en Supabase:', updateError);
        throw updateError;
      }

      console.log(`✅ Perfil del usuario ${user.id} actualizado con paddle_customer_id`);

      return new Response(JSON.stringify({ success: true, customerId: paddleCustomerId }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin
        },
        status: 200,
      });

    } catch (error) {
      console.error('❌ Error general en create-paddle-customer:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
        }
      })
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
})