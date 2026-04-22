import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase.js'

const GOLD   = '#C8922A'
const BLACK  = '#1C1C1C'
const SURFACE = '#F5F4F1'
const BORDER  = '#E2E0D8'
const MUTED   = '#8A8880'
const SUCCESS = '#3A7D20'
const BG      = '#F0EEE9'

const WORKOUT_TYPES = ['Push', 'Pull', 'Benen', 'Full Body', 'Core', 'Cardio']
const BAND_COLORS = ['Geel', 'Groen', 'Rood', 'Blauw', 'Zwart', 'Oranje', 'Paars']
const BAND_HEX = { Geel: '#F5C518', Groen: '#4CAF50', Rood: '#E53935', Blauw: '#1E88E5', Zwart: '#1C1C1C', Oranje: '#FB8C00', Paars: '#8E24AA' }
const SET_TYPES = ['Reps', 'Tijd', 'Band']

const EXERCISE_LIST = {
  Push: [
    'Bench Press (Barbell)','Incline Bench Press (Barbell)','Decline Bench Press (Barbell)',
    'Bench Press (Dumbbell)','Incline Bench Press (Dumbbell)','Decline Bench Press (Dumbbell)','Chest Fly (Dumbbell)','Pullover (Dumbbell)',
    'Bench Press (Smith Machine)','Incline Bench Press (Smith Machine)',
    'Cable Fly','Cable Crossover','Pec Deck','Chest Press (Machine)',
    'Push-up','Dips (Chest)',
    'Overhead Press (Barbell)','Push Press (Barbell)',
    'Shoulder Press (Dumbbell)','Lateral Raise (Dumbbell)','Front Raise (Dumbbell)','Arnold Press',
    'Lateral Raise (Cable)','Front Raise (Cable)','Shoulder Press (Machine)','Reverse Pec Deck',
    'Skull Crushers (Barbell)','Close Grip Bench Press',
    'Skull Crushers (Dumbbell)','Tricep Kickback (Dumbbell)','Overhead Tricep Extension (Dumbbell)',
    'Tricep Pushdown (Touw)','Tricep Pushdown (Straight Bar)','Overhead Tricep Extension (Cable)','Tricep Dips (Machine)',
  ],
  Pull: [
    'Deadlift (Barbell)','Barbell Row (Overhand)','Barbell Row (Underhand)','T-Bar Row','Rack Pull',
    'Single Arm Row (Dumbbell)','Chest Supported Row (Dumbbell)','Pullover (Dumbbell)',
    'Lat Pulldown (Brede Grip)','Lat Pulldown (Smalle Grip)','Lat Pulldown (Underhand)',
    'Seated Cable Row (Brede Grip)','Seated Cable Row (Smalle Grip)','Straight Arm Pulldown','Machine Row','Chest Supported Row (Machine)',
    'Pull-up (Overhand)','Pull-up (Underhand / Chin-up)','Pull-up (Neutraal)','Assisted Pull-up',
    'Face Pull (Cable)','Rear Delt Fly (Dumbbell)','Rear Delt Fly (Machine)','Shrugs (Barbell)','Shrugs (Dumbbell)',
    'Bicep Curl (Barbell)','EZ-Bar Curl','Preacher Curl (Barbell)',
    'Bicep Curl (Dumbbell)','Hammer Curl (Dumbbell)','Incline Curl (Dumbbell)','Concentration Curl',
    'Bicep Curl (Cable)','Hammer Curl (Cable)','Preacher Curl (Machine)',
  ],
  Benen: [
    'Squat (Barbell)','Front Squat (Barbell)','Pause Squat (Barbell)',
    'Squat (Smith Machine)','Split Squat (Smith Machine)',
    'Leg Press (Machine)','Leg Extension (Machine)','Hack Squat (Machine)',
    'Goblet Squat (Dumbbell)','Lunges (Dumbbell)','Lunges (Barbell)',
    'Bulgarian Split Squat (Dumbbell)','Bulgarian Split Squat (Barbell)','Step-up (Dumbbell)',
    'Romanian Deadlift (Barbell)','Stiff Leg Deadlift (Barbell)','Good Morning (Barbell)',
    'Romanian Deadlift (Dumbbell)',
    'Leg Curl (Lying)','Leg Curl (Seated)','Nordic Curl',
    'Hip Thrust (Barbell)','Hip Thrust (Machine)','Hip Thrust (Dumbbell)',
    'Cable Kickback','Glute Bridge (Barbell)','Abductie (Machine)','Adductie (Machine)',
    'Calf Raise (Standing)','Calf Raise (Seated)','Calf Raise (Leg Press)',
  ],
  'Full Body': [
    'Deadlift (Barbell)','Squat (Barbell)','Bench Press (Barbell)','Pull-up (Overhand)',
    'Overhead Press (Barbell)','Barbell Row (Overhand)','Clean and Press','Thruster (Barbell)',
    'Kettlebell Swing','Turkish Get-up',
  ],
  Core: [
    'Plank','Side Plank','Crunches','Cable Crunch','Ab Rollout',
    'Leg Raise (Hanging)','Leg Raise (Bench)','Russian Twist',
    'Dead Bug','Bird Dog','Woodchop (Cable)','Pallof Press',
  ],
  Cardio: [
    'Loopband','Fiets (Upright)','Fiets (Ligfiets)','Roeien','Crosstrainer',
    'Stepmill','Ski Erg','Buiten Hardlopen','HIIT (Loopband)','Intervaltraining (Fiets)','Steady State Cardio',
  ],
}

