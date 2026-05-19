import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard({ user, setGameId }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [waitingGames, setWaitingGames] = useState([])
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    // FONDAMENTALE: Se Supabase sta ancora caricando la sessione dell'utente, 
    // non fare nulla e aspetta il prossimo ciclo.
    if (!user) return 

    checkActiveSession()
    fetchLeaderboard()
    fetchWaitingGames()

    const gamesSub = supabase.channel('public:games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchWaitingGames)
      .subscribe()

    return () => { supabase.removeChannel(gamesSub) }
  }, [user]) // <--- AGGIUNTO 'user' QUI: il controllo si attiva solo quando l'utente è pronto

  const checkActiveSession = async () => {
    if (!user) return

    const { data } = await supabase.from('games')
      .select('id')
      .in('status', ['waiting', 'playing']) 
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .maybeSingle()
    
    if (data) {
      setGameId(data.id) // Ti forza a rientrare nella stanza di gioco
    } else {
      setLoadingSession(false) // Mostra la dashboard solo se non sei in nessuna partita
    }
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('profiles').select('*').order('wins', { ascending: false }).limit(10)
    if (data) setLeaderboard(data)
  }

  const fetchWaitingGames = async () => {
    const { data } = await supabase.from('games').select('*').eq('status', 'waiting')
    if (data) setWaitingGames(data)
  }

  const createGame = async () => {
    const { data, error } = await supabase.from('games').insert([{ 
      player1_id: user.id, 
      turn_id: user.id,
      status: 'waiting',
      board: ['', '', '', '', '', '', '', '', ''] 
    }]).select().single()

    if (error) console.error(error)
    else setGameId(data.id)
  }

  const joinGame = async (id) => {
    const { error } = await supabase.from('games')
      .update({ player2_id: user.id, status: 'playing' })
      .eq('id', id)
      
    if (!error) setGameId(id)
  }

  if (loadingSession) return <div style={{ textAlign: 'center', marginTop: 50 }}>Verifica sessione di gioco...</div>

  return (
    <div>
      <div className="card">
        <h2>Benvenuto, {user.email.split('@')[0]}</h2>
        <button onClick={() => supabase.auth.signOut()} style={{background: '#ff4a4a'}}>Logout</button>
      </div>

      <div className="card">
        <h3>Partite in attesa</h3>
        <button onClick={createGame}>Crea Nuova Partita</button>
        <div style={{ marginTop: 20 }}>
          {waitingGames.filter(g => g.player1_id !== user.id).map(g => (
            <div key={g.id} className="list-item">
              <span>Partita disponibile</span>
              <button onClick={() => joinGame(g.id)}>Entra</button>
            </div>
          ))}
          {waitingGames.length === 0 && <p>Nessuna partita in attesa.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Classifica (Top 10)</h3>
        {leaderboard.map((p, index) => (
          <div key={p.id} className="list-item">
            <span>{index + 1}. {p.email?.split('@')[0]}</span>
            <span>Vittorie: {p.wins}</span>
          </div>
        ))}
      </div>
    </div>
  )
}