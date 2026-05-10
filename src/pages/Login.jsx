import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else if (isSignUp) {
      setMessage('注册成功！请直接登录（如已启用邮箱确认请查看邮箱）')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-red-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-red-800 mb-2">人情簿</h1>
        <p className="text-center text-gray-500 mb-8">红白喜事，人情往来，一笔不落</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少6位"
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '请稍候...' : isSignUp ? '注册' : '登录'}
          </button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
            className="w-full text-sm text-gray-500 py-1"
          >
            {isSignUp ? '已有账号？点此登录' : '没有账号？点此注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
