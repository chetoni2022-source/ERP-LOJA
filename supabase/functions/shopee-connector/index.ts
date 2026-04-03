import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    
    // WIP: Shopee HMAC-SHA256 Signatures and Path routing will be injected here.
    return new Response(
      JSON.stringify({ message: "Shopee Hub Edge Function Running", status: "WIP" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500, headers: corsHeaders });
  }
});
