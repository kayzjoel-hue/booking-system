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

  const { stripe_payment_id } = await request.json()

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