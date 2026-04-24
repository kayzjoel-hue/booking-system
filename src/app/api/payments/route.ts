import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase, supabaseConfigured } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

const missingConfigResponse = NextResponse.json(
  { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
  { status: 500 }
)

export async function POST(request: NextRequest) {
  if (!supabaseConfigured || !supabase) return missingConfigResponse

  const { booking_id, amount } = await request.json()
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: 'aed',
  })
  // Store in DB
  const { data, error } = await supabase!
    .from('payments')
    .insert([{ booking_id, amount, status: 'pending', stripe_payment_id: paymentIntent.id }])
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}