# 人情簿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app for tracking reciprocal gift records (人情往来) with OCR photo import, family sharing via Supabase auth, and search/filter capabilities.

**Architecture:** Single-page React app with Vite, Tailwind CSS v4, and react-router-dom v7. Supabase handles auth, PostgreSQL database, and image storage. A Supabase Edge Function proxies Baidu OCR API calls. Data is scoped by Supabase Row Level Security for family sharing.

**Tech Stack:** React 19, Vite 6, Tailwind CSS v4, react-router-dom v7, Supabase JS SDK v2, Baidu OCR API, Vercel deployment

---

## File Structure

```
renqingbu/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx                    # App entry, providers
│   ├── App.jsx                     # Router setup
│   ├── index.css                   # Tailwind imports + global styles
│   ├── lib/
│   │   └── supabaseClient.js       # Supabase client singleton
│   ├── components/
│   │   ├── Layout.jsx              # Shell: header + bottom nav + content
│   │   ├── BottomNav.jsx           # Mobile tab bar navigation
│   │   ├── StatsCards.jsx          # Three stat cards (收入/支出/净额)
│   │   ├── RecordRow.jsx           # One person summary row in list
│   │   ├── SearchBar.jsx           # Search input with clear button
│   │   ├── FilterTabs.jsx          # Event type filter tabs
│   │   └── PendingList.jsx         # Dashboard pending returns list
│   ├── pages/
│   │   ├── Login.jsx               # Auth page (login + signup)
│   │   ├── Dashboard.jsx           # Home: stats + pending
│   │   ├── RecordList.jsx          # Main list: person summaries
│   │   ├── AddRecord.jsx           # Add form (manual tab + photo tab)
│   │   └── PersonDetail.jsx        # One person's full history
│   └── utils/
│       └── parseOcrText.js         # Parse OCR text into structured fields
└── supabase/
    ├── migrations/
    │   └── 20260510000001_create_records.sql
    └── functions/
        └── ocr-proxy/
            └── index.ts            # Edge function: Baidu OCR proxy
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `src/App.jsx`

- [ ] **Step 1: Create project directory and package.json**

```bash
cd /Users/zhouchijie/Claude/renqingbu
npm create vite@latest . -- --template react
```

Expected: Vite scaffolds a React project, installs dependencies.

- [ ] **Step 2: Install additional dependencies**

```bash
cd /Users/zhouchijie/Claude/renqingbu
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure vite.config.js**

Write `vite.config.js` with the full content:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Configure index.css**

Write `src/index.css`:

```css
@import "tailwindcss";

/* Mobile-first base: larger touch targets, readable font */
html {
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
}
body {
  @apply bg-gray-50 text-gray-900 antialiased;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 5: Write minimal main.jsx**

Write `src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 6: Write placeholder App.jsx**

Write `src/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center text-xl">人情簿 - 加载中...</div>} />
    </Routes>
  )
}
```

- [ ] **Step 7: Verify project runs**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Dev server starts, opening http://localhost:5173 shows "人情簿 - 加载中..."

- [ ] **Step 8: Initialize git and commit**

```bash
cd /Users/zhouchijie/Claude/renqingbu
git init
git add -A
git commit -m "chore: scaffold Vite + React + Tailwind project"
```

---

### Task 2: Supabase Setup & Database

**Files:**
- Create: `supabase/migrations/20260510000001_create_records.sql`, `src/lib/supabaseClient.js`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New Project → name "renqingbu" → set a strong database password → create. Wait for project to be ready. Get the **Project URL** and **anon public key** from Settings → API.

- [ ] **Step 2: Write Supabase client singleton**

Write `src/lib/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Create .env file**

Write `.env`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

(Replace with actual values from Supabase dashboard)

- [ ] **Step 4: Create database migration**

Write `supabase/migrations/20260510000001_create_records.sql`:

```sql
-- Create the records table for 人情簿
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  person_name TEXT NOT NULL,
  relationship TEXT DEFAULT '',
  event_type TEXT NOT NULL CHECK (event_type IN ('红事','白事','生日','升学','乔迁','其他')),
  event_desc TEXT DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount > 0),
  record_date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('received', 'paid')),
  linked_record_id UUID REFERENCES records(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'none')),
  notes TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own records (family shares one account)
