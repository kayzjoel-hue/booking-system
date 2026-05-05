'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigured } from '@/lib/supabase'

interface Service {
  id: string
  name: string
  price: number
}

const DEFAULT_SERVICES: Service[] = [
  { id: 'cv-fix', name: 'CV Upgrade', price: 50 },
  { id: 'interview-prep', name: 'Interview Prep', price: 100 },
]

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const message = record.message || record.msg || record.error_description
    if (typeof message === 'string') return message
  }
  return String(error)
}

function ConfigRequired() {
  return (
    <main className="kx-shell">
      <section className="kx-card mx-auto mt-20 max-w-xl">
        <p className="kx-eyebrow">Configuration Required</p>
        <h1 className="mt-3 text-3xl">Supabase is not connected.</h1>
        <p className="kx-copy mt-4">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local before taking bookings.
        </p>
      </section>
    </main>
  )
}

export default function Home() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [loading, setLoading] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchServices() {
      if (!supabaseConfigured) {
        setServiceLoading(false)
        return
      }

      try {
        const { data, error } = await supabase?.from('services').select('*') || { data: null, error: null }
        if (error || !data || data.length === 0) {
          console.warn('Supabase services load failed, using fallback list', error)
          setServices(DEFAULT_SERVICES)
        } else {
          setServices(data)
        }
      } catch (err) {
        console.error('Error loading services:', getErrorMessage(err))
        setServices(DEFAULT_SERVICES)
      } finally {
        setServiceLoading(false)
      }
    }

    fetchServices()
  }, [])

  async function captureLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const serviceId = String(formData.get('service') || '')

    if (!supabaseConfigured || !supabase) {
      alert('Supabase is not configured. Please update your environment variables.')
      return
    }

    setLoading(true)
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .insert([{ name, email }])
        .select()
        .single()

      if (error) throw error
      if (!user?.id) throw new Error('Supabase returned no user id')

      const params = new URLSearchParams({
        user_id: user.id,
        service_id: serviceId,
      })
      router.push(`/book?${params.toString()}`)
    } catch (err) {
      const message = getErrorMessage(err)
      console.error('captureLead error:', message)
      alert(`Something went wrong. ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!supabaseConfigured) return <ConfigRequired />

  return (
    <main className="kx-shell">
      <div className="kx-grid">
        <section className="kx-hero">
          <div>
            <div className="flex items-center gap-3">
              <div className="kx-mark">KX</div>
              <div>
                <p className="kx-eyebrow">Kaizrug Career Desk</p>
                <p className="text-sm text-[var(--muted)]">Dubai hospitality booking engine</p>
              </div>
            </div>
            <h1 className="kx-title">Turn a rough CV into a booked interview path.</h1>
            <p className="kx-copy">
              A tight, paid consultation flow for hospitality workers who need clear positioning,
              better documents, and practical next steps without motivational fog.
            </p>
          </div>

          <div className="kx-proof">
            <div className="kx-proof-item">
              <span className="kx-number">01</span>
              <p className="kx-stat-label">Pick the service</p>
            </div>
            <div className="kx-proof-item">
              <span className="kx-number">02</span>
              <p className="kx-stat-label">Book the session</p>
            </div>
            <div className="kx-proof-item">
              <span className="kx-number">03</span>
              <p className="kx-stat-label">Pay and execute</p>
            </div>
          </div>
        </section>

        <aside className="kx-card">
          <p className="kx-eyebrow">Paid Session Intake</p>
          <h2 className="mt-3 text-3xl leading-tight">Start with the offer that matches the pressure.</h2>
          <form className="kx-form mt-7" onSubmit={captureLead}>
            <label className="kx-field">
              <span className="kx-label">Name</span>
              <input className="kx-input" type="text" name="name" required suppressHydrationWarning />
            </label>
            <label className="kx-field">
              <span className="kx-label">Email</span>
              <input className="kx-input" type="email" name="email" required suppressHydrationWarning />
            </label>
            <label className="kx-field">
              <span className="kx-label">Service</span>
              <select className="kx-input" name="service" required disabled={serviceLoading} suppressHydrationWarning>
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.price} AED
                  </option>
                ))}
              </select>
            </label>
            <button className="kx-button" type="submit" disabled={loading || serviceLoading} suppressHydrationWarning>
              {loading ? 'Securing lead...' : serviceLoading ? 'Loading services...' : 'Book a Paid Session'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}
