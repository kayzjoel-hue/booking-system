import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseConfigured } from '@/lib/supabase'

const missingConfigResponse = NextResponse.json(
  { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
  { status: 500 }
)

export async function POST(request: NextRequest) {
  if (!supabaseConfigured || !supabase) return missingConfigResponse

  const { user_id, service_id, date } = await request.json()
  if (
    typeof user_id !== 'string' ||
    typeof service_id !== 'string' ||
    typeof date !== 'string'
  ) {
    return NextResponse.json({ error: 'user_id, service_id, and date are required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{ user_id, service_id, date, status: 'pending' }])
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json(data)
}

export async function GET(request: NextRequest) {
  if (!supabaseConfigured || !supabase) return missingConfigResponse

  const adminToken = process.env.ADMIN_API_TOKEN
  const requestToken = request.headers.get('x-admin-token')
  if (!adminToken || requestToken !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.from('bookings').select('*')
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json(data)
}
