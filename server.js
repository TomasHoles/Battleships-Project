const express = require('express')          // Importuje Express framework
const path = require('path')                // Importuje knihovnu path pro práci s cestami k souborům
const http = require('http')                // Importuje vestavěný modul http pro vytvoření HTTP serveru
const PORT = process.env.PORT || 3000       // Definuje port, na kterém server poběží (defaultně 3000)
const socketio = require('socket.io')       // Importuje Socket.io pro real-time komunikaci
const app = express()                       // Vytvoří instanci aplikace Express
const server = http.createServer(app)       // Vytvoří HTTP server pomocí Express aplikace
const io = socketio(server)                 // Inicializuje Socket.io server na tomto HTTP serveru

// Nastavení statické složky
app.use(express.static(path.join(__dirname, "public"))) // Nastaví složku "public" jako statickou (slouží k servírování statických souborů)

// Spuštění serveru
server.listen(PORT, () => console.log(`Server běží na portu ${PORT}`)) // Spustí server na definovaném portu a vypíše zprávu do konzole

// Pole pro ukládání připojení hráčů (maximálně 2 hráči)
const connections = [null, null]

// Zpracování požadavku na připojení socketu od webového klienta
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

  connections[playerIndex] = false // Označí hráče jako nepřipraveného

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
    connections[playerIndex] = true // Označí hráče jako připraveného
  })

  // Kontrola připojení hráčů
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players) // Odesílá seznam hráčů zpět klientovi
  })

  // Na přijatou střelbu
  socket.on('fire', id => {
    socket.broadcast.emit('fire', id) // Předá informaci o střelbě všem ostatním klientům
  })

  // Na odpověď střelby
  socket.on('fire-reply', square => {
    socket.broadcast.emit('fire-reply', square) // Předá informaci o výsledku střelby všem ostatním klientům
  })

  // Timeout připojení
  setTimeout(() => {
    connections[playerIndex] = null
    socket.emit('timeout') // Informuje hráče o vypršení času
    socket.disconnect()    // Odpojí hráče po vypršení času
  }, 600000) // 10 minutový limit na hráče
})
