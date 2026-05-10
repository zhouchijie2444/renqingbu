import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalReceived: 0, totalPaid: 0, pending: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    const thisYear = new Date().getFullYear()
    const { data } = await supabase
      .from('records')
      .select('*')
      .gte('record_date', `${thisYear}-01-01`)
      .order('record_date', { ascending: false })

    const records = data || []
    const totalReceived = records.filter((r) => r.direction === 'received').reduce((s, r) => s + r.amount, 0)
    const totalPaid = records.filter((r) => r.direction === 'paid').reduce((s, r) => s + r.amount, 0)
    const pending = records.filter((r) => r.direction === 'received' && r.status === 'pending')

    setStats({ totalReceived, totalPaid, pending })
    setLoading(false)
  }

  const pendingCount = stats.pending.length

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">人情簿</h1>
      <p className="text-sm text-gray-400 mb-4">红白喜事，一笔不落</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: '今年收礼', value: `¥${stats.totalReceived}`, color: 'text-green-700', bg: 'bg-green-50' },
          { label: '今年还礼', value: `¥${stats.totalPaid}`, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: '净支出', value: `¥${stats.totalPaid - stats.totalReceived}`, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: '待还人数', value: `${pendingCount}人`, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4`}>
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/add')}
          className="py-4 bg-red-600 text-white rounded-xl font-medium text-base active:bg-red-700"
        >
          手动添加
        </button>
        <button
          onClick={() => navigate('/add?tab=photo')}
          className="py-4 bg-white border-2 border-red-400 text-red-600 rounded-xl font-medium text-base active:bg-red-50"
        >
          拍照添加
        </button>
      </div>

      {/* Pending list */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          待还人情
          {pendingCount > 0 && <span className="text-red-500 ml-1">({pendingCount})</span>}
        </h2>
        {loading ? (
          <div className="text-center text-gray-400 py-4">加载中...</div>
        ) : stats.pending.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">--</div>
            <p className="text-sm">没有人情待还，太棒了！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.pending.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/person/${encodeURIComponent(item.person_name)}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between active:bg-gray-50 text-left"
              >
                <div>
                  <div className="font-medium">{item.person_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.event_type} · {item.event_desc} · {item.record_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-semibold">¥{item.amount}</div>
                  <div className="text-xs text-gray-400">{item.relationship}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={async () => { await supabase.auth.signOut() }}
        className="w-full mt-8 py-3 text-gray-400 text-sm active:text-gray-600"
      >
        退出登录
      </button>
    </div>
  )
}
