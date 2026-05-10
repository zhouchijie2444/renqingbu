import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const EVENT_TYPES = ['全部', '红事', '白事', '生日', '升学', '乔迁', '其他']

export default function RecordList() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部')
  const [year, setYear] = useState('今年')

  useEffect(() => {
    fetchSummaries()
  }, [year])

  const fetchSummaries = async () => {
    setLoading(true)
    let query = supabase.from('records').select('person_name, direction, amount, event_type, record_date')

    const now = new Date()
    if (year === '今年') {
      query = query.gte('record_date', `${now.getFullYear()}-01-01`)
    } else if (year === '去年') {
      query = query.gte('record_date', `${now.getFullYear() - 1}-01-01`).lt('record_date', `${now.getFullYear()}-01-01`)
    }

    const { data, error } = await query.order('record_date', { ascending: false })

    if (!error && data) {
      const grouped = {}
      for (const r of data) {
        if (!grouped[r.person_name]) {
          grouped[r.person_name] = { totalReceived: 0, totalPaid: 0, eventTypes: new Set() }
        }
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
      setSummaries(list)
    }
    setLoading(false)
  }

  let filtered = summaries
  if (search) filtered = filtered.filter((s) => s.person_name.includes(search))
  if (filter !== '全部') filtered = filtered.filter((s) => s.eventTypes.includes(filter))

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">人情记录</h1>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索姓名..."
          className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-lg">✕</button>
        )}
      </div>

      {/* Year tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {['今年', '去年', '全部'].map((y) => (
          <button
            key={y} onClick={() => setYear(y)}
            className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap ${year === y ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        {EVENT_TYPES.map((t) => (
          <button
            key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${filter === t ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-5xl mb-3">📋</div>
          <p>暂无记录</p>
          <p className="text-sm mt-1">点击下方"添加"开始记录</p>
        </div>
      ) : (
        <div className="mt-4">
          {filtered.map((s) => {
            const balance = s.totalReceived - s.totalPaid
            return (
              <LongPressRow
                key={s.person_name}
                personName={s.person_name}
                totalReceived={s.totalReceived}
                totalPaid={s.totalPaid}
                balance={balance}
                onDelete={() => {
                  setSummaries((prev) => prev.filter((x) => x.person_name !== s.person_name))
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function LongPressRow({ personName, totalReceived, totalPaid, balance, onDelete }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const [showMenu, setShowMenu] = useState(false)

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(50)
      setShowMenu(true)
    }, 600)
  }

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleEdit = () => {
    setShowMenu(false)
    navigate(`/person/${encodeURIComponent(personName)}`)
  }

  const handleDelete = async () => {
    setShowMenu(false)
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('person_name', personName)
    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      onDelete()
    }
  }

  return (
    <>
      <button
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onClick={() => navigate(`/person/${encodeURIComponent(personName)}`)}
        className={`w-full bg-white rounded-xl p-4 shadow-sm mb-2 flex items-center justify-between active:bg-gray-50 text-left select-none ${showMenu ? 'ring-2 ring-red-400' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
            {personName.charAt(0)}
          </div>
          <div>
            <span className="text-base font-medium">{personName}</span>
            <div className="text-xs text-gray-400">长按操作</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600">收 ¥{totalReceived}</span>
          <span className="text-orange-600">还 ¥{totalPaid}</span>
          {balance > 0 && (
            <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">待还 ¥{balance}</span>
          )}
        </div>
      </button>

      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 pb-safe animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-center text-sm text-gray-500 mb-3">{personName}</div>
            <button
              onClick={handleEdit}
              className="w-full py-4 text-base font-medium text-gray-900 border-b border-gray-100"
            >
              ✏️ 修改记录
            </button>
            <button
              onClick={handleDelete}
              className="w-full py-4 text-base font-medium text-red-500 border-b border-gray-100"
            >
              🗑️ 删除全部
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full py-4 text-base text-gray-400 mt-1"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-slide-up { animation: slide-up 0.2s ease-out; }`}</style>
    </>
  )
}
