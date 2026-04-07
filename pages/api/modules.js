import { createAdminClient } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('order_index')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
