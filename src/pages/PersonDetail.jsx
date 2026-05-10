import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const EVENT_TYPES = ['红事', '白事', '生日', '升学', '乔迁', '其他']
const TYPE_ICONS = { '红事': '🔴', '白事': '⚪', '生日': '🎂', '升学': '🎓', '乔迁': '🏠', '其他': '📌' }

export default function PersonDetail() {
  const { name } = useParams()
  const navigate = useNavigate()
  const personName = decodeURIComponent(name)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { fetchRecords() }, [name])

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

  const startEdit = (r) => {
    setEditId(r.id)
    setEditForm({ ...r })
  }

  const saveEdit = async () => {
    const { id, person_name, event_type, event_desc, amount, record_date, direction, notes } = editForm
    await supabase.from('records').update({
      person_name, event_type, event_desc,
      amount: parseInt(amount, 10),
      record_date, direction, notes
    }).eq('id', id)
    setEditId(null)
    fetchRecords()
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条记录？')) return
    await supabase.from('records').delete().eq('id', id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const totalReceived = records.filter((r) => r.direction === 'received').reduce((s, r) => s + r.amount, 0)
  const totalPaid = records.filter((r) => r.direction === 'paid').reduce((s, r) => s + r.amount, 0)
  const balance = totalReceived - totalPaid

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <h1 className="text-2xl font-bold">{personName}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
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

      {/* Quick return form */}
      <AddReturnForm personName={personName} onAdded={() => fetchRecords()} />

      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-8">暂无记录</div>
      ) : (
        <div className="space-y-2">
          {records.map((r) =>
            editId === r.id ? (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm ring-2 ring-red-400 space-y-3">
                <div className="flex gap-2">
                  <input type="text" value={editForm.person_name || ''} onChange={(e) => setEditForm({ ...editForm, person_name: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="姓名" />
                  <input type="number" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="金额" />
                </div>
                <div className="flex gap-2">
                  <select value={editForm.event_type || '红事'} onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={editForm.direction || 'received'} onChange={(e) => setEditForm({ ...editForm, direction: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="received">收礼</option>
                    <option value="paid">还礼</option>
                  </select>
                  <input type="date" value={editForm.record_date || ''} onChange={(e) => setEditForm({ ...editForm, record_date: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <input type="text" value={editForm.event_desc || ''} onChange={(e) => setEditForm({ ...editForm, event_desc: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="事件描述" />
                <input type="text" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="备注" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm">保存</button>
                  <button onClick={() => setEditId(null)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">取消</button>
                </div>
              </div>
            ) : (
              <button key={r.id} onClick={() => startEdit(r)} className="w-full bg-white rounded-xl p-4 shadow-sm text-left">
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
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }} className="text-xs text-gray-300 hover:text-red-400">删除</button>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function AddReturnForm({ personName, onAdded }) {
  const [amount, setAmount] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!amount) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id

    // Find pending received records to auto-link
    const { data: pending } = await supabase.from('records')
      .select('id').eq('person_name', personName).eq('direction', 'received')
      .eq('status', 'pending').order('record_date', { ascending: true }).limit(1)

    const linked_id = pending?.[0]?.id || null

    await supabase.from('records').insert({
      user_id, person_name: personName,
      amount: parseInt(amount, 10),
      event_type: '其他', record_date: new Date().toISOString().split('T')[0],
      direction: 'paid', linked_record_id: linked_id,
      status: 'none',
    })

    // Mark linked record as settled
    if (linked_id) {
      await supabase.from('records').update({ status: 'settled' }).eq('id', linked_id)
    }

    setSaving(false)
    setAmount('')
    setShow(false)
    onAdded()
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="w-full py-3 mb-4 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-medium">
        + 添加还礼
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="还礼金额" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <button onClick={handleAdd} disabled={saving || !amount}
          className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
          确定
        </button>
        <button onClick={() => setShow(false)} className="px-4 py-3 text-gray-400 text-sm">取消</button>
      </div>
    </div>
  )
}
