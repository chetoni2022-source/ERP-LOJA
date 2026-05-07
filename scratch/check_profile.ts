
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('No user logged in')
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('Current User ID:', user.id)
  console.log('Profile:', profile)
}

checkCurrentProfile()
