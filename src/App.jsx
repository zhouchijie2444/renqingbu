import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RecordList from './pages/RecordList'
import AddRecord from './pages/AddRecord'
import PersonDetail from './pages/PersonDetail'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<RecordList />} />
        <Route path="/add" element={<AddRecord />} />
        <Route path="/person/:name" element={<PersonDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { to: '/', label: '首页', icon: '📊' },
    { to: '/search', label: '搜索', icon: '🔍' },
    { to: '/add', label: '添加', icon: '➕' },
  ]

  // Don't show nav on person detail page
  if (location.pathname.startsWith('/person/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              className={`flex flex-col items-center px-6 py-1 text-xs gap-1 ${isActive ? 'text-red-600' : 'text-gray-400'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
