'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigured } from '@/lib/supabase'

export default function Book() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-700">
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    )
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const date = formData.get('date') as string
    const user_id = localStorage.getItem('user_id')
    const service_id = localStorage.getItem('selected_service_id')

    if (!user_id || !service_id) {
      alert('User or service not found')
      return
    }

    if (!supabaseConfigured) {
      alert('Supabase is not configured. Please update your environment variables.')
      return
    }

    setLoading(true)
    try {
      const { data: booking, error } = await supabase!
        .from('bookings')
        .insert([{ user_id, service_id, date, status: 'pending' }])
        .select()
        .single()

      if (error) throw error

      localStorage.setItem('booking_id', booking.id)
      router.push('/pay')
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Select Your Session Date</h1>
        <form onSubmit={createBooking}>
          <div className="mb-4">
            <label className="block text-gray-700">Preferred Date</label>
            <input type="date" name="date" className="w-full p-2 border border-gray-300 rounded" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-500 text-white p-3 rounded text-lg">
            {loading ? 'Booking...' : 'Book Now'}
          </button>
        </form>
      </div>
    </div>
  )
}