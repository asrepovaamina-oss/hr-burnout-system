'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function HRDashboard() {
  const [employees, setEmployees] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard')
  const [newEmp, setNewEmp] = useState({ name: '', telegram_id: '', department: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: emps } = await supabase.from('employees').select('*').order('name')
    setEmployees(emps || [])
    const monthAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString()
    const { data: resp } = await supabase.from('survey_responses').select('*').gte('created_at', monthAgo)
    setResponses(resp || [])
    const { data: rep } = await supabase.from('weekly_reports').select('*').order('created_at', { ascending: false }).limit(10)
    setReports(rep || [])
    setLoading(false)
  }

  async function addEmployee() {
    if (!newEmp.name || !newEmp.telegram_id) return
    await supabase.from('employees').insert([{ ...newEmp, active: true }])
    setNewEmp({ name: '', telegram_id: '', department: '' })
    setShowForm(false)
    fetchData()
  }

  async function toggleEmployee(emp: any) {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    fetchData()
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thisWeek = responses.filter(r => r.created_at >= weekAgo)
  const positive = thisWeek.filter(r => r.sentiment === 'positive').length
  const negative = thisWeek.filter(r => r.sentiment === 'negative').length
  const neutral = thisWeek.filter(r => r.sentiment === 'neutral').length
  const total = thisWeek.length

  const alertEmployees = employees.filter(emp =>
    thisWeek.some(r => String(r.telegram_id) === String(emp.telegram_id) && r.sentiment === 'negative')
  )

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]
  const deptStats = departments.map(dept => {
    const deptEmps = employees.filter(e => e.department === dept)
    const deptResp = thisWeek.filter(r => deptEmps.find(e => String(e.telegram_id) === String(r.telegram_id)))
    const pos = deptResp.filter(r => r.sentiment === 'positive').length
    const pct = deptResp.length ? Math.round(pos / deptResp.length * 100) : 0
    return { dept, pct }
  })

  const chartData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(Date.now() - (7 - i) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(Date.now() - (6 - i) * 7 * 24 * 60 * 60 * 1000)
    const weekResp = responses.filter(r => r.created_at >= weekStart.toISOString() && r.created_at < weekEnd.toISOString())
    const pos = weekResp.filter(r => r.sentiment === 'positive').length
    const neg = weekResp.filter(r => r.sentiment === 'negative').length
    const neu = weekResp.filter(r => r.sentiment === 'neutral').length
    const t = weekResp.length
    return {
      week: `Н${i + 1}`,
      позитив: t ? Math.round(pos / t * 100) : 0,
      негатив: t ? Math.round(neg / t * 100) : 0,
      нейтрал: t ? Math.round(neu / t * 100) : 0,
    }
  })

  const s = { fontFamily: 'system-ui, sans-serif' }

  if (loading) return (
    <div style={{ ...s, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', color: '#fff' }}>
      Загрузка...
    </div>
  )

  return (
    <div style={{ ...s, minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', padding: '2rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#16a34a22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>BurnoutWatch</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>HR панель управления</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {alertEmployees.length > 0 && (
              <div style={{ background: '#7f1d1d33', border: '1px solid #7f1d1d', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#f87171' }}>
                ⚠ {alertEmployees.length} алерта
              </div>
            )}
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#16a34a', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              + Добавить сотрудника
            </button>
          </div>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: '#1a1a1a', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {(['dashboard', 'reports'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#2a2a2a' : 'transparent', border: 'none', borderRadius: 8, padding: '6px 16px', color: activeTab === tab ? '#fff' : '#6b7280', fontSize: 13, cursor: 'pointer' }}>
              {tab === 'dashboard' ? '📊 Дашборд' : '📋 Отчёты'}
            </button>
          ))}
        </div>

        {/* Форма добавления */}
        {showForm && (
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 12 }}>Новый сотрудник</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[['Имя', 'name'], ['Telegram ID', 'telegram_id'], ['Отдел', 'department']].map(([ph, key]) => (
                <input key={key} placeholder={ph} value={(newEmp as any)[key]}
                  onChange={e => setNewEmp({ ...newEmp, [key]: e.target.value })}
                  style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              ))}
            </div>
            <button onClick={addEmployee} style={{ marginTop: 12, background: '#16a34a', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Сохранить
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Метрики */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
              {[
                { label: 'Сотрудников', value: employees.filter(e => e.active).length, sub: 'активных', color: '#fff' },
                { label: 'Прошли опрос', value: `${total} / ${employees.length}`, sub: `${employees.length ? Math.round(total / employees.length * 100) : 0}% охват`, color: '#34d399' },
                { label: 'Позитивных', value: `${total ? Math.round(positive / total * 100) : 0}%`, sub: `${positive} ответов`, color: '#34d399', bar: total ? positive / total : 0 },
                { label: 'Негативных', value: `${total ? Math.round(negative / total * 100) : 0}%`, sub: `${negative} ответов`, color: '#f87171', bar: total ? negative / total : 0 },
              ].map((card, i) => (
                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: card.color }}>{card.value}</div>
                  {card.bar !== undefined && (
                    <div style={{ marginTop: 6, background: '#2a2a2a', borderRadius: 4, height: 4 }}>
                      <div style={{ width: `${Math.round(card.bar * 100)}%`, height: 4, borderRadius: 4, background: card.color }} />
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Алерты */}
            {alertEmployees.length > 0 && (
              <div style={{ background: '#1a1a1a', border: '1px solid #7f1d1d', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#f87171', marginBottom: '1rem' }}>⚠ Алерты — требуют внимания</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alertEmployees.map(emp => (
                    <div key={emp.id} style={{ background: '#7f1d1d22', border: '1px solid #7f1d1d55', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7f1d1d55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#f87171' }}>
                          {emp.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#f87171' }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{emp.department} — негативный ответ на этой неделе</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, background: '#7f1d1d', color: '#fca5a5', padding: '2px 10px', borderRadius: 20 }}>негатив</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Исторический график */}
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: '1rem' }}>Динамика настроения — 8 недель</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis dataKey="week" stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} unit="%" />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#e5e5e5' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                  <Line type="monotone" dataKey="позитив" stroke="#4ade80" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="нейтрал" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="негатив" stroke="#f87171" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Отделы и итоги */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: '1rem' }}>Настроение по отделам</div>
                {deptStats.length === 0 ? (
                  <div style={{ color: '#4b5563', fontSize: 13 }}>Нет данных за эту неделю</div>
                ) : deptStats.map(({ dept, pct }) => (
                  <div key={dept} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>{dept}</span>
                      <span style={{ fontSize: 13, color: pct >= 60 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171' }}>{pct}% позитив</span>
                    </div>
                    <div style={{ background: '#2a2a2a', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: pct >= 60 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: '1rem' }}>Итоги недели</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: '#14532d22', border: '1px solid #14532d', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#4ade80' }}>✓ Позитивных</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#4ade80' }}>{positive}</div>
                  </div>
                  <div style={{ background: '#78350f22', border: '1px solid #78350f', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fbbf24' }}>~ Нейтральных</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#fbbf24' }}>{neutral}</div>
                  </div>
                  <div style={{ background: '#7f1d1d22', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#f87171' }}>⚠ Негативных</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#f87171' }}>{negative}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Таблица сотрудников */}
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>Сотрудники</span>
                <span style={{ fontSize: 12, color: '#4b5563' }}>{employees.length} всего</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    {['Имя', 'Отдел', 'Telegram ID', 'Настроение', 'Статус', ''].map(h => (
                      <th key={h} style={{ padding: '8px 1.25rem', textAlign: 'left', fontSize: 12, color: '#4b5563', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const empResp = thisWeek.filter(r => String(r.telegram_id) === String(emp.telegram_id))
                    const lastResp = empResp[empResp.length - 1]
                    const sentiment = lastResp?.sentiment
                    const sColor = sentiment === 'positive' ? '#4ade80' : sentiment === 'negative' ? '#f87171' : sentiment === 'neutral' ? '#fbbf24' : '#4b5563'
                    const sBg = sentiment === 'positive' ? '#14532d33' : sentiment === 'negative' ? '#7f1d1d33' : sentiment === 'neutral' ? '#78350f33' : '#1f1f1f'
                    const sLabel = sentiment === 'positive' ? 'позитив' : sentiment === 'negative' ? 'негатив' : sentiment === 'neutral' ? 'нейтрал' : 'нет данных'
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #1f1f1f', opacity: emp.active ? 1 : 0.5 }}>
                        <td style={{ padding: '10px 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#16a34a22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#4ade80', flexShrink: 0 }}>
                              {emp.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, color: '#e5e5e5' }}>{emp.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 1.25rem', fontSize: 13, color: '#6b7280' }}>{emp.department || '—'}</td>
                        <td style={{ padding: '10px 1.25rem', fontSize: 13, color: '#6b7280' }}>{emp.telegram_id}</td>
                        <td style={{ padding: '10px 1.25rem' }}>
                          <span style={{ background: sBg, color: sColor, fontSize: 11, padding: '2px 10px', borderRadius: 20 }}>{sLabel}</span>
                        </td>
                        <td style={{ padding: '10px 1.25rem' }}>
                          <span style={{ background: emp.active ? '#14532d33' : '#1f1f1f', color: emp.active ? '#4ade80' : '#4b5563', fontSize: 11, padding: '2px 10px', borderRadius: 20 }}>
                            {emp.active ? 'активен' : 'неактивен'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 1.25rem' }}>
                          <button onClick={() => toggleEmployee(emp)} style={{ background: emp.active ? '#7f1d1d33' : '#14532d33', border: `1px solid ${emp.active ? '#7f1d1d' : '#14532d'}`, borderRadius: 6, padding: '4px 10px', color: emp.active ? '#f87171' : '#4ade80', fontSize: 11, cursor: 'pointer' }}>
                            {emp.active ? 'Деактивировать' : 'Активировать'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: '1rem' }}>📋 Еженедельные отчёты</div>
            {reports.length === 0 ? (
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                Отчёты пока не сгенерированы. Они появятся здесь каждую пятницу.
              </div>
            ) : reports.map((report, i) => (
              <div key={report.id || i} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
                      Отчёт за неделю {report.week_number || i + 1}
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                      {report.created_at ? new Date(report.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {report.positive_count !== undefined && (
                      <>
                        <span style={{ background: '#14532d33', color: '#4ade80', fontSize: 11, padding: '2px 10px', borderRadius: 20 }}>✓ {report.positive_count}</span>
                        <span style={{ background: '#78350f33', color: '#fbbf24', fontSize: 11, padding: '2px 10px', borderRadius: 20 }}>~ {report.neutral_count}</span>
                        <span style={{ background: '#7f1d1d33', color: '#f87171', fontSize: 11, padding: '2px 10px', borderRadius: 20 }}>⚠ {report.negative_count}</span>
                      </>
                    )}
                  </div>
                </div>
                {report.report_text && (
                  <div style={{ background: '#111', borderRadius: 8, padding: '1rem', fontSize: 13, color: '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {report.report_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}