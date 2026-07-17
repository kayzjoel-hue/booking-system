import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

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

  const { stripe_payment_id } = await request.json()
  if (!stripe_payment_id || typeof stripe_payment_id !== 'string') {
    return NextResponse.json({ error: 'stripe_payment_id is required.' }, { status: 400 })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(stripe_payment_id)

    if (paymentIntent.status === 'succeeded') {
      await supabase!
        .from('payments')
        .update({ status: 'completed' })
        .eq('stripe_payment_id', paymentIntent.id)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, status: paymentIntent.status })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
