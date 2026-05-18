import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import GameRoom from './components/GameRoom'

function App() {
  const [session, setSession] = useState(null)
  const [gameId, setGameId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <div className="container"><Auth /></div>

  return (
    <div className="container">
      {!gameId ? (
        <Dashboard user={session.user} setGameId={setGameId} />
      ) : (
        <GameRoom user={session.user} gameId={gameId} setGameId={setGameId} />
      )}
    </div>
  )
}

export default App