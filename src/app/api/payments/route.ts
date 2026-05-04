import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase, supabaseConfigured } from '@/lib/supabase'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-08-16',
    })
  : null

const missingConfigResponse = NextResponse.json(
  { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
  { status: 500 }
)

export async function POST(request: NextRequest) {
  if (!supabaseConfigured || !supabase) return missingConfigResponse
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 500 }
    )
  }

  const { booking_id } = await request.json()
  if (!booking_id || typeof booking_id !== 'string') {
    return NextResponse.json({ error: 'booking_id is required.' }, { status: 400 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, services(price)')
    .eq('id', booking_id)
    .single()

  const service = Array.isArray(booking?.services)
    ? booking.services[0]
    : booking?.services
  const price = service?.price
  if (bookingError || typeof price !== 'number' || price <= 0) {
    return NextResponse.json(
      { error: 'Unable to resolve a valid booking price.' },
      { status: 400 }
    )
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(price * 100),
    currency: 'aed',
    metadata: { booking_id },
  })

  const { error } = await supabase
    .from('payments')
    .insert([{ booking_id, amount: price, status: 'pending', stripe_payment_id: paymentIntent.id }])
  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ client_secret: paymentIntent.client_secret })
}
