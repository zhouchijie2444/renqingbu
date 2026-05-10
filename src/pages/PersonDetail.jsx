import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const TYPE_ICONS = { '红事': '🔴', '白事': '⚪', '生日': '🎂', '升学': '🎓', '乔迁': '🏠', '其他': '📌' }

export default function PersonDetail() {
  const { name } = useParams()
  const navigate = useNavigate()
  const personName = decodeURIComponent(name)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecords()
  }, [name])

  const fetchRecords = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('records')
      .select('*')
      .eq('person_name', personName)
      .order('record_date', { ascending: false })

    setRecords(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条记录？')) return
    const { error } = await supabase.from('records').delete().eq('id', id)
    if (error) {
      alert('删除失败: ' + error.message)
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }

  const totalReceived = records.filter((r) => r.direction === 'received').reduce((s, r) => s + r.amount, 0)
  const totalPaid = records.filter((r) => r.direction === 'paid').reduce((s, r) => s + r.amount, 0)
  const balance = totalReceived - totalPaid

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <h1 className="text-2xl font-bold">{personName}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xs text-green-600 mb-1">总收礼</div>
          <div className="text-lg font-bold text-green-700">¥{totalReceived}</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <div className="text-xs text-orange-600 mb-1">总还礼</div>
          <div className="text-lg font-bold text-orange-700">¥{totalPaid}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${balance > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-500 mb-1">差额</div>
          <div className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {balance > 0 ? `待还¥${balance}` : '已清'}
          </div>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-8">暂无记录</div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">{r.record_date}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.direction === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {r.direction === 'received' ? '收礼' : '还礼'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{TYPE_ICONS[r.event_type]}</span>
                  <span className="text-sm">{r.event_type}</span>
                  {r.event_desc && <span className="text-sm text-gray-400">· {r.event_desc}</span>}
                </div>
                <span className="text-lg font-semibold">¥{r.amount}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">
                  {r.relationship && <span>{r.relationship}</span>}
                  {r.notes && <span> · {r.notes}</span>}
                  {r.status === 'settled' && <span className="text-green-500 ml-2">✓ 已还清</span>}
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-gray-300 hover:text-red-400">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
