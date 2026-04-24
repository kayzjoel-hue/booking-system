'use client'

import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'

interface Booking {
  id: string
  date: string
  status: string
  services: { name: string }
  created_at: string
}

interface PendingPayment {
  id: string
  amount: number
  status: string
  bookings: Booking
}

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [revenue, setRevenue] = useState(0)
  const [totalBookings, setTotalBookings] = useState(0)
  const [paidBookings, setPaidBookings] = useState(0)
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [noShow, setNoShow] = useState<Booking[]>([])

  useEffect(() => {
    async function fetchData() {
      if (!supabaseConfigured) {
        return
      }
      const { data: bookingsData } = await supabase!
        .from('bookings')
        .select('*, services(*)')
        .order('created_at', { ascending: false }) || { data: null }
      setBookings(bookingsData || [])
      setTotalBookings(bookingsData?.length || 0)

      const { data: payments } = await supabase!
        .from('payments')
        .select('amount, status, booking_id')
        .eq('status', 'completed')
      const totalRev = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
      setRevenue(totalRev)
      setPaidBookings(payments?.length || 0)

      const { data: pending } = await supabase!
        .from('payments')
        .select('*, bookings(*)')
        .eq('status', 'pending')
      setPendingPayments(pending || [])

      // No-show: bookings with pending payment older than 24h
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const noShowList = bookingsData?.filter(b => {
        const created = new Date(b.created_at)
        return created < yesterday && !payments?.some(p => p.booking_id === b.id)
      }) || []
      setNoShow(noShowList)
    }
    fetchData()
  }, [])

  const conversionRate = totalBookings > 0 ? ((paidBookings / totalBookings) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen p-4 bg-gray-100 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Total Revenue</h2>
          <p className="text-2xl">{revenue} AED</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Total Bookings</h2>
          <p className="text-2xl">{totalBookings}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Conversion Rate</h2>
          <p className="text-2xl">{conversionRate}%</p>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Pending Payments</h2>
        <ul className="bg-white p-4 rounded shadow">
          {pendingPayments.map(p => (
            <li key={p.id} className="mb-2">{p.bookings?.services?.name} - {p.amount} AED - {p.status}</li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">No-Show Recovery (Follow up needed)</h2>
        <ul className="bg-white p-4 rounded shadow">
          {noShow.map(b => (
            <li key={b.id} className="mb-2">{b.services.name} - {b.date} - Created: {new Date(b.created_at).toLocaleDateString()}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">All Bookings</h2>
        <ul className="bg-white p-4 rounded shadow">
          {bookings.map(b => (
            <li key={b.id} className="mb-2">{b.services.name} - {b.date} - {b.status}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}