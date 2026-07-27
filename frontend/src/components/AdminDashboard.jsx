import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'admin_token'

function LoginForm({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error('Invalid token')
      }
      localStorage.setItem(TOKEN_KEY, token)
      onLogin(token)
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-50 dark:bg-brand-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-brand-800 rounded-2xl p-6 shadow-sm border border-brand-100 dark:border-white/10">
          <h1 className="text-2xl font-black mb-2 text-brand-900 dark:text-brand-50">Professor Pepe</h1>
          <p className="text-sm text-brand-600 dark:text-brand-400 mb-6">Analytics Dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-brand-900 dark:text-brand-50">
                Admin Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your admin token"
                className="w-full px-4 py-2 border border-brand-200 dark:border-white/10 rounded-lg bg-white dark:bg-brand-700 text-brand-900 dark:text-brand-50 placeholder-brand-500 focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-brand-300 dark:disabled:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>

          <p className="text-xs text-brand-600 dark:text-brand-400 mt-4">
            Set the <code className="bg-brand-100 dark:bg-brand-700 px-1 rounded">ADMIN_TOKEN</code> environment variable to access.
          </p>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-brand-800 rounded-2xl p-4 shadow-sm border border-brand-100 dark:border-white/10">
      <h3 className="text-sm font-bold mb-3 text-brand-900 dark:text-brand-50">{title}</h3>
      {children}
    </div>
  )
}

function CountList({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-brand-500 dark:text-brand-400">No data yet.</p>
  }
  return (
    <ul className="space-y-1">
      {Object.entries(data).map(([key, count]) => (
        <li key={key} className="flex justify-between text-xs sm:text-sm">
          <span className="text-brand-700 dark:text-brand-300 capitalize">{key}</span>
          <span className="font-medium text-brand-900 dark:text-brand-50">{count}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(7)

  const handleLogin = (newToken) => {
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setData(null)
  }

  useEffect(() => {
    if (!token) return

    fetch(`${API_BASE}/api/analytics?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401) {
          handleLogout()
          throw new Error('Token expired')
        }
        return res.ok ? res.json() : Promise.reject(new Error('Failed to load'))
      })
      .then(setData)
      .catch(setError)
  }, [days, token])

  if (!token) {
    return <LoginForm onLogin={handleLogin} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-2">Could not load analytics.</p>
          <a href="/" className="text-accent hover:underline text-sm">Back to Chat</a>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-brand-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-brand-900 text-brand-900 dark:text-brand-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black">Professor Pepe Analytics</h1>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
            <a href="/" className="text-sm px-3 py-1 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors">Back to Chat</a>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium mr-2">Last</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white dark:bg-brand-800 border border-brand-200 dark:border-white/10 rounded-lg px-3 py-1 text-sm"
          >
            <option value={1}>24 hours</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card title="Total Events">
            <p className="text-2xl font-black">{data.total_events}</p>
          </Card>
          <Card title="Unique Sessions">
            <p className="text-2xl font-black">{data.unique_sessions}</p>
          </Card>
          <Card title="Unique Cookies">
            <p className="text-2xl font-black">{data.unique_cookies}</p>
          </Card>
          <Card title="Avg Latency">
            <p className="text-2xl font-black">{data.avg_latency_ms ? `${data.avg_latency_ms}ms` : '-'}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card title="Commands"><CountList data={data.command_counts} /></Card>
          <Card title="Languages"><CountList data={data.language_counts} /></Card>
          <Card title="Countries"><CountList data={data.country_counts} /></Card>
          <Card title="Devices"><CountList data={data.device_counts} /></Card>
          <Card title="Operating Systems"><CountList data={data.os_counts} /></Card>
          <Card title="Feedback"><CountList data={data.feedback_counts} /></Card>
          <Card title="Conversions"><CountList data={data.conversion_counts} /></Card>
          <Card title="Top Topics"><CountList data={Object.fromEntries((data.top_topics || []).map((t) => [t.keyword, t.count]))} /></Card>
          <Card title="Daily Events">
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {data.daily_events.map((d) => (
                <li key={d.date} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-brand-700 dark:text-brand-300">{d.date}</span>
                  <span className="font-medium">{d.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
