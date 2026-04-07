import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
    }}>
      <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6}}>{label}</div>
      <div style={{fontSize:24, fontWeight:700, fontFamily:'var(--mono)', color: accent || 'var(--text)'}}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/progress')
      .then(r => r.json())
      .then(data => { setStudents(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.class?.toLowerCase().includes(search.toLowerCase())
  )

  const avgRate = students.length > 0
    ? Math.round(students.reduce((a, s) => a + s.success_rate, 0) / students.length)
    : 0

  const totalSubs = students.reduce((a, s) => a + s.total_submissions, 0)

  return (
    <>
      <Head><title>Dashboard Coach — SQL Lab</title></Head>
      <div style={{minHeight:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--sans)'}}>

        {/* Header */}
        <div style={{background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'16px 32px', display:'flex', alignItems:'center', gap:16}}>
          <div style={{fontFamily:'var(--mono)', fontSize:13, fontWeight:700, color:'var(--accent)', display:'flex', alignItems:'center', gap:8}}>
            <span style={{width:8,height:8,background:'var(--accent)',borderRadius:'50%',display:'inline-block'}}/>
            SQL Lab
          </div>
          <span style={{color:'var(--border2)'}}>|</span>
          <span style={{color:'var(--muted)', fontSize:13}}>Dashboard coach</span>
          <Link href="/" style={{marginLeft:'auto', color:'var(--accent2)', fontSize:12, textDecoration:'none'}}>
            ← Vue apprenant
          </Link>
        </div>

        <div style={{maxWidth:1100, margin:'0 auto', padding:'28px 32px'}}>

          {/* Stats globales */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:28}}>
            <StatCard label="Apprenants" value={students.length} />
            <StatCard label="Soumissions" value={totalSubs} />
            <StatCard label="Taux de réussite moyen" value={`${avgRate}%`} accent="var(--accent)" />
            <StatCard label="Exercices tentés (total)" value={students.reduce((a,s) => a + s.exercises_attempted, 0)} />
          </div>

          {/* Barre de recherche */}
          <div style={{marginBottom:16}}>
            <input
              type="text"
              placeholder="Rechercher un apprenant ou une classe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background:'var(--bg2)', border:'1px solid var(--border2)',
                borderRadius:'var(--radius)', color:'var(--text)',
                fontFamily:'var(--sans)', fontSize:13,
                padding:'9px 14px', width:320, outline:'none'
              }}
            />
          </div>

          {/* Tableau apprenants */}
          <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontFamily:'var(--mono)', fontSize:12}}>
              <thead>
                <tr>
                  {['Apprenant','Classe','Tentatives','Correctes','Taux','Score total','Exercices'].map(h => (
                    <th key={h} style={{
                      padding:'10px 16px', textAlign:'left',
                      background:'var(--bg3)', color:'var(--accent2)',
                      fontSize:11, letterSpacing:'0.05em',
                      borderBottom:'1px solid var(--border)'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{padding:28, textAlign:'center', color:'var(--muted)'}}>Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{padding:28, textAlign:'center', color:'var(--muted)'}}>Aucun apprenant trouvé</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'10px 16px', color:'var(--text)', fontFamily:'var(--sans)', fontWeight:600}}>{s.full_name}</td>
                    <td style={{padding:'10px 16px', color:'var(--muted)'}}>{s.class}</td>
                    <td style={{padding:'10px 16px'}}>{s.total_submissions}</td>
                    <td style={{padding:'10px 16px', color:'var(--accent)'}}>{s.correct_submissions}</td>
                    <td style={{padding:'10px 16px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{flex:1, height:4, background:'var(--border2)', borderRadius:2, overflow:'hidden', width:60}}>
                          <div style={{height:'100%', width:`${s.success_rate}%`, background: s.success_rate >= 70 ? 'var(--accent)' : s.success_rate >= 40 ? 'var(--gold)' : 'var(--warn)', borderRadius:2}}/>
                        </div>
                        <span style={{color: s.success_rate >= 70 ? 'var(--accent)' : s.success_rate >= 40 ? 'var(--gold)' : 'var(--warn)'}}>
                          {s.success_rate}%
                        </span>
                      </div>
                    </td>
                    <td style={{padding:'10px 16px', color:'var(--accent)'}}>{s.total_score} pts</td>
                    <td style={{padding:'10px 16px', color:'var(--muted)'}}>{s.exercises_attempted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
