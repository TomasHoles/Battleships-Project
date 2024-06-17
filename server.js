const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Nastavení statické složky
app.use(express.static(path.join(__dirname, "public")))

// Spuštění serveru
server.listen(PORT, () => console.log(`Server běží na portu ${PORT}`))

// Zpracování požadavku na připojení socketu od webového klienta
const connections = [null, null]

io.on('connection', socket => {

  // Najít dostupné číslo hráče
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      playerIndex = i
      break
    }
  }

  // Řekněte připojujícímu se klientovi, jaké je jeho číslo hráče
  socket.emit('player-number', playerIndex)

  console.log(`Hráč ${playerIndex} se připojil`)

  // Ignorovat hráče 3
  if (playerIndex === -1) return

  connections[playerIndex] = false

  // Řekněte všem, jaké číslo hráče se právě připojilo
  socket.broadcast.emit('player-connection', playerIndex)

  // Zpracování odpojení
  socket.on('disconnect', () => {
    console.log(`Hráč ${playerIndex} se odpojil`)
    connections[playerIndex] = null
    // Řekněte všem, jaké číslo hráče se právě odpojilo
    socket.broadcast.emit('player-connection', playerIndex)
  })

  // Na připravenost
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', playerIndex)
    connections[playerIndex] = true
  })

  // Kontrola připojení hráčů
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // Na přijatou střelbu
  socket.on('fire', id => {
    socket.broadcast.emit('fire', id)
  })

  // Na odpověď střelby
  socket.on('fire-reply', square => {
    socket.broadcast.emit('fire-reply', square)
  })

  // Timeout připojení
  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout')
    socket.disconnect()
  }, 600000) // 10 minutový limit na hráče
})
