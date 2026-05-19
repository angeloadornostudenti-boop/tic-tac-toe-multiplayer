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
    if (!game || !game.board || game.status !== 'playing' || game.turn_id !== user.id || game.board[index] !== '') return

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

  // GESTIONE USCITA E RESA A TAVOLINO
  const handleLeaveGame = async () => {
    if (!game) return

    // Scenario 1: La partita è già finita, torna indietro normalmente
    if (game.status === 'finished') {
      setGameId(null)
      return
    }

    // Scenario 2: Sei da solo in attesa, annulla la partita
    if (game.status === 'waiting') {
      const confirmLeave = window.confirm("Vuoi annullare la ricerca e tornare alla dashboard?")
      if (!confirmLeave) return

      await supabase.from('games').update({ status: 'finished' }).eq('id', gameId)
      setGameId(null)
      return
    }

    // Scenario 3: La partita è in corso, l'utente si arrende
    if (game.status === 'playing') {
      const confirmSurrender = window.confirm("Attenzione! Se torni alla dashboard adesso ti arrenderai e la vittoria andrà al tuo avversario. Vuoi continuare?")
      if (!confirmSurrender) return

      // Determina l'ID dell'avversario
      const opponentId = game.player1_id === user.id ? game.player2_id : game.player1_id

      // Chiudi la partita assegnando il vincitore
      await supabase.from('games').update({
        status: 'finished',
        winner_id: opponentId
      }).eq('id', gameId)

      // Assegna +1 vittoria all'avversario nel suo profilo
      if (opponentId) {
        const { data: profile } = await supabase.from('profiles').select('wins').eq('id', opponentId).single()
        if (profile) {
          await supabase.from('profiles').update({ wins: profile.wins + 1 }).eq('id', opponentId)
        }
      }

      setGameId(null)
    }
  }

  if (!game || !game.board) return <div style={{ textAlign: 'center', marginTop: 50 }}>Sincronizzazione partita...</div>

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

      <button onClick={handleLeaveGame} style={{ marginTop: 15, background: game.status !== 'finished' ? '#e11d48' : '#4b5563' }}>
        {game.status === 'finished' ? 'Torna alla Dashboard' : 'Arrenditi ed Esci'}
      </button>
    </div>
  )
}