import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slug } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch OS by slug
    const { data: os, error: osError } = await supabaseClient
      .from('ordens_servico')
      .select('*, veiculo:veiculos(*, cliente:clientes(*))')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (osError || !os) {
      return new Response(JSON.stringify({ error: 'Slug inválido ou expirado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Check expiration
    const expiresAt = new Date(os.slug_expires_at)
    if (expiresAt < new Date()) {
      return new Response(JSON.stringify({ error: 'Este link de orçamento expirou.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Fetch Items
    const { data: items, error: itemsError } = await supabaseClient
      .from('itens_os')
      .select('*, produto:produtos(*)')
      .eq('os_id', os.id)

    return new Response(JSON.stringify({ os, items }), {
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
