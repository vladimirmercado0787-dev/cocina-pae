import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, empresa_id_admin, clave } = await req.json()

    // Validaciones básicas
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Faltan el correo o la contraseña' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!empresa_id_admin || !clave) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos de autorización' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente admin (con la service role key, que tiene permisos totales)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🔐 SEGURIDAD: verificar la clave de mando antes de crear nada
    const { data: claveOk, error: errClave } = await supabaseAdmin.rpc('verificar_clave_mando', {
      p_empresa_id: empresa_id_admin,
      p_clave: clave,
    })

    if (errClave || !claveOk) {
      return new Response(
        JSON.stringify({ error: 'Clave de mando incorrecta' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Crear el usuario en Supabase Auth (auto-confirmado)
    const { data: nuevoUsuario, error: errCrear } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // auto-confirmar, no necesita verificar correo
    })

    if (errCrear) {
      return new Response(
        JSON.stringify({ error: 'Error al crear el login: ' + errCrear.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Devolver el UID del usuario creado
    return new Response(
      JSON.stringify({ uid: nuevoUsuario.user.id, email: nuevoUsuario.user.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Error inesperado: ' + err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})