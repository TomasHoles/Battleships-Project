document.addEventListener('DOMContentLoaded', () => { 
  const userGrid = document.querySelector('.grid-user') 
  const enemyGrid = document.querySelector('.grid-computer') 
  const displayGrid = document.querySelector('.grid-display') 
  const ships = document.querySelectorAll('.ship') 
  const destroyer = document.querySelector('.destroyer-container') 
  const submarine = document.querySelector('.submarine-container') 
  const cruiser = document.querySelector('.cruiser-container') 
  const battleship = document.querySelector('.battleship-container') 
  const carrier = document.querySelector('.carrier-container') 
  const startButton = document.querySelector('#start') 
  const rotateButton = document.querySelector('#rotate') 
  const turnDisplay = document.querySelector('#whose-go') 
  const infoDisplay = document.querySelector('#info') 
  const setupButtons = document.getElementById('setup-buttons') 
  
  const userSquares = [] // Pole pro čtverce uživatelské desky
  const enemySquares = [] // Pole pro čtverce nepřátelské desky
  
  let isHorizontal = true 
  let isGameOver = false 
  let currentPlayer = 'user' // Proměnná pro sledování aktuálního hráče
  const width = 10 
  let playerNum = 0 
  let ready = false 
  let enemyReady = false 
  let allShipsPlaced = false 
  let shotFired = -1 

  createBoard(userGrid, userSquares) // Vytvoření herní desky pro uživatele
  createBoard(enemyGrid, enemySquares) // Vytvoření herní desky pro nepřítele

  if (gameMode === 'multiPlayer') { // Kontrola, zda je režim hry multiplayer
    startMultiPlayer() // Zahájení multiplayerového režimu
  }

  function startMultiPlayer() { // Funkce pro inicializaci multiplayerového režimu
    const socket = io(); // Inicializace socket.io

    socket.on('player-number', num => { // Získání čísla hráče od serveru
      if (num === -1) { // Pokud je server plný
        infoDisplay.innerHTML = "Sorry, the server is full" // Zobrazení zprávy, že je server plný
      } else { // Pokud je číslo hráče platné
        playerNum = parseInt(num) // Přiřazení čísla hráče
        if(playerNum === 1) currentPlayer = "enemy" // Pokud je hráč číslo 1, nastavení aktuálního hráče na nepřítele
        console.log(playerNum) // Zobrazení čísla hráče v konzoli
        socket.emit('check-players') // Odeslání požadavku na kontrolu stavu hráčů
      }
    })

    socket.on('player-connection', num => { // Reakce na připojení nebo odpojení jiného hráče
      console.log(`Player number ${num} has connected or disconnected`) // Zobrazení zprávy o připojení nebo odpojení hráče
      playerConnectedOrDisconnected(num) // Aktualizace stavu připojení hráče
    })

    socket.on('enemy-ready', num => { // Reakce na připravenost nepřítele
      enemyReady = true // Nastavení stavu nepřítele na připraveno
      playerReady(num) // Aktualizace stavu připravenosti hráče
      if (ready) { // Pokud je hráč připraven
        playGameMulti(socket) // Zahájení hry
        setupButtons.style.display = 'none' // Skrytí tlačítek pro nastavení hry
      }
    })

    socket.on('check-players', players => { // Kontrola stavu ostatních hráčů
      players.forEach((p, i) => { // Pro každý stav hráče
        if(p.connected) playerConnectedOrDisconnected(i) // Aktualizace stavu připojení hráče
        if(p.ready) { // Pokud je hráč připraven
          playerReady(i) // Aktualizace stavu připravenosti hráče
          if(i !== playerReady) enemyReady = true // Pokud není hráč aktuálně připraven, nastavení nepřítele na připraveno
        }
      })
    })

    socket.on('timeout', () => { // Reakce na timeout
      infoDisplay.innerHTML = 'You have reached the 10 minute limit' // Zobrazení zprávy o dosažení časového limitu
    })

    startButton.addEventListener('click', () => { // Kliknutí na tlačítko start
      if(allShipsPlaced) playGameMulti(socket) // Pokud jsou všechny lodě umístěny, zahájení hry
      else infoDisplay.innerHTML = "Please place all ships" // Pokud nejsou všechny lodě umístěny, zobrazení zprávy
    })

    enemySquares.forEach(square => { // Nastavení event listenerů pro střelbu na nepřátelské čtverce
      square.addEventListener('click', () => { // Kliknutí na čtverec
        if(currentPlayer === 'user' && ready && enemyReady) { // Pokud je aktuální hráč uživatel, je připraven a nepřítel je připraven
          shotFired = square.dataset.id // Nastavení posledního vystřeleného čtverce
          socket.emit('fire', shotFired) // Odeslání střely přes socket
        }
      })
    })

    socket.on('fire', id => { // Reakce na přijatou střelbu
      enemyGo(id) // Provádí tah nepřítele
      const square = userSquares[id] // Výběr čtverce podle ID
      socket.emit('fire-reply', square.classList) // Odeslání odpovědi na střelu
      playGameMulti(socket) // Pokračování hry
    })

    socket.on('fire-reply', classList => { // Reakce na odpověď střelby
      revealSquare(classList) // Odhalení čtverce
      playGameMulti(socket) // Pokračování hry
    })

    function playerConnectedOrDisconnected(num) { // Funkce pro zpracování připojení nebo odpojení hráče
      let player = `.p${parseInt(num) + 1}` // Výběr hráče podle čísla
      document.querySelector(`${player} .connected`).classList.toggle('active') // Přepnutí třídy 'active' pro zobrazení připojení nebo odpojení
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold' // Nastavení tučného písma pro aktuálního hráče
    }
  }

  function createBoard(grid, squares) { // Funkce pro vytvoření herní desky
    for (let i = 0; i < width * width; i++) { // Pro každý čtverec na desce
      const square = document.createElement('div') // Vytvoření divu pro čtverec
      square.dataset.id = i // Nastavení data atributu ID
      grid.appendChild(square) // Přidání čtverce do herní desky
      squares.push(square) // Přidání čtverce do pole čtverců
    }
  }

  function rotate() { // Funkce pro otočení lodí
    if (isHorizontal) { // Pokud jsou lodě horizontální
      destroyer.classList.toggle('destroyer-container-vertical') // Přepnutí na vertikální torpédoborec
      submarine.classList.toggle('submarine-container-vertical') 
      cruiser.classList.toggle('cruiser-container-vertical') 
      battleship.classList.toggle('battleship-container-vertical') 
      carrier.classList.toggle('carrier-container-vertical') 
      isHorizontal = false // Nastavení stavu na vertikální
    } else { // Pokud jsou lodě vertikální
      destroyer.classList.toggle('destroyer-container-vertical') // Přepnutí na horizontální torpédoborec
      submarine.classList.toggle('submarine-container-vertical') 
      cruiser.classList.toggle('cruiser-container-vertical') 
      battleship.classList.toggle('battleship-container-vertical') 
      carrier.classList.toggle('carrier-container-vertical') 
      isHorizontal = true // Nastavení stavu na horizontální
    }
  }

  rotateButton.addEventListener('click', rotate)

  // Pohyb lodí prvního hráče
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  // Událost pro výběr lodě
  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    
  }))

   // Funkce pro zahájení přetahování
  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
  
  }

  // Zamezení výchozího chování při přetahování
  function dragOver(e) {
    e.preventDefault()
  }

  // Zamezení výchozího chování při vstupu do oblasti přetahování

  function dragEnter(e) {
    e.preventDefault()
  }

  // Řešení opuštění oblasti přetahování (volitelné)
  function dragLeave() {
   
  }

   // Řešení události upuštění lodi
  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id // Získání ID posledního elementu lodě
    let shipClass = shipNameWithLastId.slice(0, -2) // Získání třídy lodě odstraněním posledních dvou znaků z ID
    
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1)) // Získání posledního indexu lodě z ID
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
 
     // Pole zakázaných pozic pro vertikální umístění
    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93] // Pole zakázaných pozic pro horizontální umístění
    const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60] // Pole zakázaných pozic pro vertikální umístění
    
    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex
    
    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {  // Nastavení třídy pro horizontální umístění
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
    //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
    //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip) // Odebrání lodě z displeje
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true // Kontrola, zda byly všechny lodě umístěny
  }

  // Ukončení přetahování (volitelné)
  function dragEnd() {
  }

  // Herní logika pro multiplayer
  function playGameMulti(socket) {
    setupButtons.style.display = 'none' // Skrytí tlačítek pro nastavení hry
    if(isGameOver) return // Pokud hra skončila, návrat
    if(!ready) { // Pokud hráč není připraven
      socket.emit('player-ready') // Odeslání zprávy o připravenosti hráče
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if(currentPlayer === 'user') { // Pokud je aktuální hráč uživatel
        turnDisplay.innerHTML = 'Your Turn'  // Zobrazení, že je tah uživatele
      }
      if(currentPlayer === 'enemy') { // Pokud je aktuální hráč nepřítel
        turnDisplay.innerHTML = "Enemy's Turn" // Zobrazení, že je tah nepřítele
      }
    }
  }

 // Aktualizace připravenosti hráče
  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

   // Počáteční počty zásahů lodí
  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  // Funkce pro odhalení čtverce
  function revealSquare(classList) {
    const enemySquare = enemyGrid.querySelector(`div[data-id='${shotFired}']`) // Výběr nepřátelského čtverce podle ID
    const obj = Object.values(classList) // Konverze třídy čtverce na pole
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) { // Pokud čtverec není již zasažen, hráč je uživatel a hra neskončila
      if (obj.includes('destroyer')) destroyerCount++  // Přidání třídy 'boom' pro zásah
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
    
  }

   // Počáteční počty zásahů protivníka
  let enemyDestroyerCount = 0
  let enemySubmarineCount = 0
  let enemyCruiserCount = 0
  let enemyBattleshipCount = 0
  let enemyCarrierCount = 0


   // Funkce pro tah nepřítele
  function enemyGo(square) {
    
    if (!userSquares[square].classList.contains('boom')) { // Pokud čtverec není již zasažen
      const hit = userSquares[square].classList.contains('taken') // Kontrola, zda čtverec obsahuje třídu 'taken'
      userSquares[square].classList.add(hit ? 'boom' : 'miss') // Přidání třídy 'boom' pro zásah nebo 'miss' pro minutí
      if (userSquares[square].classList.contains('destroyer')) enemyDestroyerCount++
      if (userSquares[square].classList.contains('submarine')) enemySubmarineCount++
      if (userSquares[square].classList.contains('cruiser')) enemyCruiserCount++
      if (userSquares[square].classList.contains('battleship')) enemyBattleshipCount++
      if (userSquares[square].classList.contains('carrier')) enemyCarrierCount++
      checkForWins() /// Kontrola, zda někdo nevyhrál
    } 
    currentPlayer = 'user' // Nastavení aktuálního hráče na uživatele
    turnDisplay.innerHTML = 'Your Turn' // Zobrazení, že je tah uživatele
  }

   // Funkce pro kontrolu vítězství
  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'enemy'
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier`
      carrierCount = 10
    }
    if (enemyDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy} sunk your destroyer`
      enemyDestroyerCount = 10
    }
    if (enemySubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your submarine`
      enemySubmarineCount = 10
    }
    if (enemyCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your cruiser`
      enemyCruiserCount = 10
    }
    if (enemyBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy} sunk your battleship`
      enemyBattleshipCount = 10
    }
    if (enemyCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy} sunk your carrier`
      enemyCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) { // Pokud jsou všechny nepřátelské lodě zničeny
      infoDisplay.innerHTML = "YOU WIN"  // Zobrazení zprávy o výhře
      gameOver()
    }
    if ((enemyDestroyerCount + enemySubmarineCount + enemyCruiserCount + enemyBattleshipCount + enemyCarrierCount) === 50) { // Pokud jsou všechny moje lodě zničeny
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS` // Zobrazení zprávy o prohře
      gameOver()
    }
  }

    // Funkce pro ukončení hry
  function gameOver() {
    isGameOver = true // Nastavení stavu hry na skončenou
  }
})
