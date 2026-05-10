import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const EVENT_TYPES = ['全部', '红事', '白事', '生日', '升学', '乔迁', '其他']

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalReceived: 0, totalPaid: 0 })
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const [year, setYear] = useState('今年')

  useEffect(() => { fetchData() }, [year])

  const fetchData = async () => {
    setLoading(true)
    const thisYear = new Date().getFullYear()

    let query = supabase.from('records').select('*').order('record_date', { ascending: false })
    if (year === '今年') query = query.gte('record_date', `${thisYear}-01-01`)
    else if (year === '去年') query = query.gte('record_date', `${thisYear - 1}-01-01`).lt('record_date', `${thisYear}-01-01`)

    const { data } = await query
    const records = data || []

    const totalReceived = records.filter((r) => r.direction === 'received').reduce((s, r) => s + r.amount, 0)
    const totalPaid = records.filter((r) => r.direction === 'paid').reduce((s, r) => s + r.amount, 0)

    // Group by person
    const grouped = {}
    for (const r of records) {
      if (!grouped[r.person_name]) grouped[r.person_name] = { totalReceived: 0, totalPaid: 0, eventTypes: new Set() }
      if (r.direction === 'received') grouped[r.person_name].totalReceived += r.amount
      else grouped[r.person_name].totalPaid += r.amount
      grouped[r.person_name].eventTypes.add(r.event_type)
    }
    const list = Object.entries(grouped).map(([name, d]) => ({
      person_name: name,
      totalReceived: d.totalReceived,
      totalPaid: d.totalPaid,
      eventTypes: [...d.eventTypes],
    }))

    setStats({ totalReceived, totalPaid })
    setSummaries(list)
    setLoading(false)
  }

  let filtered = summaries
  if (search) filtered = filtered.filter((s) => s.person_name.includes(search))
  if (filter !== '全部') filtered = filtered.filter((s) => s.eventTypes.includes(filter))

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed top section */}
      <div className="shrink-0 p-4 pb-2 bg-gray-50">
        <h1 className="text-2xl font-bold mb-1">人情簿</h1>

        {/* Stats: only 收礼 and 支出 */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">总收礼</div>
            <div className="text-xl font-bold text-green-700">¥{stats.totalReceived}</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">总支出</div>
            <div className="text-xl font-bold text-orange-700">¥{stats.totalPaid}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => navigate('/add')}
            className="py-3 bg-red-600 text-white rounded-xl font-medium text-sm active:bg-red-700"
          >
            手动添加
          </button>
          <button
            onClick={() => navigate('/add?tab=photo')}
            className="py-3 bg-white border-2 border-red-400 text-red-600 rounded-xl font-medium text-sm active:bg-red-50"
          >
            拍照添加
          </button>
        </div>

        {/* Year filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {['今年', '去年', '全部'].map((y) => (
            <button
              key={y} onClick={() => setYear(y)}
              className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap ${year === y ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pt-2 pb-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${filter === t ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable records list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-3">📋</div>
            <p>暂无记录</p>
          </div>
        ) : (
          filtered.map((s) => {
            const balance = s.totalReceived - s.totalPaid
            return (
              <LongPressRow
                key={s.person_name}
                personName={s.person_name}
                totalReceived={s.totalReceived}
                totalPaid={s.totalPaid}
                balance={balance}
                onDelete={() => setSummaries((prev) => prev.filter((x) => x.person_name !== s.person_name))}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

function LongPressRow({ personName, totalReceived, totalPaid, balance, onDelete }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const [showDel, setShowDel] = useState(false)

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(50)
      setShowDel(true)
    }, 600)
  }

  const cancelPress = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const handleDelete = async () => {
    setShowDel(false)
    await supabase.from('records').delete().eq('person_name', personName)
    onDelete()
  }

  return (
    <>
      <button
        onTouchStart={startPress} onTouchEnd={cancelPress} onTouchMove={cancelPress}
        onMouseDown={startPress} onMouseUp={cancelPress} onMouseLeave={cancelPress}
        onClick={() => navigate(`/person/${encodeURIComponent(personName)}`)}
        className="w-full bg-white rounded-xl p-4 shadow-sm mb-2 flex items-center justify-between active:bg-gray-50 text-left select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
            {personName.charAt(0)}
          </div>
          <span className="text-base font-medium">{personName}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600">收 ¥{totalReceived}</span>
          <span className="text-orange-600">支 ¥{totalPaid}</span>
          {balance > 0 && (
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">待还 ¥{balance}</span>
          )}
        </div>
      </button>

      {showDel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowDel(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 pb-safe" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-sm text-gray-500 mb-3">{personName}</div>
            <button onClick={handleDelete} className="w-full py-4 text-base font-medium text-red-500">
              🗑️ 删除全部记录
            </button>
            <button onClick={() => setShowDel(false)} className="w-full py-4 text-base text-gray-400 mt-1">
              取消
            </button>
          </div>
        </div>
      )}

    </>
  )
}
