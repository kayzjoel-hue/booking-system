import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Payment persistence is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 500 }
    )
  }
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const stripePaymentId = body?.stripe_payment_id
    if (typeof stripePaymentId !== 'string' || !stripePaymentId.trim()) {
      return NextResponse.json({ error: 'stripe_payment_id is required.' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ success: false, status: paymentIntent.status })
    }

    const bookingId = paymentIntent.metadata?.booking_id
    if (!bookingId || paymentIntent.currency !== 'aed') {
      return NextResponse.json(
        { error: 'Payment metadata or currency does not match the booking flow.' },
        { status: 409 }
      )
    }

    const { data: payment, error: lookupError } = await supabaseAdmin
      .from('payments')
      .select('id, booking_id, amount, status')
      .eq('stripe_payment_id', paymentIntent.id)
      .maybeSingle()

    if (lookupError) {
      console.error('Payment lookup failed', lookupError)
      return NextResponse.json({ error: 'Unable to verify payment record.' }, { status: 500 })
    }
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }
    if (payment.booking_id !== bookingId) {
      return NextResponse.json({ error: 'Payment booking does not match.' }, { status: 409 })
    }

    const expectedAmount = Math.round(Number(payment.amount) * 100)
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || paymentIntent.amount !== expectedAmount) {
      return NextResponse.json({ error: 'Payment amount does not match the stored booking payment.' }, { status: 409 })
    }

    // A retry after a successful update is safe and does not create another transition.
    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, status: 'completed' })
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id)
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('Payment status update failed', updateError)
      return NextResponse.json({ error: 'Payment was verified but could not be saved.' }, { status: 500 })
    }
    if (!updatedPayment) {
      return NextResponse.json({ error: 'Payment status was not updated.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'completed' })
  } catch (error) {
    console.error('Payment verification failed', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
