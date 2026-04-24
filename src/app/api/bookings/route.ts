import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseConfigured } from '@/lib/supabase'

const missingConfigResponse = NextResponse.json(
  { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
  { status: 500 }
)

export async function POST(request: NextRequest) {
  if (!supabaseConfigured || !supabase) return missingConfigResponse

  const { user_id, service_id, date } = await request.json()
  const { data, error } = await supabase!
    .from('bookings')
    .insert([{ user_id, service_id, date, status: 'pending' }])
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json(data)
}

export async function GET() {
  if (!supabaseConfigured || !supabase) return missingConfigResponse

  const { data, error } = await supabase!.from('bookings').select('*')
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json(data)
}