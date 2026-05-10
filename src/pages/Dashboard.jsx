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

  const handleDelete = (name) => {
    setSummaries((prev) => prev.filter((x) => x.person_name !== name))
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed top */}
      <div className="shrink-0 p-4 pb-2 bg-gray-50">
        <h1 className="text-2xl font-bold mb-1">人情簿</h1>

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

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-5xl mb-3">📋</div>
            <p>暂无记录</p>
          </div>
        ) : (
          filtered.map((s) => (
            <SwipeRow
              key={s.person_name}
              personName={s.person_name}
              totalReceived={s.totalReceived}
              totalPaid={s.totalPaid}
              balance={s.totalReceived - s.totalPaid}
              onDelete={() => handleDelete(s.person_name)}
              onRename={(newName) => {
                setSummaries((prev) =>
                  prev.map((x) => (x.person_name === s.person_name ? { ...x, person_name: newName } : x))
                )
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SwipeRow({ personName, totalReceived, totalPaid, balance, onDelete, onRename }) {
  const navigate = useNavigate()
  const rowRef = useRef(null)
  const startX = useRef(0)
  const [swiped, setSwiped] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(personName)
  const [expanded, setExpanded] = useState(false)
  const [records, setRecords] = useState([])

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
  }

  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current
    if (dx < -30) {
      const el = rowRef.current
      if (el) el.style.transform = `translateX(-80px)`
      setSwiped(true)
    } else if (dx > 30 && swiped) {
      const el = rowRef.current
      if (el) el.style.transform = `translateX(0)`
      setSwiped(false)
    }
  }

  const onTouchEnd = () => {
    if (!swiped) {
      const el = rowRef.current
      if (el) el.style.transform = `translateX(0)`
    }
  }

  const handleRename = async () => {
    if (editName.trim() && editName !== personName) {
      await supabase.from('records').update({ person_name: editName.trim() }).eq('person_name', personName)
      onRename(editName.trim())
    }
    setEditing(false)
  }

  const toggleExpand = async (e) => {
    e.stopPropagation()
    if (!expanded) {
      const { data } = await supabase.from('records').select('*').eq('person_name', personName).order('record_date', { ascending: false })
      setRecords(data || [])
    }
    setExpanded(!expanded)
  }

  const updateAmount = async (id, newAmount) => {
    const val = parseInt(newAmount, 10)
    if (!val || val <= 0) return
    await supabase.from('records').update({ amount: val }).eq('id', id)
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, amount: val } : r))
  }

  return (
    <div className="relative overflow-hidden mb-2 rounded-xl">
      <button
        onClick={async () => {
          await supabase.from('records').delete().eq('person_name', personName)
          onDelete()
        }}
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 text-white font-medium text-sm flex items-center justify-center rounded-r-xl"
      >
        删除
      </button>

      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative bg-white p-4 shadow-sm transition-transform duration-200 select-none"
        style={{ transform: 'translateX(0)' }}
      >
        <div className="flex items-center justify-between" onClick={() => { if (swiped) { setSwiped(false); return } }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg shrink-0">
              {personName.charAt(0)}
            </div>
            {editing ? (
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={handleRename} autoFocus
                className="text-base font-medium px-2 py-1 rounded border border-red-300 w-24" onClick={(e) => e.stopPropagation()} />
            ) : (
              <span className="text-base font-medium truncate"
                onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(personName) }}>
                {personName}
              </span>
            )}
          </div>
          <button onClick={toggleExpand} className="text-sm shrink-0 flex items-center gap-1">
            <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>收 ¥{totalReceived}</span>
            {totalPaid > 0 && <span className="text-orange-500 text-xs">还 ¥{totalPaid}</span>}
            {balance > 0 ? (
              <span className="bg-red-100 text-red-500 text-xs px-1.5 py-0.5 rounded">待 ¥{balance}</span>
            ) : (
              <span className="text-green-500 text-xs">✓</span>
            )}
            <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
          </button>
        </div>

        {expanded && records.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 w-20 shrink-0">{r.record_date}</span>
                <span className="text-gray-500 w-10 shrink-0">{r.event_type}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${r.direction === 'received' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'} shrink-0`}>
                  {r.direction === 'received' ? '收' : '支'}
                </span>
                <input
                  type="number" defaultValue={r.amount}
                  onBlur={(e) => updateAmount(r.id, e.target.value)}
                  className="flex-1 px-2 py-1 rounded border border-gray-200 text-right text-sm min-w-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-gray-400 shrink-0">元</span>
              </div>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/person/${encodeURIComponent(personName)}`) }}
              className="w-full text-center text-xs text-red-400 py-1"
            >
              查看更多 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
