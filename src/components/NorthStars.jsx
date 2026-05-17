import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NorthStars({ userId }) {
  const [stars, setStars] = useState([])

  useEffect(() => {
    load()
  }, [userId])

  const load = async () => {
    const { data } = await supabase
      .from('north_stars')
      .select('*')
      .eq('user_id', userId)
      .order('position')
    setStars(data || [])
  }

  const add = async () => {
    const { data } = await supabase
      .from('north_stars')
      .insert({
        user_id: userId,
        business: 'New venture',
        goal: '',
        position: stars.length,
      })
      .select()
      .single()
    if (data) setStars([...stars, data])
  }

  const update = async (id, field, value) => {
    setStars(stars.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    await supabase.from('north_stars').update({ [field]: value }).eq('id', id)
  }

  const remove = async (id) => {
    setStars(stars.filter((s) => s.id !== id))
    await supabase.from('north_stars').delete().eq('id', id)
  }

  return (
    <div>
      {stars.map((s) => (
        <div key={s.id} className="northstar">
          <input
            className="northstar-business-input"
            value={s.business}
            onChange={(e) => setStars(stars.map((x) => x.id === s.id ? { ...x, business: e.target.value } : x))}
            onBlur={(e) => update(s.id, 'business', e.target.value)}
          />
          <textarea
            className="northstar-goal"
            rows={2}
            value={s.goal}
            onChange={(e) => setStars(stars.map((x) => x.id === s.id ? { ...x, goal: e.target.value } : x))}
            onBlur={(e) => update(s.id, 'goal', e.target.value)}
            placeholder="What does the next 90 days look like at its best?"
          />
          <button className="northstar-delete" onClick={() => remove(s.id)}>×</button>
        </div>
      ))}
      <button className="northstar-add" onClick={add}>+ Add a north star</button>
    </div>
  )
}
