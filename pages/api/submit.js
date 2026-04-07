import { createAdminClient } from '../../../lib/supabase'

// Tables autorisées pour les exercices (sécurité : on bloque tout le reste)
const ALLOWED_TABLES = ['clients', 'produits', 'commandes']

// Mots-clés interdits (on accepte uniquement les SELECT)
const FORBIDDEN_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'truncate',
  'alter', 'create', 'grant', 'revoke', 'pg_', 'auth.'
]

function isSafeQuery(sql) {
  const lower = sql.toLowerCase().trim()
  // Doit commencer par SELECT
  if (!lower.startsWith('select')) return false
  // Pas de mots-clés dangereux
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (lower.includes(kw)) return false
  }
  return true
}

function normalizeResult(rows) {
  // Normalise pour la comparaison : tri par JSON stringifié
  return JSON.stringify(
    rows.map(r =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, String(v ?? '').trim().toLowerCase()])
      )
    )
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const { sql, exercise_id, user_id } = req.body

  if (!sql || !exercise_id || !user_id) {
    return res.status(400).json({ error: 'Paramètres manquants' })
  }

  // Vérification sécurité
  if (!isSafeQuery(sql)) {
    return res.status(400).json({
      error: 'Requête non autorisée. Seules les requêtes SELECT sont acceptées.'
    })
  }

  const supabase = createAdminClient()

  try {
    // 1. Récupérer l'exercice pour avoir le résultat attendu
    const { data: exercise, error: exErr } = await supabase
      .from('exercises')
      .select('expected_result, points, type')
      .eq('id', exercise_id)
      .single()

    if (exErr || !exercise) {
      return res.status(404).json({ error: 'Exercice introuvable' })
    }

    // 2. Exécuter la requête de l'apprenant
    const { data: userRows, error: userErr } = await supabase.rpc('run_sql', { query: sql })

    if (userErr) {
      return res.status(200).json({
        success: false,
        is_correct: false,
        error: userErr.message,
        user_result: null
      })
    }

    // 3. Exécuter la requête attendue
    const { data: expectedRows } = await supabase.rpc('run_sql', {
      query: exercise.expected_result
    })

    // 4. Comparer les résultats (insensible à la casse et aux espaces)
    const is_correct = normalizeResult(userRows) === normalizeResult(expectedRows ?? [])
    const score = is_correct ? exercise.points : 0

    // 5. Enregistrer la soumission
    await supabase.from('submissions').insert({
      user_id,
      exercise_id,
      answer: sql,
      is_correct,
      score
    })

    return res.status(200).json({
      success: true,
      is_correct,
      score,
      user_result: userRows,
      expected_result: is_correct ? null : expectedRows, // on ne montre pas si correct
      message: is_correct
        ? '✓ Bonne réponse !'
        : '✗ Pas tout à fait. Vérifie ta requête.'
    })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
