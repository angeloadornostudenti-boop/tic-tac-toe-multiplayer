import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleAuth = async (isLogin) => {
    setLoading(true)
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    
    if (error) alert(error.error_description || error.message)
    setLoading(false)
  }

  return (
    <div className="card">
      <h2>Login o Registrazione</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div>
        <button onClick={() => handleAuth(true)} disabled={loading}>Login</button>
        <button onClick={() => handleAuth(false)} disabled={loading}>Registrati</button>
      </div>
    </div>
  )
}