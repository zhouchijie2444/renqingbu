import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { parseOcrText } from '../utils/parseOcrText'

const EVENT_TYPES = ['红事', '白事', '生日', '升学', '乔迁', '其他']

export default function AddRecord() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    person_name: '',
    relationship: '',
    event_type: '红事',
    event_desc: '',
    amount: '',
    record_date: new Date().toISOString().split('T')[0],
    direction: 'received',
    linked_record_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('manual')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.person_name.trim() || !form.amount) return
    setSaving(true)

    const recordData = {
      person_name: form.person_name.trim(),
      relationship: form.relationship.trim(),
      event_type: form.event_type,
      event_desc: form.event_desc.trim(),
      amount: parseInt(form.amount, 10),
      record_date: form.record_date,
      direction: form.direction,
      linked_record_id: form.linked_record_id || null,
      status: form.direction === 'received' ? 'pending' : 'none',
      notes: form.notes.trim(),
    }

    const { error } = await supabase.from('records').insert(recordData)

    if (!error && form.direction === 'paid' && form.linked_record_id) {
      await supabase.from('records').update({ status: 'settled' }).eq('id', form.linked_record_id)
    }

    setSaving(false)
    if (error) {
      alert('保存失败: ' + error.message)
    } else {
      navigate('/records')
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">添加记录</h1>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'manual' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
        >
          手动填写
        </button>
        <button
          onClick={() => setTab('photo')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'photo' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
        >
          拍照识别
        </button>
      </div>

      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-4 shadow">
          {/* 收礼/还礼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
            <div className="flex gap-2">
              {[['received', '收礼'], ['paid', '还礼']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('direction', val)}
                  className={`flex-1 py-3 text-sm font-medium rounded-xl border-2 ${
                    form.direction === val ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input
              type="text" value={form.person_name}
              onChange={(e) => set('person_name', e.target.value)}
              required placeholder="张三"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* 关系 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关系</label>
            <input
              type="text" value={form.relationship}
              onChange={(e) => set('relationship', e.target.value)}
              placeholder="大舅 / 邻居 / 同事"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* 事件类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => set('event_type', t)}
                  className={`py-2 text-sm rounded-xl border ${
                    form.event_type === t ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 事件描述 + 金额 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">事件描述</label>
              <input
                type="text" value={form.event_desc}
                onChange={(e) => set('event_desc', e.target.value)}
                placeholder="儿子结婚"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
              <input
                type="number" value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required placeholder="500" min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date" value={form.record_date}
              onChange={(e) => set('record_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* 还礼关联 */}
          {form.direction === 'paid' && (
            <LinkedRecordPicker
              personName={form.person_name}
              onSelect={(record) => set('linked_record_id', record.id)}
            />
          )}

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="其他想记录的..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
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
  const fileInputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(URL.createObjectURL(file))

    const fileName = `ocr/${Date.now()}-${file.name || 'photo.jpg'}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)

    if (uploadError) {
      alert('上传失败: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    setUploading(false)
    setProcessing(true)

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('ocr-proxy', {
        body: { imageUrl },
      })

      setProcessing(false)

      if (funcError) { alert('识别失败: ' + JSON.stringify(funcError)); return }
      if (!funcData || funcData.error) { alert('百度返回错误: ' + JSON.stringify(funcData)); return }
      if (!funcData.words_result || funcData.words_result.length === 0) {
        alert('图片中未识别到文字，请拍清晰些')
        return
      }

      const parsed = parseOcrText(funcData)
      setRawText(parsed.rawText)
      setRecords(parsed.records.map((r) => ({ ...r, relationship: '' })))
      if (parsed.recognized.event_type) setEventType(parsed.recognized.event_type)
      if (parsed.recognized.record_date) setRecordDate(parsed.recognized.record_date)
    } catch (err) {
      setProcessing(false)
      alert('网络错误: ' + (err.message || '未知错误'))
    }
  }

  const updateRecord = (idx, field, value) => {
    setRecords((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const addRow = () => {
    setRecords((prev) => [...prev, { person_name: '', amount: '', relationship: '', event_type: eventType, record_date: recordDate }])
  }

  const removeRow = (idx) => {
    setRecords((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleBatchSave = async () => {
    const valid = records.filter((r) => r.person_name.trim() && r.amount)
    if (valid.length === 0) { alert('没有可保存的记录'); return }
    if (!confirm(`确认导入 ${valid.length} 条记录？`)) return

    setSaving(true)
    const rows = valid.map((r) => ({
      person_name: r.person_name.trim(),
      amount: parseInt(r.amount, 10),
      relationship: (r.relationship || '').trim(),
      event_type: eventType,
      event_desc: '',
      record_date: recordDate,
      direction: 'received',
      status: 'pending',
    }))

    const { error } = await supabase.from('records').insert(rows)
    setSaving(false)

    if (error) {
      alert('保存失败: ' + error.message)
    } else {
      navigate('/records')
    }
  }

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-white rounded-2xl p-4 shadow py-16 border-2 border-dashed border-gray-300 text-gray-400 active:border-red-400 active:text-red-400"
        >
          <div className="text-5xl mb-3">📷</div>
          <p className="text-base">点击拍照或选择照片</p>
          <p className="text-xs mt-1">支持拍摄纸质本子整页，批量识别</p>
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow space-y-4">
          <img src={preview} alt="预览" className="w-full rounded-xl" />
          {uploading && <p className="text-center text-gray-400">上传中...</p>}
          {processing && <p className="text-center text-blue-500 text-lg py-4">🔍 正在识别文字...</p>}

          {!processing && rawText && (
            <>
              {/* 原始识别文本 */}
              <details className="bg-gray-50 rounded-xl p-3">
                <summary className="text-xs text-gray-400">查看原始识别文字</summary>
                <pre className="whitespace-pre-wrap font-sans text-sm mt-2 text-gray-600">{rawText}</pre>
              </details>

              {/* 公共信息 */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">事件类型</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  >
                    {['红事', '白事', '生日', '升学', '乔迁', '其他'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">日期</label>
                  <input
                    type="date" value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              </div>

              {/* 识别出的人员列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">识别到 {records.length} 条记录</h3>
                  <button type="button" onClick={addRow} className="text-sm text-red-500">+ 添加一行</button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {records.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                      <input
                        type="text" value={r.person_name}
                        onChange={(e) => updateRecord(idx, 'person_name', e.target.value)}
                        placeholder="姓名"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-0"
                      />
                      <input
                        type="text" value={r.relationship}
                        onChange={(e) => updateRecord(idx, 'relationship', e.target.value)}
                        placeholder="关系"
                        className="w-16 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                      />
                      <input
                        type="number" value={r.amount}
                        onChange={(e) => updateRecord(idx, 'amount', e.target.value)}
                        placeholder="金额"
                        className="w-20 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                      />
                      <button onClick={() => removeRow(idx)} className="text-gray-300 text-lg shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <button
                onClick={handleBatchSave}
                disabled={saving || records.filter((r) => r.person_name.trim() && r.amount).length === 0}
                className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : `批量导入 (${records.filter((r) => r.person_name.trim() && r.amount).length} 条)`}
              </button>

              <button
                onClick={() => { setPreview(null); setRawText(''); setRecords([]) }}
                className="w-full py-2 text-sm text-gray-400"
              >
                重新拍摄
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function LinkedRecordPicker({ personName, onSelect }) {
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const searchPending = async () => {
    if (!personName.trim()) return
    const { data } = await supabase
      .from('records')
      .select('*')
      .eq('person_name', personName.trim())
      .eq('direction', 'received')
      .eq('status', 'pending')
      .order('record_date', { ascending: false })

    setResults(data || [])
    setSearched(true)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">关联之前的收礼记录</label>
      <button type="button" onClick={searchPending} className="text-sm text-red-500 mb-2">
        查找 {personName || '此人'} 的待还记录
      </button>
      {searched && results.length === 0 && (
        <p className="text-xs text-gray-400">没有找到待还的收礼记录</p>
      )}
      {results.map((r) => (
        <button
          key={r.id} type="button"
          onClick={() => onSelect(r)}
          className="w-full text-left p-2 bg-gray-50 rounded-lg mb-1 text-sm"
        >
          <span>{r.record_date}</span>
          <span className="mx-2">{r.event_type}</span>
          <span>{r.event_desc}</span>
          <span className="float-right font-semibold text-red-600">¥{r.amount}</span>
        </button>
      ))}
    </div>
  )
}
