import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

// ── Utilisateur de démo (à remplacer par auth Supabase plus tard) ──
const DEMO_USER = {
  id: null, // sera remplacé par un vrai UUID apprenant
  name: 'Apprenant',
  class: 'Data Analyst 2025'
}

// ── Parse les instructions markdown basique ──
function parseInstructions(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

// ── Composant tableau de résultats ──
function ResultTable({ rows }) {
  if (!rows || rows.length === 0)
    return <p className="empty-state">Aucun résultat retourné.</p>

  const cols = Object.keys(rows[0])
  return (
    <div className="result-table-wrap fade-in">
      <table className="result-table">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map(c => <td key={c}>{row[c] ?? <span style={{color:'var(--muted)'}}>null</span>}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Composant quiz QCM ──
function QuizExercise({ exercise, userId, onSubmitDone }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // Parse les options depuis les instructions
  const lines = exercise.instructions.split('\n')
  const question = lines[0]
  const options = lines.slice(1).filter(l => /^[A-D]\)/.test(l.trim()))

  async function handleSubmit() {
    if (!selected || loading) return
    setLoading(true)
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: selected,
        exercise_id: exercise.id,
        user_id: userId || '00000000-0000-0000-0000-000000000001'
      })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
    onSubmitDone?.(data.is_correct)
  }

  return (
    <div className="editor-zone">
      <div className="quiz-options">
        <p style={{color:'var(--text)', marginBottom: 8, fontSize: 14}}>{question}</p>
        {options.map(opt => {
          const letter = opt.trim()[0]
          const label = opt.trim().slice(2).trim()
          const isSelected = selected === letter
          const isCorrect = result && result.is_correct && isSelected
          const isWrong = result && !result.is_correct && isSelected
          return (
            <div
              key={letter}
              className={`quiz-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct-ans' : ''} ${isWrong ? 'wrong-ans' : ''}`}
              onClick={() => !result && setSelected(letter)}
            >
              <span className="option-letter">{letter}</span>
              <span>{label}</span>
            </div>
          )
        })}
        <button
          className="btn btn-run"
          onClick={handleSubmit}
          disabled={!selected || !!result || loading}
          style={{alignSelf: 'flex-start', marginTop: 8}}
        >
          {loading ? <span className="spinner"/> : null}
          Valider
        </button>
      </div>
      {result && (
        <div className={`feedback ${result.is_correct ? 'correct' : 'wrong'} fade-in`}>
          {result.is_correct ? '✓ Bonne réponse !' : `✗ Pas tout à fait. La bonne réponse était ${exercise.expected_result}.`}
          {result.score > 0 && <span style={{marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12}}>+{result.score} pts</span>}
        </div>
      )}
    </div>
  )
}

// ── Page principale ──
export default function Lab() {
  const [modules, setModules] = useState([])
  const [exercises, setExercises] = useState([])
  const [current, setCurrent] = useState(null)
  const [sql, setSql] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState({}) // { exercise_id: true/false }
  const [totalScore, setTotalScore] = useState(0)
  const textareaRef = useRef(null)

  // Charger modules + exercices au démarrage
  useEffect(() => {
    async function load() {
      const [mods, exs] = await Promise.all([
        fetch('/api/modules').then(r => r.json()),
        fetch('/api/exercises').then(r => r.json())
      ])
      setModules(Array.isArray(mods) ? mods : [])
      setExercises(Array.isArray(exs) ? exs : [])
      if (exs.length > 0) selectExercise(exs[0])
    }
    load()
  }, [])

  function selectExercise(ex) {
    setCurrent(ex)
    setSql('')
    setResult(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handleRun() {
    if (!sql.trim() || loading) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          exercise_id: current.id,
          user_id: DEMO_USER.id || '00000000-0000-0000-0000-000000000001'
        })
      })
      const data = await res.json()
      setResult(data)
      if (data.is_correct) {
        setDone(d => ({ ...d, [current.id]: true }))
        setTotalScore(s => s + (data.score || 0))
      } else {
        setDone(d => ({ ...d, [current.id]: d[current.id] ?? false }))
      }
    } catch {
      setResult({ success: false, error: 'Erreur réseau' })
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    // Ctrl+Enter ou Cmd+Enter pour exécuter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
    // Tab pour indenter
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newVal = sql.substring(0, start) + '  ' + sql.substring(end)
      setSql(newVal)
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }
  }

  // Stats progression
  const totalEx = exercises.length
  const doneCount = Object.values(done).filter(Boolean).length
  const progressPct = totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0

  return (
    <>
      <Head>
        <title>SQL Lab</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-dot"/>
              SQL Lab
            </div>
            <div className="user-info">
              <div className="user-name">{DEMO_USER.name}</div>
              <div>{DEMO_USER.class}</div>
            </div>
          </div>

          <div className="module-list">
            {modules.map(mod => {
              const modExs = exercises.filter(e => e.module_id === mod.id)
              if (modExs.length === 0) return null
              return (
                <div key={mod.id} className="module-section">
                  <div className="module-btn">{mod.name}</div>
                  {modExs.map(ex => (
                    <div
                      key={ex.id}
                      className={`exercise-item ${current?.id === ex.id ? 'active' : ''} ${done[ex.id] ? 'done' : ''}`}
                      onClick={() => selectExercise(ex)}
                    >
                      <span className={`ex-status ${done[ex.id] === true ? 'correct' : done[ex.id] === false ? 'wrong' : ''}`}>
                        {done[ex.id] === true ? '✓' : ''}
                      </span>
                      <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {ex.title}
                      </span>
                      <span className={`badge-diff ${ex.difficulty}`}>
                        {ex.difficulty === 'beginner' ? 'déb' : ex.difficulty === 'intermediate' ? 'int' : 'adv'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="sidebar-footer">
            <div className="score-bar-wrap">
              <div className="score-label">
                <span>Progression</span>
                <span style={{color:'var(--text)', fontFamily:'var(--mono)'}}>{doneCount}/{totalEx}</span>
              </div>
              <div className="score-bar">
                <div className="score-fill" style={{width: `${progressPct}%`}}/>
              </div>
            </div>
            <div style={{marginTop:8, fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)'}}>
              {totalScore} pts
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {!current ? (
            <div className="empty-state" style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>
              Sélectionne un exercice dans la liste
            </div>
          ) : (
            <>
              {/* Header exercice */}
              <div className="ex-header">
                <div className="ex-title">{current.title}</div>
                <div
                  className="ex-instructions"
                  dangerouslySetInnerHTML={{__html: parseInstructions(current.instructions)}}
                />
                <div className="ex-meta">
                  <span className="meta-pill">{current.type === 'quiz' ? 'Quiz' : 'Lab SQL'}</span>
                  <span className={`meta-pill badge-diff ${current.difficulty}`}>{current.difficulty}</span>
                  <span className="meta-pill">{current.points} pts</span>
                </div>
              </div>

              {/* Quiz ou éditeur SQL */}
              {current.type === 'quiz' ? (
                <QuizExercise
                  exercise={current}
                  userId={DEMO_USER.id}
                  onSubmitDone={correct => {
                    setDone(d => ({...d, [current.id]: correct}))
                    if (correct) setTotalScore(s => s + current.points)
                  }}
                />
              ) : (
                <div className="editor-zone">
                  <div className="editor-toolbar">
                    <span className="toolbar-label">SQL — Ctrl+Enter pour exécuter</span>
                    <button className="btn btn-clear" onClick={() => { setSql(''); setResult(null) }}>
                      Effacer
                    </button>
                    <button className="btn btn-run" onClick={handleRun} disabled={loading || !sql.trim()}>
                      {loading ? <span className="spinner"/> : null}
                      Exécuter
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    className="sql-editor"
                    value={sql}
                    onChange={e => setSql(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="SELECT * FROM clients;"
                    spellCheck={false}
                    autoComplete="off"
                  />

                  {/* Résultats */}
                  <div className="results-panel">
                    {!result ? (
                      <div className="empty-state" style={{paddingTop: 24}}>
                        Les résultats de ta requête apparaîtront ici
                      </div>
                    ) : result.error && !result.user_result ? (
                      <>
                        <div className="results-header">
                          <span className="result-badge error">Erreur SQL</span>
                        </div>
                        <div className="error-msg">{result.error}</div>
                      </>
                    ) : (
                      <>
                        <div className="results-header">
                          <span className={`result-badge ${result.is_correct ? 'correct' : 'wrong'}`}>
                            {result.is_correct ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          <span style={{marginLeft: 'auto'}}>
                            {result.user_result?.length ?? 0} ligne(s)
                          </span>
                          {result.score > 0 && (
                            <span style={{color:'var(--accent)', fontFamily:'var(--mono)', fontSize:11}}>
                              +{result.score} pts
                            </span>
                          )}
                        </div>
                        <ResultTable rows={result.user_result} />
                        {result.is_correct === false && result.error && (
                          <div className="error-msg">{result.error}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Feedback */}
                  {result && (
                    <div className={`feedback ${result.is_correct ? 'correct' : 'wrong'} fade-in`}>
                      <span>{result.message}</span>
                      {result.is_correct && result.score > 0 && (
                        <span style={{marginLeft:'auto', fontFamily:'var(--mono)', fontSize:12}}>
                          +{result.score} pts
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
