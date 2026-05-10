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

      {tab === 'photo' && (
        <PhotoOcrTab
          onResult={(parsed) => {
            set('person_name', parsed.person_name || '')
            set('amount', parsed.amount || '')
            set('record_date', parsed.record_date || form.record_date)
            set('event_type', parsed.event_type || '红事')
            setTab('manual')
          }}
        />
      )}
    </div>
  )
}

function PhotoOcrTab({ onResult }) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const fileInputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(URL.createObjectURL(file))

    // 上传到 Supabase Storage
    const fileName = `ocr/${Date.now()}-${file.name || 'photo.jpg'}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)

    if (uploadError) {
      alert('上传失败: ' + uploadError.message)
      setUploading(false)
      return
    }

    // 获取公开链接
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    setUploading(false)
    setProcessing(true)

    // 调用 OCR 代理函数
    const { data: funcData, error: funcError } = await supabase.functions.invoke('ocr-proxy', {
      body: { imageUrl },
    })

    setProcessing(false)

    if (funcError) {
      alert('识别失败: ' + funcError.message)
      return
    }

    const parsed = parseOcrText(funcData)
    setOcrText(parsed.rawText)
    onResult(parsed)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-16 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 active:border-red-400 active:text-red-400"
        >
          <div className="text-5xl mb-3">📷</div>
          <p className="text-base">点击拍照或选择照片</p>
          <p className="text-xs mt-1">支持拍摄纸质本子页面</p>
        </button>
      ) : (
        <div className="space-y-3">
          <img src={preview} alt="预览" className="w-full rounded-xl" />
          {uploading && <p className="text-center text-gray-400">上传中...</p>}
          {processing && <p className="text-center text-blue-500">正在识别文字...</p>}
          {ocrText && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              <div className="text-xs text-gray-400 mb-1">识别结果：</div>
              <pre className="whitespace-pre-wrap font-sans text-base">{ocrText}</pre>
            </div>
          )}
          <button
            onClick={() => { setPreview(null); setOcrText('') }}
            className="w-full py-2 text-sm text-gray-400"
          >
            重新拍摄
          </button>
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
