'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Service {
  id: string
  name: string
  price: number
}

const DEFAULT_SERVICES: Service[] = [
  { id: 'cv-fix', name: 'CV Upgrade', price: 50 },
  { id: 'interview-prep', name: 'Interview Prep', price: 100 },
]

export default function Home() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [loading, setLoading] = useState(false)
  const [serviceLoading, setServiceLoading] = useState(true)
  const router = useRouter()

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-700 mb-4">
            Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    async function fetchServices() {
      if (!supabaseConfigured) {
        setServices(DEFAULT_SERVICES)
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
        try {
          console.error('Error loading services:', err)
          console.error('Error loading services (stringified):', JSON.stringify(err))
        } catch (e) {
          console.error('Error loading services and failed to stringify error', err)
        }
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
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const service_id = formData.get('service') as string

    if (!supabaseConfigured) {
      alert('Supabase is not configured. Please update your environment variables.')
      return
    }

    setLoading(true)
    try {
      const { data: user, error } = await supabase!
        .from('profiles')
        .insert([{ name, email }])
        .select()
        .single()

      console.log('captureLead response user:', user)
      console.log('captureLead response error:', error)
      if (error) throw error
      if (!user || !user.id) {
        throw new Error('Supabase returned no user id')
      }

      localStorage.setItem('user_id', user.id)
      localStorage.setItem('selected_service_id', service_id)

      router.push('/book')
    } catch (err) {
      // Improved error logging for easier debugging in dev
      try {
        console.error('captureLead error:', err)
        console.dir(err, { depth: null })
        console.error('captureLead error (stringified):', JSON.stringify(err, Object.getOwnPropertyNames(err)))
        console.error('captureLead error keys:', Object.keys(err || {}))
        console.error('captureLead error own keys:', Object.getOwnPropertyNames(err || {}))
      } catch (e) {
        console.error('captureLead error, and failed to stringify:', err)
      }

      const message =
        (err && typeof err === 'object' ? (err as any).message || (err as any).msg || (err as any).error_description : null) ||
        JSON.stringify(err, Object.getOwnPropertyNames(err || {})) ||
        String(err)
      alert(`Something went wrong. ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Get Your Hospitality CV Fixed – Land Your Dream Job in Dubai</h1>
        <form onSubmit={captureLead}>
          <div className="mb-4">
            <label className="block text-gray-700">Name</label>
            <input type="text" name="name" className="w-full p-2 border border-gray-300 rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input type="email" name="email" className="w-full p-2 border border-gray-300 rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Service</label>
            <select name="service" className="w-full p-2 border border-gray-300 rounded" required disabled={serviceLoading}>
              <option value="">Select a service</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.price} AED)
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading || serviceLoading} className="w-full bg-blue-500 text-white p-3 rounded text-lg">
            {loading ? 'Submitting...' : serviceLoading ? 'Loading services...' : 'Book a Paid Session Now'}
          </button>
        </form>
      </div>
    </div>
  )
}
