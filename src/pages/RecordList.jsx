import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function RecordList() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchSummaries() }, [])

  const fetchSummaries = async () => {
    setLoading(true)
    const { data } = await supabase.from('records').select('*').order('record_date', { ascending: false })

    if (data) {
      const grouped = {}
      for (const r of data) {
        if (!grouped[r.person_name]) grouped[r.person_name] = { totalReceived: 0, totalPaid: 0 }
        if (r.direction === 'received') grouped[r.person_name].totalReceived += r.amount
        else grouped[r.person_name].totalPaid += r.amount
      }
      setSummaries(Object.entries(grouped).map(([name, d]) => ({
        person_name: name,
        ...d,
      })))
    }
    setLoading(false)
  }

  const filtered = search.trim()
    ? summaries.filter((s) => s.person_name.includes(search.trim()))
    : []

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">搜索</h1>

      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="输入姓名搜索..."
          autoFocus
          className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-lg">✕</button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : !search.trim() ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p>输入姓名开始搜索</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p>没有找到 "{search}" 的相关记录</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-3">找到 {filtered.length} 人</p>
          {filtered.map((s) => {
            const balance = s.totalReceived - s.totalPaid
            return (
              <button
                key={s.person_name}
                onClick={() => navigate(`/person/${encodeURIComponent(s.person_name)}`)}
                className="w-full bg-white rounded-xl p-4 shadow-sm mb-2 flex items-center justify-between active:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
                    {s.person_name.charAt(0)}
                  </div>
                  <span className="text-base font-medium">{s.person_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600">收 ¥{s.totalReceived}</span>
                  <span className="text-orange-600">支 ¥{s.totalPaid}</span>
                  {balance > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">待还 ¥{balance}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