CREATE POLICY "Users can read own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster searches
CREATE INDEX idx_records_person_name ON records (user_id, person_name);
CREATE INDEX idx_records_date ON records (user_id, record_date);
CREATE INDEX idx_records_event_type ON records (user_id, event_type);
```

- [ ] **Step 5: Run migration on Supabase**

In Supabase dashboard → SQL Editor → paste and run the migration SQL. Or use Supabase CLI:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

- [ ] **Step 6: Commit**

```bash
cd /Users/zhouchijie/Claude/renqingbu
git add supabase/ src/lib/supabaseClient.js .env
git commit -m "feat: add Supabase client and database migration"
```

---

### Task 3: Auth - Login Page

**Files:**
- Create: `src/pages/Login.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write Login page**

Write `src/pages/Login.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else if (isSignUp) {
      setMessage('注册成功！请查看邮箱确认链接（或直接登录）')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-red-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-red-800 mb-2">📖 人情簿</h1>
        <p className="text-center text-gray-500 mb-8">红白喜事，人情往来，一笔不落</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少6位"
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '请稍候...' : isSignUp ? '注册' : '登录'}
          </button>

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
            className="w-full text-sm text-gray-500 py-1"
          >
            {isSignUp ? '已有账号？点此登录' : '没有账号？点此注册'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx with auth routing**

Write `src/App.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<div>记录列表</div>} />
        <Route path="/add" element={<div>添加记录</div>} />
        <Route path="/person/:name" element={<div>人员详情</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Write placeholder pages**

Write placeholder `src/pages/Dashboard.jsx`:

```jsx
export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">首页</h1>
      <p className="text-gray-500">统计看板即将上线</p>
    </div>
  )
}
```

- [ ] **Step 4: Write Layout component**

Write `src/components/Layout.jsx`:

```jsx
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Outlet />
      <BottomNav />
    </div>
  )
}
```

Write `src/components/BottomNav.jsx`:

```jsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/records', label: '记录', icon: '📋' },
  { to: '/add', label: '添加', icon: '➕' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center px-6 py-1 text-xs gap-1 ${
                isActive ? 'text-red-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: Verify login flow**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Open browser → see login page → can register and login → after login see dashboard with bottom nav.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Login.jsx src/pages/Dashboard.jsx src/components/Layout.jsx src/components/BottomNav.jsx src/App.jsx
git commit -m "feat: add login page and layout with bottom navigation"
```

---

### Task 4: Add Record Page (Manual Form)

**Files:**
- Create: `src/pages/AddRecord.jsx`

- [ ] **Step 1: Write AddRecord page with manual form**

Write `src/pages/AddRecord.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const EVENT_TYPES = ['红事', '白事', '生日', '升学', '乔迁', '其他']

export default function AddRecord() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('manual')
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

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.person_name.trim() || !form.amount) return
    setSaving(true)

    const { error } = await supabase.from('records').insert({
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
    })

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

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'manual' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
        >
          ✏️ 手动填写
        </button>
        <button
          onClick={() => setTab('photo')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === 'photo' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
        >
          📷 拍照识别
        </button>
      </div>

      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-4 shadow">
          {/* 收支类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
            <div className="flex gap-2">
              {[
                ['received', '📥 收礼'],
                ['paid', '📤 还礼'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('direction', val)}
                  className={`flex-1 py-3 text-sm font-medium rounded-xl border-2 ${
                    form.direction === val
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500'
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
              type="text"
              value={form.person_name}
              onChange={(e) => set('person_name', e.target.value)}
              required
              placeholder="张三"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* 关系 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关系</label>
            <input
              type="text"
              value={form.relationship}
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
                  key={t}
                  type="button"
                  onClick={() => set('event_type', t)}
                  className={`py-2 text-sm rounded-xl border ${
                    form.event_type === t
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : 'border-gray-200 text-gray-500'
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
                type="text"
                value={form.event_desc}
                onChange={(e) => set('event_desc', e.target.value)}
                placeholder="儿子结婚"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
                placeholder="500"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={form.record_date}
              onChange={(e) => set('record_date', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="其他想记录的..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-red-600 text-white text-base font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存记录'}
          </button>
        </form>
      )}

      {tab === 'photo' && (
        <div className="bg-white rounded-2xl p-8 shadow text-center text-gray-400">
          <div className="text-5xl mb-4">📷</div>
          <p>拍照识别功能即将上线</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx to use AddRecord**

In `src/App.jsx`, change the `/add` route line from `<div>添加记录</div>` to:

```jsx
import AddRecord from './pages/AddRecord'
// ... and in the Routes:
<Route path="/add" element={<AddRecord />} />
```

- [ ] **Step 3: Verify manual form**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Navigate to "添加" tab → fill form → save → should insert into Supabase and redirect to records list.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AddRecord.jsx src/App.jsx
git commit -m "feat: add manual record entry form with Supabase insert"
```

---

### Task 5: Record List Page (Person Summary View)

**Files:**
- Create: `src/pages/RecordList.jsx`, `src/components/RecordRow.jsx`

- [ ] **Step 1: Write RecordRow component**

Write `src/components/RecordRow.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'

export default function RecordRow({ personName, totalReceived, totalPaid }) {
  const navigate = useNavigate()
  const balance = totalReceived - totalPaid

  return (
    <button
      onClick={() => navigate(`/person/${encodeURIComponent(personName)}`)}
      className="w-full bg-white rounded-xl p-4 shadow-sm mb-2 flex items-center justify-between active:bg-gray-50 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
          {personName.charAt(0)}
        </div>
        <span className="text-base font-medium">{personName}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600">收 ¥{totalReceived}</span>
        <span className="text-orange-600">还 ¥{totalPaid}</span>
        {balance > 0 && (
          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
            待还 ¥{balance}
          </span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Write RecordList page with data fetching**

Write `src/pages/RecordList.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import RecordRow from '../components/RecordRow'
import SearchBar from '../components/SearchBar'
import FilterTabs from '../components/FilterTabs'

export default function RecordList() {
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

    if (year === '今年') {
      const now = new Date()
      query = query.gte('record_date', `${now.getFullYear()}-01-01`)
    } else if (year === '去年') {
      const now = new Date()
      query = query.gte('record_date', `${now.getFullYear() - 1}-01-01`)
        .lt('record_date', `${now.getFullYear()}-01-01`)
    }

    const { data, error } = await query.order('record_date', { ascending: false })

    if (!error && data) {
      // Group by person_name
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

  // Apply search and filter client-side
  let filtered = summaries
  if (search) {
    filtered = filtered.filter((s) => s.person_name.includes(search))
  }
  if (filter !== '全部') {
    filtered = filtered.filter((s) => s.eventTypes.includes(filter))
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">人情记录</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="搜索姓名..." />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['今年', '去年', '全部'].map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap ${
              year === y ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <FilterTabs current={filter} onChange={setFilter} />

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
          {filtered.map((s) => (
            <RecordRow key={s.person_name} {...s} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write SearchBar component**

Write `src/components/SearchBar.jsx`:

```jsx
export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-3">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-lg"
        >
          ✕
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write FilterTabs component**

Write `src/components/FilterTabs.jsx`:

```jsx
const EVENT_TYPES = ['全部', '红事', '白事', '生日', '升学', '乔迁', '其他']

export default function FilterTabs({ current, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {EVENT_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
            current === t ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Update App.jsx route**

In `src/App.jsx`, import RecordList and update the route:

```jsx
import RecordList from './pages/RecordList'
// change:
<Route path="/records" element={<RecordList />} />
```

- [ ] **Step 6: Verify record list**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: "记录" tab shows list of person summaries, search works, filter tabs work, year switching works.

- [ ] **Step 7: Commit**

```bash
git add src/pages/RecordList.jsx src/components/RecordRow.jsx src/components/SearchBar.jsx src/components/FilterTabs.jsx src/App.jsx
git commit -m "feat: add record list with person summary, search, and filters"
```

---

### Task 6: Person Detail Page

**Files:**
- Create: `src/pages/PersonDetail.jsx`

- [ ] **Step 1: Write PersonDetail page**

Write `src/pages/PersonDetail.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const TYPE_LABELS = { 红事: '🔴', 白事: '⚪', 生日: '🎂', 升学: '🎓', 乔迁: '🏠', 其他: '📌' }

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

  const totalReceived = records.filter((r) => r.direction === 'received').reduce((s, r) => s + r.amount, 0)
  const totalPaid = records.filter((r) => r.direction === 'paid').reduce((s, r) => s + r.amount, 0)
  const balance = totalReceived - totalPaid

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条记录？')) return
    await supabase.from('records').delete().eq('id', id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-xl">←</button>
        <h1 className="text-2xl font-bold">{personName}</h1>
      </div>

      {/* Summary cards */}
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

      {/* Records list */}
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
                  <span>{TYPE_LABELS[r.event_type]}</span>
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
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-gray-300 hover:text-red-400"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update App.jsx route**

In `src/App.jsx`:

```jsx
import PersonDetail from './pages/PersonDetail'
// change:
<Route path="/person/:name" element={<PersonDetail />} />
```

- [ ] **Step 3: Verify person detail**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Click a person in the list → navigates to detail page → shows all their records, summary cards, delete works.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PersonDetail.jsx src/App.jsx
git commit -m "feat: add person detail page with record history and summary"
```

---

### Task 7: Dashboard (Stats + Pending List)

**Files:**
- Create: `src/components/StatsCards.jsx`, `src/components/PendingList.jsx`
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Write StatsCards component**

Write `src/components/StatsCards.jsx`:

```jsx
export default function StatsCards({ totalReceived, totalPaid, netAmount, pendingCount }) {
  const cards = [
    { label: '今年收礼', value: `¥${totalReceived}`, color: 'text-green-700', bg: 'bg-green-50' },
    { label: '今年还礼', value: `¥${totalPaid}`, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: '净支出', value: `¥${netAmount}`, color: netAmount >= 0 ? 'text-blue-700' : 'text-red-700', bg: 'bg-blue-50' },
    { label: '待还人数', value: `${pendingCount}人`, color: 'text-red-700', bg: 'bg-red-50' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-xl p-4`}>
          <div className="text-xs text-gray-500 mb-1">{c.label}</div>
          <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write PendingList component**

Write `src/components/PendingList.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'

export default function PendingList({ items }) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-sm">没有人情待还，太棒了！</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
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
  )
}
```

- [ ] **Step 3: Rewrite Dashboard page with data**

Write `src/pages/Dashboard.jsx` (overwrite placeholder):

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatsCards from '../components/StatsCards'
import PendingList from '../components/PendingList'

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
      <h1 className="text-2xl font-bold mb-1">📖 人情簿</h1>
      <p className="text-sm text-gray-400 mb-4">红白喜事，一笔不落</p>

      <StatsCards
        totalReceived={stats.totalReceived}
        totalPaid={stats.totalPaid}
        netAmount={stats.totalPaid - stats.totalReceived}
        pendingCount={pendingCount}
      />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 my-6">
        <button
          onClick={() => navigate('/add')}
          className="py-4 bg-red-600 text-white rounded-xl font-medium text-base active:bg-red-700"
        >
          ✏️ 手动添加
        </button>
        <button
          onClick={() => navigate('/add?tab=photo')}
          className="py-4 bg-white border-2 border-red-400 text-red-600 rounded-xl font-medium text-base active:bg-red-50"
        >
          📷 拍照添加
        </button>
      </div>

      {/* Pending list */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          ⏳ 待还人情
          {pendingCount > 0 && <span className="text-red-500 ml-1">({pendingCount})</span>}
        </h2>
        {loading ? (
          <div className="text-center text-gray-400 py-4">加载中...</div>
        ) : (
          <PendingList items={stats.pending} />
        )}
      </div>

      {/* Logout */}
      <button
        onClick={async () => {
          await supabase.auth.signOut()
        }}
        className="w-full mt-8 py-3 text-gray-400 text-sm active:text-gray-600"
      >
        退出登录
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verify dashboard**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Dashboard shows stats cards, pending list, quick action buttons, logout works. Stats update based on current year's data.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx src/components/StatsCards.jsx src/components/PendingList.jsx
git commit -m "feat: add dashboard with stats, pending list, and quick actions"
```

---

### Task 8: OCR - Baidu Cloud Integration

**Files:**
- Create: `supabase/functions/ocr-proxy/index.ts`, `src/utils/parseOcrText.js`
- Modify: `src/pages/AddRecord.jsx`

- [ ] **Step 1: Create Supabase Edge Function for OCR proxy**

Write `supabase/functions/ocr-proxy/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BAIDU_API_KEY = Deno.env.get('BAIDU_OCR_API_KEY')!
const BAIDU_SECRET_KEY = Deno.env.get('BAIDU_OCR_SECRET_KEY')!

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { imageUrl } = await req.json()

    // Get Baidu access token
    const tokenRes = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
    )
    const { access_token } = await tokenRes.json()

    // Download image and convert to base64
    const imageRes = await fetch(imageUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Call Baidu OCR
    const ocrRes = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          image: base64Image,
          detect_direction: 'true',
          paragraph: 'true',
        }),
      }
    )

    const ocrData = await ocrRes.json()

    return new Response(JSON.stringify(ocrData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
```

- [ ] **Step 2: Deploy the edge function**

```bash
cd /Users/zhouchijie/Claude/renqingbu
npx supabase functions deploy ocr-proxy
```

Then set secrets in Supabase dashboard → Edge Functions → ocr-proxy → Settings:
- `BAIDU_OCR_API_KEY` = your Baidu API Key
- `BAIDU_OCR_SECRET_KEY` = your Baidu Secret Key

- [ ] **Step 3: Write OCR text parser utility**

Write `src/utils/parseOcrText.js`:

```js
/**
 * Parse OCR-detected text into structured fields.
 * The OCR returns an array of { words: string } objects.
 * We use heuristics to extract: name, amount, date, event.
 */
export function parseOcrText(wordsResult) {
  // Baidu OCR returns { words_result: [{ words: "..." }, ...] }
  const words = (wordsResult.words_result || []).map((w) => w.words)
  const fullText = words.join('\n')

  // Extract amount: look for numbers, especially with ¥ or 元
  const amountMatch = fullText.match(/(\d{2,4})(?:元|块)?/)
  const amount = amountMatch ? parseInt(amountMatch[1], 10) : ''

  // Extract date: common Chinese date patterns
  const datePatterns = [
    /(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/,
    /(\d{4}\s*\d{1,2}\s*\d{1,2})/,
    /(\d{1,2}月\d{1,2}[日号])/,
  ]
  let dateStr = ''
  for (const pat of datePatterns) {
    const m = fullText.match(pat)
    if (m) {
      dateStr = m[1]
      break
    }
  }

  // Extract name: first line or first 2-3 char phrase
  let name = ''
  if (words.length > 0) {
    const firstWord = words[0].trim()
    // Chinese names are typically 2-3 characters
    if (/^[一-鿿]{2,3}$/.test(firstWord)) {
      name = firstWord
    }
  }

  // Extract event type from keywords
  let eventType = '其他'
  const eventKeywords = {
    '红事': ['结婚', '婚礼', '娶', '嫁', '喜事', '满月', '周岁'],
    '白事': ['白事', '丧', '去世', '追悼', '葬礼'],
    '生日': ['生日', '寿', '诞辰'],
    '升学': ['升学', '高考', '大学', '考取', '录取', '毕业'],
    '乔迁': ['乔迁', '搬家', '新居', '入宅'],
  }
  for (const [type, kws] of Object.entries(eventKeywords)) {
    if (kws.some((kw) => fullText.includes(kw))) {
      eventType = type
      break
    }
  }

  return {
    person_name: name,
    amount,
    record_date: dateStr,
    event_type: eventType,
    rawText: fullText,
  }
}
```

- [ ] **Step 4: Add photo OCR tab to AddRecord page**

In `src/pages/AddRecord.jsx`, replace the photo tab placeholder with a working implementation. Add at the top of the file (after imports):

```jsx
import { parseOcrText } from '../utils/parseOcrText'
```

Replace the `{tab === 'photo' && ...}` block with:

```jsx
{tab === 'photo' && (
  <PhotoOcrTab
    onResult={(parsed) => {
      set('person_name', parsed.person_name || '')
      set('amount', parsed.amount || '')
      set('record_date', parsed.record_date || form.record_date)
      set('event_type', parsed.event_type || '红事')
      setTab('manual') // Switch to manual tab for review
    }}
  />
)}
```

Add the PhotoOcrTab component at the bottom of the file (before the final `}`):

```jsx
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

    // Upload to Supabase Storage
    const fileName = `ocr/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file)

    if (uploadError) {
      alert('上传失败: ' + uploadError.message)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    setUploading(false)
    setProcessing(true)

    // Call OCR proxy
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

    // Fill form with parsed data
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
              <pre className="whitespace-pre-wrap font-sans">{ocrText}</pre>
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
```

Also add `useRef` to the React import at the top of `AddRecord.jsx`:

```jsx
import { useState, useRef } from 'react'
```

- [ ] **Step 5: Create Supabase Storage bucket**

In Supabase dashboard → Storage → New Bucket → name "receipts" → check "public" → create. Then in the bucket's Policies, add:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');
```

- [ ] **Step 6: Verify OCR flow**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Go to "添加" → tap "拍照识别" → take photo → image uploads → OCR processes → form auto-fills → user confirms → saves.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/ocr-proxy/index.ts src/utils/parseOcrText.js src/pages/AddRecord.jsx
git commit -m "feat: add OCR photo import with Baidu OCR integration"
```

---

### Task 9: Link Return Records to Received Records

**Files:**
- Modify: `src/pages/AddRecord.jsx`

- [ ] **Step 1: Add linked record search when direction is "paid"**

In `src/pages/AddRecord.jsx`, add a component to search for pending received records when "还礼" is selected. Add this after the direction selector and name input area.

Insert this section after the "姓名" field in the manual form:

```jsx
{/* 还礼关联 - only show when direction is "paid" */}
{form.direction === 'paid' && (
  <LinkedRecordPicker
    personName={form.person_name}
    onSelect={(record) => set('linked_record_id', record.id)}
  />
)}
```

Add the `LinkedRecordPicker` component at the bottom of the file:

```jsx
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
      <button
        type="button"
        onClick={searchPending}
        className="text-sm text-red-500 mb-2"
      >
        🔍 查找 {personName || '此人'} 的待还记录
      </button>
      {searched && results.length === 0 && (
        <p className="text-xs text-gray-400">没有找到待还的收礼记录</p>
      )}
      {results.map((r) => (
        <button
          key={r.id}
          type="button"
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
```

Also update the `handleSubmit` to mark linked received records as "settled":

```jsx
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
    // Mark the linked received record as settled
    await supabase
      .from('records')
      .update({ status: 'settled' })
      .eq('id', form.linked_record_id)
  }

  setSaving(false)
  if (error) {
    alert('保存失败: ' + error.message)
  } else {
    navigate('/records')
  }
}
```

- [ ] **Step 2: Verify link flow**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Expected: Add a received record. Then add a paid record for the same person → click "查找待还记录" → select the received record → save → check that the received record is now marked "settled" in the person detail page.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddRecord.jsx
git commit -m "feat: add linked record picker for tracking return payments"
```

---

### Task 10: Polish & Responsive Testing

**Files:**
- Modify: `src/index.css`, various component files

- [ ] **Step 1: Add safe area padding for mobile**

Update `src/index.css`:

```css
@import "tailwindcss";

html {
  font-size: 16px;
  -webkit-tap-highlight-color: transparent;
}
body {
  @apply bg-gray-50 text-gray-900 antialiased;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Safe area for iPhone notch */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 2: Update BottomNav with safe area**

In `src/components/BottomNav.jsx`, add `pb-safe` class to the nav:

```jsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
```

- [ ] **Step 3: Add meta viewport for mobile in index.html**

Update `<meta name="viewport">` in `index.html`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- [ ] **Step 4: Add app name/title**

Update `<title>` in `index.html`:

```html
<title>人情簿</title>
```

- [ ] **Step 5: Manual responsive test**

```bash
cd /Users/zhouchijie/Claude/renqingbu && npm run dev
```

Open Chrome DevTools → Toggle device toolbar → set to iPhone 14 Pro or similar. Test all pages: login, dashboard, record list, add record (manual + photo), person detail. Verify touch targets are large enough, text is readable, no horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/BottomNav.jsx index.html
git commit -m "style: add mobile safe area padding and responsive polish"
```

---

### Task 11: Prepare for Deployment

**Files:**
- Modify: `package.json`
- Create: `vercel.json`

- [ ] **Step 1: Add build command verification**

Run a production build:

```bash
cd /Users/zhouchijie/Claude/renqingbu
npm run build
```

Expected: Build succeeds, output in `dist/` folder. Fix any build errors.

- [ ] **Step 2: Create Vercel config**

Write `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 3: Deploy to Vercel**

```bash
cd /Users/zhouchijie/Claude/renqingbu
npx vercel --prod
```

Follow the CLI prompts to link to your Vercel account and deploy. After deployment, Vercel will give you a URL like `https://renqingbu.vercel.app`.

- [ ] **Step 4: Set environment variables on Vercel**

In Vercel dashboard → Project Settings → Environment Variables, add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

Redeploy after setting env vars.

- [ ] **Step 5: Test the deployed app**

Open the Vercel URL on your phone. Test: register, login, add records, use OCR, search, view stats.

- [ ] **Step 6: Final commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config"
```

---

## Pre-implementation Checklist

Before starting Task 1, ensure you have:

- [ ] A Supabase account (free tier) → https://supabase.com
- [ ] A Baidu Cloud account (free OCR tier) → https://cloud.baidu.com/product/ocr
  - After registering, go to Console → Product Services → Text Recognition → Create Application → get API Key and Secret Key
- [ ] Node.js installed (v18+) → check with `node --version`
- [ ] A Vercel account → https://vercel.com (for deployment)
