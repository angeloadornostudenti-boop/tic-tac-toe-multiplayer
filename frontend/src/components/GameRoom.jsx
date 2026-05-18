import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function GameRoom({ user, gameId, setGameId }) {
  const [game, setGame] = useState(null)

  useEffect(() => {
    fetchGame()

    const sub = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        setGame(payload.new)
      }).subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [gameId])

  const fetchGame = async () => {
    const { data } = await supabase.from('games').select('*').eq('id', gameId).single()
    setGame(data)
  }

  const checkWinner = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Orizzontali
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticali
      [0, 4, 8], [2, 4, 6]             // Diagonali
    ]
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i]
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] // Restituisce 'X' o 'O'
      }
    }
    return null
  }

  const handleCellClick = async (index) => {
    if (!game || game.status !== 'playing' || game.turn_id !== user.id || game.board[index] !== '') return

    const mySymbol = game.player1_id === user.id ? 'X' : 'O'
    const newBoard = [...game.board]
    newBoard[index] = mySymbol

    const winnerSymbol = checkWinner(newBoard)
    const isDraw = !newBoard.includes('') && !winnerSymbol
    
    let updates = { board: newBoard }

    if (winnerSymbol) {
      updates.status = 'finished'
      updates.winner_id = user.id
      // Aggiorna vittorie utente
      const { data: profile } = await supabase.from('profiles').select('wins').eq('id', user.id).single()
      await supabase.from('profiles').update({ wins: profile.wins + 1 }).eq('id', user.id)
    } else if (isDraw) {
      updates.status = 'finished'
    } else {
      updates.turn_id = game.player1_id === user.id ? game.player2_id : game.player1_id
    }

    await supabase.from('games').update(updates).eq('id', gameId)
  }

  if (!game) return <div>Caricamento...</div>

  const isPlayer1 = game.player1_id === user.id
  const mySymbol = isPlayer1 ? 'X' : 'O'

  return (
    <div className="card">
      <h2>Partita in Corso</h2>
      <p>Il tuo simbolo: <strong>{mySymbol}</strong></p>
      
      {game.status === 'waiting' && <p>In attesa di un avversario...</p>}
      
      {game.status === 'playing' && (
        <p style={{ color: game.turn_id === user.id ? '#4ade80' : '#f87171' }}>
          {game.turn_id === user.id ? 'È IL TUO TURNO' : "TURNO DELL'AVVERSARIO"}
        </p>
      )}

      {game.status === 'finished' && (
        <div style={{ padding: 10, background: '#10b981', color: 'white', borderRadius: 5, marginBottom: 15 }}>
          {game.winner_id === user.id ? 'HAI VINTO!' : (game.winner_id ? 'HAI PERSO!' : 'PAREGGIO!')}
        </div>
      )}

      <div className="board">
        {game.board.map((cell, idx) => (
          <div key={idx} className="cell" onClick={() => handleCellClick(idx)}>
            {cell}
          </div>
        ))}
      </div>

      <button onClick={() => setGameId(null)}>Torna alla Dashboard</button>
    </div>
  )
}