'use client'

import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'

interface Booking {
  id: string
  date: string
  status: string
  services: { name: string } | { name: string }[]
  created_at: string
}

interface Payment {
  amount: number
  status: string
  booking_id: string
}

interface PendingPayment {
  id: string
  amount: number
  status: string
  bookings: Booking
}

function serviceName(booking?: Booking) {
  const services = booking?.services
  if (!services) return 'Unassigned service'
  return Array.isArray(services) ? services[0]?.name || 'Unassigned service' : services.name
}

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [revenue, setRevenue] = useState(0)
  const [paidBookings, setPaidBookings] = useState(0)
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [noShow, setNoShow] = useState<Booking[]>([])

  useEffect(() => {
    async function fetchData() {
      if (!supabaseConfigured || !supabase) return

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .order('created_at', { ascending: false }) || { data: null }
      const normalizedBookings = (bookingsData || []) as Booking[]
      setBookings(normalizedBookings)

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status, booking_id')
        .eq('status', 'completed')
      const completedPayments = (payments || []) as Payment[]
      setRevenue(completedPayments.reduce((sum, payment) => sum + payment.amount, 0))
      setPaidBookings(completedPayments.length)

      const { data: pending } = await supabase
        .from('payments')
        .select('*, bookings(*)')
        .eq('status', 'pending')
      setPendingPayments((pending || []) as PendingPayment[])

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      setNoShow(
        normalizedBookings.filter((booking) => {
          const created = new Date(booking.created_at)
          return created < yesterday && !completedPayments.some((payment) => payment.booking_id === booking.id)
        })
      )
    }

    fetchData()
  }, [])

  const totalBookings = bookings.length
  const conversionRate = totalBookings > 0 ? ((paidBookings / totalBookings) * 100).toFixed(1) : '0'

  return (
    <main className="kx-shell">
      <section className="kx-dashboard">
        <header className="kx-dashboard-header">
          <div>
            <p className="kx-eyebrow">Kaizrug Command Ledger</p>
            <h1 className="kx-dashboard-title">Bookings, money, recovery.</h1>
          </div>
          <p className="kx-copy max-w-md">
            A calm operating board for paid career sessions. Old-school ledger discipline,
            modern funnel intelligence.
          </p>
        </header>

        <div className="kx-dashboard-grid">
          <article className="kx-dashboard-card">
            <span className="kx-stat-label">Total Revenue</span>
            <strong className="kx-stat-value">{revenue} AED</strong>
          </article>
          <article className="kx-dashboard-card">
            <span className="kx-stat-label">Total Bookings</span>
            <strong className="kx-stat-value">{totalBookings}</strong>
          </article>
          <article className="kx-dashboard-card">
            <span className="kx-stat-label">Conversion Rate</span>
            <strong className="kx-stat-value">{conversionRate}%</strong>
          </article>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <section className="kx-dashboard-card">
            <h2 className="text-2xl">Pending Payments</h2>
            <div className="kx-list">
              {pendingPayments.length === 0 ? (
                <p className="kx-list-item">No pending payments.</p>
              ) : (
                pendingPayments.map((payment) => (
                  <p key={payment.id} className="kx-list-item">
                    {serviceName(payment.bookings)} - {payment.amount} AED - {payment.status}
                  </p>
                ))
              )}
            </div>
          </section>

          <section className="kx-dashboard-card">
            <h2 className="text-2xl">No-Show Recovery</h2>
            <div className="kx-list">
              {noShow.length === 0 ? (
                <p className="kx-list-item">No recovery queue yet.</p>
              ) : (
                noShow.map((booking) => (
                  <p key={booking.id} className="kx-list-item">
                    {serviceName(booking)} - {booking.date}
                  </p>
                ))
              )}
            </div>
          </section>

          <section className="kx-dashboard-card">
            <h2 className="text-2xl">All Bookings</h2>
            <div className="kx-list">
              {bookings.length === 0 ? (
                <p className="kx-list-item">No bookings loaded.</p>
              ) : (
                bookings.map((booking) => (
                  <p key={booking.id} className="kx-list-item">
                    {serviceName(booking)} - {booking.date} - {booking.status}
                  </p>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
