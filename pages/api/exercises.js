import { createAdminClient } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { module_id } = req.query
  const supabase = createAdminClient()

  const query = supabase
    .from('exercises')
    .select('id, title, instructions, difficulty, type, points, order_index')
    .order('order_index')

  if (module_id) query.eq('module_id', module_id)

  const { data, error } = await query

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