const ALL_EXERCISES = [...new Set(Object.values(EXERCISE_LIST).flat())].sort()
const calc1RM = (weight, reps) => reps === 1 ? weight : Math.round(weight * (1 + reps / 30))
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d) { return new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }) }
function fmtDateFull(d) { return new Date(d + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' }) }
function fmtSet(set) {
  if (set.setType === 'Tijd') return set.seconds ? `${set.seconds}s` : '–'
  if (set.setType === 'Band') return set.band ? `${set.band}${set.reps ? ` × ${set.reps}` : ''}` : '–'
  return set.weight && set.reps ? `${set.weight}kg × ${set.reps}` : '–'
}

async function dbLoadSessions() {
  const { data, error } = await supabase.from('workouts').select('*').order('date', { ascending: false }).order('id', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}
async function dbSaveSession(session) {
  const { error } = await supabase.from('workouts').upsert({ id: session.id, date: session.date, type: session.type, exercises: session.exercises, notes: session.notes })
  if (error) console.error(error)
}
async function dbLoadCheckins() {
  const { data, error } = await supabase.from('checkins').select('*').order('date', { ascending: false })
  if (error) { console.error(error); return [] }
  return data
}
async function dbSaveCheckin(entry) {
  const { error } = await supabase.from('checkins').upsert({ ...entry, updated_at: new Date().toISOString() })
  if (error) console.error(error)
}

const s = {
  inp: { padding: '9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, background: '#fff', color: '#1C1C1C', outline: 'none', width: '100%', boxSizing: 'border-box' },
  lbl: { fontSize: 11, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' },
}

function GoldBar() { return <div style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} /> }
function SectionLabel({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}><GoldBar /><span style={{ fontSize: 13, fontWeight: 500, color: GOLD }}>{children}</span></div>
}
function Card({ children, style }) {
  return <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', marginBottom: 12, ...style }}>{children}</div>
}
function StatPill({ label, value, unit, accent }) {
  return (
    <div style={{ background: accent ? BLACK : SURFACE, borderRadius: 10, padding: '12px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent ? '#6B5520' : MUTED, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ? GOLD : BLACK, lineHeight: 1.1 }}>{value ?? <span style={{ opacity: 0.3 }}>–</span>}</div>
      {unit && <div style={{ fontSize: 10, color: accent ? '#6B5520' : MUTED, marginTop: 2 }}>{unit}</div>}
    </div>
  )
}

function LineChart({ data, color = GOLD, formatY = v => v }) {
  if (!data || data.length < 2) return <div style={{ textAlign: 'center', padding: '30px 0', color: MUTED, fontSize: 13 }}>Minimaal 2 sessies nodig</div>
  const W = 560, H = 140, pL = 52, pR = 12, pT = 12, pB = 30
  const vals = data.map(d => d.y), minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV - minV || 1
  const toX = i => pL + (i / (data.length - 1)) * (W - pL - pR)
  const toY = v => pT + (1 - (v - minV) / range) * (H - pT - pB)
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.y), ...d }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length-1].x},${H-pB} L${pL},${H-pB} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0,0.5,1].map((t,i) => { const y = pT+t*(H-pT-pB), v = maxV-t*range; return <g key={i}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke={BORDER} strokeWidth={0.8}/><text x={pL-5} y={y+4} textAnchor="end" fontSize={9} fill={MUTED}>{formatY(Math.round(v*10)/10)}</text></g> })}
      <path d={areaD} fill={color} fillOpacity={0.08}/>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color}/>)}
      {data.length <= 10 && pts.map((p,i) => <text key={i} x={p.x} y={H-6} textAnchor="middle" fontSize={9} fill={MUTED}>{fmtDate(p.date)}</text>)}
    </svg>
  )
}

