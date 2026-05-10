import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { parseOcrText } from '../utils/parseOcrText'

const EVENT_TYPES = ['红事', '白事', '生日', '升学', '乔迁', '其他']

export default function AddRecord() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    person_name: '',
    amount: '',
    event_type: '红事',
    record_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(searchParams.get('tab') === 'photo' ? 'photo' : 'manual')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.person_name.trim() || !form.amount) return
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id

    const { error } = await supabase.from('records').insert({
      user_id,
      person_name: form.person_name.trim(),
      amount: parseInt(form.amount, 10),
      event_type: form.event_type,
      record_date: form.record_date,
      direction: 'received',
      status: 'pending',
    })

    setSaving(false)
    if (error) {
      alert('保存失败: ' + error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">添加记录</h1>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button onClick={() => setTab('manual')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'manual' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
          手动填写
        </button>
        <button onClick={() => setTab('photo')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'photo' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>
          拍照识别
        </button>
      </div>

      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-4 shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input type="text" value={form.person_name} onChange={(e) => set('person_name', e.target.value)}
              required placeholder="张三"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
            <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)}
              required placeholder="500" min="1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input type="date" value={form.record_date} onChange={(e) => set('record_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">事件</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => set('event_type', t)}
                  className={`py-3 text-sm rounded-xl border ${
                    form.event_type === t ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存记录'}
          </button>
        </form>
      )}

      {tab === 'photo' && <PhotoOcrTab />}
    </div>
  )
}

function PhotoOcrTab() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [rawText, setRawText] = useState('')
  const [records, setRecords] = useState([])
  const [eventType, setEventType] = useState('红事')
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPreview(URL.createObjectURL(file))

    const fileName = `ocr/${Date.now()}-${file.name || 'photo.jpg'}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
    if (uploadError) { alert('上传失败: ' + uploadError.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    setUploading(false)
    setProcessing(true)

    try {
      // Use raw fetch so we can see the actual error response body
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(
        'https://zlrmtbclgugupeccgehx.supabase.co/functions/v1/ocr-proxy',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ imageUrl: urlData.publicUrl }),
        }
      )
      setProcessing(false)

      if (!res.ok) {
        const errBody = await res.text()
        try {
          const errJson = JSON.parse(errBody)
          alert('OCR接口返回错误 (状态码 ' + res.status + '): ' + JSON.stringify(errJson, null, 2))
        } catch {
          alert('OCR接口返回错误 (状态码 ' + res.status + '): ' + errBody)
        }
        return
      }

      const funcData = await res.json()
      if (!funcData || funcData.error) { alert('百度返回错误: ' + JSON.stringify(funcData)); return }
      if (!funcData.words_result || funcData.words_result.length === 0) { alert('未识别到文字，请拍清晰些'); return }

      const parsed = parseOcrText(funcData)
      setRawText(parsed.rawText)
      setRecords(parsed.records.map((r) => ({ ...r, event_desc: '' })))
      if (parsed.recognized.event_type) setEventType(parsed.recognized.event_type)
      if (parsed.recognized.record_date) setRecordDate(parsed.recognized.record_date)
    } catch (err) {
      setProcessing(false)
      alert('网络错误: ' + (err.message || '未知错误'))
    }
  }

  const updateRecord = (idx, field, value) => {
    setRecords((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next })
  }

  const addRow = () => {
    setRecords((prev) => [...prev, { person_name: '', amount: '', event_desc: '' }])
  }

  const removeRow = (idx) => {
    setRecords((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleBatchSave = async () => {
    const valid = records.filter((r) => r.person_name.trim() && r.amount)
    if (valid.length === 0) { alert('没有可保存的记录'); return }
    if (!confirm(`确认导入 ${valid.length} 条记录？`)) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id

    const rows = valid.map((r) => ({
      user_id, person_name: r.person_name.trim(), amount: parseInt(r.amount, 10),
      event_type: eventType, event_desc: (r.event_desc || '').trim(),
      record_date: recordDate, direction: 'received', status: 'pending',
    }))

    const { error } = await supabase.from('records').insert(rows)
    setSaving(false)
    if (error) { alert('保存失败: ' + error.message) } else { navigate('/') }
  }

  return (
    <div className="space-y-4">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {!preview ? (
        <div className="bg-white rounded-2xl p-4 shadow space-y-3">
          <div className="text-center text-gray-400 py-8">
            <div className="text-5xl mb-3">📷</div>
            <p className="text-base">拍照或选择照片</p>
            <p className="text-xs mt-1">支持拍摄纸质本子整页，批量识别</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraRef.current?.click()} className="py-4 bg-red-600 text-white rounded-xl font-medium text-base active:bg-red-700">📷 拍照</button>
            <button onClick={() => galleryRef.current?.click()} className="py-4 bg-white border-2 border-red-400 text-red-600 rounded-xl font-medium text-base active:bg-red-50">🖼️ 相册</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow space-y-4">
          <img src={preview} alt="预览" className="w-full rounded-xl" />
          {uploading && <p className="text-center text-gray-400">上传中...</p>}
          {processing && <p className="text-center text-blue-500 text-lg py-4">🔍 正在识别文字...</p>}

          {!processing && rawText && (
            <>
              <details className="bg-gray-50 rounded-xl p-3">
                <summary className="text-xs text-gray-400">查看原始识别文字</summary>
                <pre className="whitespace-pre-wrap font-sans text-sm mt-2 text-gray-600">{rawText}</pre>
              </details>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">事件类型</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    {EVENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">日期</label>
                  <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">识别到 {records.length} 条</h3>
                  <button type="button" onClick={addRow} className="text-sm text-red-500">+ 添加</button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {records.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                      <input type="text" value={r.person_name} onChange={(e) => updateRecord(idx, 'person_name', e.target.value)} placeholder="姓名" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-0" />
                      <input type="text" value={r.event_desc} onChange={(e) => updateRecord(idx, 'event_desc', e.target.value)} placeholder="事件" className="w-16 px-2 py-2 rounded-lg border border-gray-200 text-sm" />
                      <input type="number" value={r.amount} onChange={(e) => updateRecord(idx, 'amount', e.target.value)} placeholder="金额" className="w-20 px-2 py-2 rounded-lg border border-gray-200 text-sm" />
                      <button onClick={() => removeRow(idx)} className="text-gray-300 text-lg shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleBatchSave} disabled={saving || records.filter((r) => r.person_name.trim() && r.amount).length === 0}
                className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
                {saving ? '保存中...' : `批量导入 (${records.filter((r) => r.person_name.trim() && r.amount).length} 条)`}
              </button>

              <button onClick={() => { setPreview(null); setRawText(''); setRecords([]) }} className="w-full py-2 text-sm text-gray-400">重新拍摄</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
