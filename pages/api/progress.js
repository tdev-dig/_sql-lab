import { createAdminClient } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { class_id } = req.query
  const supabase = createAdminClient()

  // Apprenants de la classe avec leurs soumissions agrégées
  let usersQuery = supabase
    .from('users')
    .select(`
      id, full_name, email,
      classes(name),
      submissions(is_correct, score, submitted_at, exercise_id)
    `)
    .eq('role', 'student')

  if (class_id) usersQuery = usersQuery.eq('class_id', class_id)

  const { data: users, error } = await usersQuery

  if (error) return res.status(500).json({ error: error.message })

  // Calcul stats par apprenant
  const stats = users.map(u => {
    const subs = u.submissions ?? []
    const total = subs.length
    const correct = subs.filter(s => s.is_correct).length
    const totalScore = subs.reduce((acc, s) => acc + (s.score ?? 0), 0)
    const uniqueExercises = new Set(subs.map(s => s.exercise_id)).size
    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      class: u.classes?.name ?? '—',
      total_submissions: total,
      correct_submissions: correct,
      success_rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      total_score: totalScore,
      exercises_attempted: uniqueExercises
    }
  })

  return res.status(200).json(stats)
}