function BarChart({ data, color = GOLD }) {
  if (!data || data.length < 1) return null
  const W = 560, H = 100, pL = 52, pR = 12, pT = 10, pB = 28
  const maxV = Math.max(...data.map(d => d.y), 1), step = (W-pL-pR)/data.length, bw = Math.min(34, step-6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0,0.5,1].map((t,i) => { const y = pT+t*(H-pT-pB); return <g key={i}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke={BORDER} strokeWidth={0.8}/><text x={pL-5} y={y+4} textAnchor="end" fontSize={9} fill={MUTED}>{Math.round((1-t)*maxV)}</text></g> })}
      {data.map((d,i) => { const x = pL+i*step+step/2-bw/2, barH = (d.y/maxV)*(H-pT-pB); return <g key={i}><rect x={x} y={H-pB-barH} width={bw} height={barH} fill={color} fillOpacity={0.85} rx={3}/>{data.length<=8&&<text x={x+bw/2} y={H-6} textAnchor="middle" fontSize={9} fill={MUTED}>{fmtDate(d.date)}</text>}</g> })}
    </svg>
  )
}

function SetRow({ set, index, onChange, onRemove }) {
  const type = set.setType || 'Reps'
  const est = type === 'Reps' && set.weight && set.reps ? calc1RM(parseFloat(set.weight), parseInt(set.reps)) : null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, marginLeft: 26 }}>
        {SET_TYPES.map(t => (
          <button key={t} onClick={() => onChange('setType', t)} style={{
            padding: '3px 10px', borderRadius: 20, border: `1px solid ${type === t ? GOLD : BORDER}`,
            background: type === t ? BLACK : 'transparent', color: type === t ? GOLD : MUTED,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, color: MUTED, width: 18, textAlign: 'center', flexShrink: 0 }}>{index + 1}</div>
        {type === 'Reps' && <>
          <div style={{ flex: 1 }}><input style={s.inp} type="number" placeholder="kg" step="0.5" value={set.weight || ''} onChange={e => onChange('weight', e.target.value)}/></div>
          <div style={{ flex: 1 }}><input style={s.inp} type="number" placeholder="reps" value={set.reps || ''} onChange={e => onChange('reps', e.target.value)}/></div>
          <div style={{ width: 58, fontSize: 11, color: est ? GOLD : MUTED, textAlign: 'center', fontWeight: 600, flexShrink: 0 }}>{est ? `${est}kg` : '1RM'}</div>
        </>}
        {type === 'Tijd' && <>
          <div style={{ flex: 1 }}><input style={s.inp} type="number" placeholder="seconden" value={set.seconds || ''} onChange={e => onChange('seconds', e.target.value)}/></div>
          <div style={{ flex: 1 }}><input style={s.inp} type="number" placeholder="reps (opt.)" value={set.reps || ''} onChange={e => onChange('reps', e.target.value)}/></div>
          <div style={{ width: 58, fontSize: 11, color: MUTED, textAlign: 'center', flexShrink: 0 }}>{set.seconds ? `${set.seconds}s` : '–'}</div>
        </>}
        {type === 'Band' && <>
          <div style={{ flex: 1 }}>
            <select style={s.inp} value={set.band || ''} onChange={e => onChange('band', e.target.value)}>
              <option value="">Kleur...</option>
              {BAND_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}><input style={s.inp} type="number" placeholder="reps (opt.)" value={set.reps || ''} onChange={e => onChange('reps', e.target.value)}/></div>
          <div style={{ width: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {set.band && <div style={{ width: 20, height: 20, borderRadius: '50%', background: BAND_HEX[set.band] || MUTED, border: '2px solid white', boxShadow: '0 0 0 1px #ccc' }}/>}
          </div>
        </>}
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 18, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
    </div>
  )
}

function ExerciseBlock({ ex, onUpdate, onRemove, suggestions }) {
  const [showSugg, setShowSugg] = useState(false)
  const ref = useRef()
  const filtered = suggestions.filter(s => s.toLowerCase().includes(ex.name.toLowerCase()) && s.toLowerCase() !== ex.name.toLowerCase()).slice(0, 8)
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setShowSugg(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  const addSet = () => {
    const last = ex.sets[ex.sets.length - 1] || {}
    onUpdate({ ...ex, sets: [...ex.sets, { setType: last.setType || 'Reps', weight: last.weight || '', reps: '', seconds: '', band: last.band || '' }] })
  }
  const updateSet = (i, k, v) => onUpdate({ ...ex, sets: ex.sets.map((set, si) => si === i ? { ...set, [k]: v } : set) })
  const removeSet = i => onUpdate({ ...ex, sets: ex.sets.filter((_, si) => si !== i) })
  const repsSets = ex.sets.filter(s => (s.setType === 'Reps' || !s.setType) && s.weight && s.reps)
  const totalVol = repsSets.reduce((a, s) => a + parseFloat(s.weight) * parseInt(s.reps), 0)
  const best1RM = repsSets.reduce((b, s) => Math.max(b, calc1RM(parseFloat(s.weight), parseInt(s.reps))), 0)
  return (
    <div style={{ background: SURFACE, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }} ref={ref}>
          <input style={{ ...s.inp, fontWeight: 500 }} placeholder="Oefening zoeken..." value={ex.name}
            onChange={e => { onUpdate({ ...ex, name: e.target.value }); setShowSugg(true) }}
            onFocus={() => setShowSugg(true)}/>
          {showSugg && filtered.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', maxHeight: 280, overflowY: 'auto' }}>
              {filtered.map(sug => <div key={sug} onClick={() => { onUpdate({ ...ex, name: sug }); setShowSugg(false) }} style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: `1px solid ${BORDER}`, color: BLACK }} onMouseEnter={e => e.currentTarget.style.background=SURFACE} onMouseLeave={e => e.currentTarget.style.background='#fff'}>{sug}</div>)}
            </div>
          )}
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>
      {ex.sets.map((set, i) => <SetRow key={i} set={set} index={i} onChange={(k,v) => updateSet(i,k,v)} onRemove={() => removeSet(i)}/>)}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button onClick={addSet} style={{ background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 7, padding: '6px 14px', fontSize: 12, color: MUTED, cursor: 'pointer' }}>+ Set toevoegen</button>
        <div style={{ fontSize: 11, color: MUTED }}>
          {totalVol > 0 && <span>Vol: <strong style={{ color: BLACK }}>{totalVol.toLocaleString('nl-NL')} kg</strong></span>}
          {best1RM > 0 && <span style={{ marginLeft: 10 }}>1RM: <strong style={{ color: GOLD }}>{best1RM} kg</strong></span>}
        </div>
      </div>
    </div>
  )
}

const EMPTY_CI = { gewicht: '', calorieen: '', eiwitten: '', koolhydraten: '', vetten: '', water: '', stappen: '', opmerkingen: '' }

export default function App() {
  const [tab, setTab] = useState('training')
  const [sessions, setSessions] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [wDate, setWDate] = useState(todayStr())
  const [wType, setWType] = useState('Push')
  const [exercises, setExercises] = useState([{ id: 1, name: '', sets: [{ setType: 'Reps', weight: '', reps: '', seconds: '', band: '' }] }])
  const [wNotes, setWNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [workoutView, setWorkoutView] = useState('log')
  const [checkin, setCheckin] = useState(EMPTY_CI)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [progExercise, setProgExercise] = useState('')
  const [progMetric, setProgMetric] = useState('1rm')

  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([dbLoadSessions(), dbLoadCheckins()])
    setSessions(s); setCheckins(c)
    const todayCI = c.find(e => e.date === todayStr())
    if (todayCI) setCheckin(todayCI)
    const allEx = [...new Set(s.flatMap(s => (s.exercises||[]).map(e => e.name)).filter(Boolean))]
    if (allEx.length && !progExercise) setProgExercise(allEx[0])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const usedExercises = [...new Set(sessions.flatMap(s => (s.exercises||[]).map(e => e.name)).filter(Boolean))].sort()
  const allExSugg = [...new Set([...ALL_EXERCISES, ...usedExercises])].sort()

  const handleSaveWorkout = async () => {
    const validEx = exercises.filter(e => e.name && e.sets.some(s => s.weight || s.seconds || s.band))
    if (!validEx.length) return
    await dbSaveSession({ id: Date.now(), date: wDate, type: wType, exercises: validEx, notes: wNotes })
    setSaved(true)
    setExercises([{ id: Date.now(), name: '', sets: [{ setType: 'Reps', weight: '', reps: '', seconds: '', band: '' }] }])
    setWNotes('')
    await reload()
    setTimeout(() => { setSaved(false); setWorkoutView('history') }, 1500)
  }

  const handleSaveCheckin = async () => {
    await dbSaveCheckin({ ...checkin, date: todayStr() })
    setCheckinSaved(true)
    await reload()
    setTimeout(() => setCheckinSaved(false), 2000)
  }

  const exerciseHistory = sessions.filter(s => (s.exercises||[]).some(e => e.name === progExercise)).map(s => {
    const ex = s.exercises.find(e => e.name === progExercise)
    const vs = (ex.sets||[]).filter(s => (s.setType === 'Reps' || !s.setType) && s.weight && s.reps)
    return { date: s.date, best1RM: vs.reduce((b,s) => Math.max(b, calc1RM(parseFloat(s.weight), parseInt(s.reps))), 0), maxWeight: vs.reduce((b,s) => Math.max(b, parseFloat(s.weight)), 0), totalVol: vs.reduce((a,s) => a+parseFloat(s.weight)*parseInt(s.reps), 0), sets: vs }
  }).reverse()

  const progData = exerciseHistory.map(e => ({ date: e.date, y: progMetric==='1rm'?e.best1RM:progMetric==='weight'?e.maxWeight:progMetric==='volume'?e.totalVol:e.sets.length }))

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:BG }}><div style={{ textAlign:'center' }}><div style={{ fontSize:24, fontWeight:700, color:GOLD, marginBottom:8 }}>Dansonn Fit</div><div style={{ fontSize:13, color:MUTED }}>Laden...</div></div></div>

  return (
    <div style={{ background:BG, minHeight:'100vh', padding:'20px 16px 60px' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <div style={{ background:BLACK, borderRadius:16, padding:'20px 24px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:10, color:'#5A4820', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>Dansonn Fit</div>
              <div style={{ fontSize:26, fontWeight:700, color:GOLD, lineHeight:1.1, marginTop:2 }}>Berend</div>
              <div style={{ fontSize:12, color:'#5A4820', marginTop:3 }}>Coach: Danny</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'#5A4820' }}>{new Date().toLocaleDateString('nl-NL', { weekday:'long', day:'numeric', month:'long' })}</div>
              <div style={{ display:'flex', gap:6, marginTop:10, justifyContent:'flex-end' }}>
                {[['training','Training'],['checkin','Check-in'],['progressie','Progressie']].map(([v,l]) => (
                  <button key={v} onClick={() => setTab(v)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${tab===v?GOLD:'#3A3020'}`, background:tab===v?GOLD:'transparent', color:tab===v?BLACK:'#7A6030', fontSize:12, fontWeight:700, cursor:'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:14 }}>
          <StatPill label="Trainingen" value={sessions.length} unit="totaal" accent/>
          <StatPill label="Laatste" value={sessions[0]?fmtDate(sessions[0].date):null} unit={sessions[0]?.type}/>
          <StatPill label="Gewicht" value={checkins.find(c=>c.gewicht)?.gewicht||null} unit="kg"/>
          <StatPill label="Oefeningen" value={usedExercises.length} unit="gelogd"/>
        </div>

        {tab==='training' && (
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:14, background:SURFACE, borderRadius:10, padding:4 }}>
              {[['log','Nieuwe training'],['history','Trainingshistorie']].map(([v,l]) => (
                <button key={v} onClick={() => setWorkoutView(v)} style={{ flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background:workoutView===v?BLACK:'transparent', color:workoutView===v?GOLD:MUTED }}>{l}</button>
              ))}
            </div>
            {workoutView==='log' && (
              <div>
                <Card>
                  <SectionLabel>Sessie info</SectionLabel>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label style={s.lbl}>Datum</label><input style={s.inp} type="date" value={wDate} onChange={e=>setWDate(e.target.value)}/></div>
                    <div><label style={s.lbl}>Type</label><select style={s.inp} value={wType} onChange={e=>setWType(e.target.value)}>{WORKOUT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  </div>
                </Card>
                <Card>
                  <SectionLabel>Oefeningen</SectionLabel>
                  {exercises.map(ex => (
                    <ExerciseBlock key={ex.id} ex={ex}
                      suggestions={wType&&EXERCISE_LIST[wType]?[...new Set([...EXERCISE_LIST[wType],...usedExercises,...ALL_EXERCISES])]:allExSugg}
                      onUpdate={data=>setExercises(e=>e.map(e=>e.id===ex.id?{...e,...data}:e))}
                      onRemove={()=>setExercises(e=>e.filter(e=>e.id!==ex.id))}/>
                  ))}
                  <button onClick={()=>setExercises(ex=>[...ex,{id:Date.now(),name:'',sets:[{setType:'Reps',weight:'',reps:'',seconds:'',band:''}]}])} style={{ width:'100%', padding:'10px', borderRadius:10, border:`1.5px dashed ${BORDER}`, background:'none', color:MUTED, fontSize:13, cursor:'pointer', marginTop:4 }}>
                    + Oefening toevoegen
                  </button>
                  <div style={{ fontSize:10, color:MUTED, marginTop:10, paddingTop:10, borderTop:`1px solid ${BORDER}` }}>
                    * 1RM via Epley (alleen bij Reps). Tijd = seconden. Band = kleur weerstandsband.
                  </div>
                </Card>
                <Card>
                  <SectionLabel>Notities</SectionLabel>
                  <textarea style={{ ...s.inp, height:72, resize:'vertical', fontFamily:'inherit', fontSize:13 }} placeholder="Gevoel, blessures, opmerkingen..." value={wNotes} onChange={e=>setWNotes(e.target.value)}/>
                </Card>
                <button onClick={handleSaveWorkout} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', cursor:'pointer', background:saved?SUCCESS:BLACK, color:saved?'#7BC950':GOLD, fontSize:15, fontWeight:700, transition:'all 0.2s' }}>
                  {saved?'Sessie opgeslagen!':'Sessie opslaan'}
                </button>
              </div>
            )}
            {workoutView==='history' && (
              <div>
                {sessions.length===0
                  ? <Card style={{ textAlign:'center', padding:'40px 20px' }}><div style={{ color:MUTED }}>Nog geen trainingen gelogd.</div></Card>
                  : sessions.map(s => {
                    const allSets = (s.exercises||[]).flatMap(e=>(e.sets||[]))
                    const repsSets = allSets.filter(st=>(!st.setType||st.setType==='Reps')&&st.weight&&st.reps)
                    const totalVol = repsSets.reduce((a,st)=>a+parseFloat(st.weight)*parseInt(st.reps),0)
                    return (
                      <Card key={s.id}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                          <div>
                            <div style={{ fontSize:14, fontWeight:600, color:BLACK }}>{fmtDateFull(s.date)}</div>
                            <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>{(s.exercises||[]).filter(e=>e.name).length} oefeningen · {allSets.length} sets</div>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <span style={{ fontSize:11, background:BLACK, color:GOLD, padding:'3px 10px', borderRadius:20, fontWeight:700 }}>{s.type}</span>
                            {totalVol > 0 && <span style={{ fontSize:11, color:MUTED }}>{(totalVol/1000).toFixed(1)}t</span>}
                          </div>
                        </div>
                        {(s.exercises||[]).filter(e=>e.name).map((ex,ei,arr)=>{
                          const vs = (ex.sets||[]).filter(st=>(!st.setType||st.setType==='Reps')&&st.weight&&st.reps)
                          const top1RM = vs.reduce((b,s)=>Math.max(b,calc1RM(parseFloat(s.weight),parseInt(s.reps))),0)
                          return (
                            <div key={ei} style={{ marginBottom:ei<arr.length-1?10:0 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                                <span style={{ fontSize:13, fontWeight:500, color:BLACK }}>{ex.name}</span>
                                {top1RM>0&&<span style={{ fontSize:11, color:GOLD }}>1RM ~{top1RM} kg</span>}
                              </div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                {(ex.sets||[]).map((set,si)=>{
                                  const isBand = set.setType==='Band'
                                  return (
                                    <span key={si} style={{ fontSize:11, background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:6, padding:'3px 8px', color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                                      {isBand && set.band && <span style={{ width:10, height:10, borderRadius:'50%', background:BAND_HEX[set.band]||MUTED, display:'inline-block', flexShrink:0 }}/>}
                                      {fmtSet(set)}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                        {s.notes&&<div style={{ marginTop:10, fontSize:12, color:MUTED, fontStyle:'italic', paddingTop:10, borderTop:`1px solid ${BORDER}` }}>{s.notes}</div>}
                      </Card>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {tab==='checkin' && (
          <div>
            <Card><SectionLabel>Lichaamsgewicht</SectionLabel><label style={s.lbl}>Gewicht (kg)</label><input style={s.inp} type="number" step="0.1" placeholder="bijv. 83.5" value={checkin.gewicht} onChange={e=>setCheckin(c=>({...c,gewicht:e.target.value}))}/></Card>
            <Card>
              <SectionLabel>Voeding & activiteit</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['calorieen','Calorieën (kcal)','2200'],['eiwitten','Eiwitten (g)','170'],['koolhydraten','Koolhydraten (g)','220'],['vetten','Vetten (g)','70'],['water','Water (L)','2.5'],['stappen','Stappen','8500']].map(([k,label,ph])=>(
                  <div key={k}><label style={s.lbl}>{label}</label><input style={s.inp} type="number" step={k==='water'?'0.1':'1'} placeholder={ph} value={checkin[k]||''} onChange={e=>setCheckin(c=>({...c,[k]:e.target.value}))}/></div>
                ))}
              </div>
            </Card>
            <Card><SectionLabel>Opmerkingen voor Danny</SectionLabel><textarea style={{ ...s.inp, height:80, resize:'vertical', fontFamily:'inherit', fontSize:13 }} placeholder="Energieniveau, slaap, gevoel..." value={checkin.opmerkingen||''} onChange={e=>setCheckin(c=>({...c,opmerkingen:e.target.value}))}/></Card>
            <button onClick={handleSaveCheckin} style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', cursor:'pointer', background:checkinSaved?SUCCESS:BLACK, color:checkinSaved?'#7BC950':GOLD, fontSize:15, fontWeight:700, transition:'all 0.2s' }}>{checkinSaved?'Opgeslagen!':'Check-in opslaan'}</button>
            {checkins.length>0&&<div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, fontWeight:500, color:MUTED, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Recente check-ins</div>
              {checkins.slice(0,5).map(c=>(
                <Card key={c.date} style={{ padding:'12px 16px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span style={{ fontSize:13, fontWeight:500, color:BLACK }}>{fmtDateFull(c.date)}</span>{c.gewicht&&<span style={{ fontSize:13, color:GOLD, fontWeight:700 }}>{c.gewicht} kg</span>}</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>{[['Kcal',c.calorieen],['Eiwit',c.eiwitten?`${c.eiwitten}g`:null],['Water',c.water?`${c.water}L`:null],['Stappen',c.stappen?parseInt(c.stappen).toLocaleString('nl-NL'):null]].filter(([,v])=>v).map(([l,v])=><span key={l} style={{ fontSize:11, background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:6, padding:'3px 8px', color:'#555' }}>{l}: {v}</span>)}</div>
                </Card>
              ))}
            </div>}
          </div>
        )}

        {tab==='progressie' && (
          <div>
            {usedExercises.length===0
              ? <Card style={{ textAlign:'center', padding:'40px 20px' }}><div style={{ color:MUTED }}>Log eerst trainingen om progressie te zien.</div></Card>
              : <>
                <Card>
                  <SectionLabel>Selecteer oefening</SectionLabel>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div><label style={s.lbl}>Oefening</label><select style={s.inp} value={progExercise} onChange={e=>setProgExercise(e.target.value)}>{usedExercises.map(e=><option key={e}>{e}</option>)}</select></div>
                    <div><label style={s.lbl}>Metric</label><select style={s.inp} value={progMetric} onChange={e=>setProgMetric(e.target.value)}><option value="1rm">Geschatte 1RM (kg)</option><option value="weight">Max. gewicht (kg)</option><option value="volume">Totaal volume (kg)</option><option value="sets">Aantal sets</option></select></div>
                  </div>
                </Card>
                {exerciseHistory.length>0&&<>
                  <Card>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}><SectionLabel>{progExercise}</SectionLabel><span style={{ fontSize:12, color:MUTED }}>{exerciseHistory.length} sessies</span></div>
                    <LineChart data={progData} color={GOLD} formatY={v=>progMetric==='volume'?`${(v/1000).toFixed(1)}t`:`${v}`}/>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginTop:16 }}>
                      {(()=>{
                        const maxRM=Math.max(...exerciseHistory.map(e=>e.best1RM))
                        const maxW=Math.max(...exerciseHistory.map(e=>e.maxWeight))
                        const totalVol=exerciseHistory.reduce((a,e)=>a+e.totalVol,0)
                        const delta=exerciseHistory.length>1?exerciseHistory[exerciseHistory.length-1].best1RM-exerciseHistory[0].best1RM:0
                        return [
                          {label:'Beste 1RM',value:`${maxRM} kg`,sub:delta!==0?`${delta>0?'+':''}${delta} kg`:null},
                          {label:'Max gewicht',value:`${maxW} kg`,sub:null},
                          {label:'Totaal volume',value:`${(totalVol/1000).toFixed(1)}t`,sub:'alle sessies'},
                          {label:'Sessies',value:exerciseHistory.length,sub:null},
                        ]
                      })().map(({label,value,sub})=>(
                        <div key={label} style={{ background:SURFACE, borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:MUTED, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
                          <div style={{ fontSize:16, fontWeight:700, color:BLACK }}>{value}</div>
                          {sub&&<div style={{ fontSize:10, color:GOLD, marginTop:2 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>
                  </Card>
                  {exerciseHistory.length>=2&&<Card><SectionLabel>Volume per sessie</SectionLabel><BarChart data={exerciseHistory.map(e=>({date:e.date,y:e.totalVol}))} color={GOLD}/></Card>}
                  <Card>
                    <SectionLabel>Sessie log — {progExercise}</SectionLabel>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead><tr style={{ borderBottom:`2px solid ${BORDER}` }}>{['Datum','Sets','Beste set','1RM','Volume'].map(h=><th key={h} style={{ padding:'6px 10px', textAlign:'left', color:MUTED, fontWeight:500, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>)}</tr></thead>
                        <tbody>{[...exerciseHistory].reverse().map((e,i)=>{
                          const bestSet=e.sets.reduce((b,s)=>parseFloat(s.weight)>=parseFloat(b.weight||0)?s:b,{})
                          return <tr key={i} style={{ borderBottom:`1px solid ${BORDER}`, background:i%2===0?'transparent':SURFACE }}>
                            <td style={{ padding:'9px 10px', fontWeight:500, color:BLACK }}>{fmtDateFull(e.date)}</td>
                            <td style={{ padding:'9px 10px', color:'#555' }}>{e.sets.length}</td>
                            <td style={{ padding:'9px 10px', color:'#555' }}>{bestSet.weight}kg × {bestSet.reps}</td>
                            <td style={{ padding:'9px 10px', color:GOLD, fontWeight:700 }}>{e.best1RM} kg</td>
                            <td style={{ padding:'9px 10px', color:'#555' }}>{e.totalVol.toLocaleString('nl-NL')} kg</td>
                          </tr>
                        })}</tbody>
                      </table>
                    </div>
                  </Card>
                </>}
              </>}
          </div>
        )}

        <div style={{ textAlign:'center', fontSize:10, color:MUTED, marginTop:24, letterSpacing:'0.06em' }}>DANSONN FIT © {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}

    
