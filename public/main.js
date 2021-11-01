const roomListPage = document.querySelector('.room-list-page')
const roomPage = document.querySelector('.room-page')
const gamePage = document.querySelector('.game-page')

const socket = io()
const canvas = document.getElementById("paint-canvas")
const context = canvas.getContext("2d")
const boundings = canvas.getBoundingClientRect()

// Specifications
let mouseX = 0
let mouseY = 0
context.strokeStyle = "black" // initial brush color
context.lineWidth = 1 // initial brush width
let isDrawing = false
let isCanDraw = false

// Handle Colors
const colorPicker = document.querySelector("#color-picker")

colorPicker.addEventListener("input", (event) => {
    context.strokeStyle = event.target.value || "black"
})

// Handle Brushes
const brushes = document.querySelector("#strokeLength")

brushes.addEventListener("input", (event) => {
    context.lineWidth = event.target.value || 1
})

const SetBrushesColor = (color, lineWidth) => {
    context.strokeStyle = color
    context.lineWidth = lineWidth
}

// Mouse Down Event
canvas.addEventListener("mousedown", (event) => {
    if (!isCanDraw) return;

    setMouseCoordinates(event)
    isDrawing = true

    // Start Drawing
    context.beginPath()
    context.moveTo(mouseX, mouseY)

    socket.emit("mousedown", {
        mouseX: mouseX,
        mouseY: mouseY,
        color: context.strokeStyle,
        lineWidth: context.lineWidth
    })
})

socket.on("mousedown", (data) => {
    isDrawing = true

    SetBrushesColor(data.color, data.lineWidth)
    
    context.beginPath()
    context.moveTo(data.mouseX, data.mouseY)
})

// Mouse Move Event
canvas.addEventListener("mousemove", (event) => {
    if (!isCanDraw) return;

    setMouseCoordinates(event)

    if (isDrawing) {
        context.lineTo(mouseX, mouseY)
        context.stroke()
    }

    socket.emit("mousemove", {
        mouseX: mouseX,
        mouseY: mouseY,
        color: context.strokeStyle,
        lineWidth: context.lineWidth
    })
})

socket.on("mousemove", (data) => {
    if (isDrawing) {
        SetBrushesColor(data.color, data.lineWidth)

        context.lineTo(data.mouseX, data.mouseY)
        context.stroke()
    }
})

// Mouse Up Event
canvas.addEventListener("mouseup", (event) => {
    if (!isCanDraw) return;

    setMouseCoordinates(event)
    isDrawing = false

    socket.emit('mouseup')
})

socket.on('mouseup', () => {
    isDrawing = false
})

// Handle Mouse Coordinates
const setMouseCoordinates = (event) => {
    mouseX = event.clientX - boundings.left
    mouseY = event.clientY - boundings.top
}

// Handle Clear Button
const clearButton = document.getElementById("clear")

clearButton.addEventListener("click", () => {
    if (!isCanDraw) return;

    context.clearRect(0, 0, canvas.width, canvas.height)
    socket.emit('clear')
})

socket.on('clear', () => {
    context.clearRect(0, 0, canvas.width, canvas.height)
})

// Toggle Can Draw

const ToggleCanDraw = (bool) => {
    const leftPanel = document.querySelector('.main-canvas .left-block')
    
    if (bool) {
        isCanDraw = false

        leftPanel.style.visibility = 'hidden'
    } else {
        isCanDraw = true

        leftPanel.style.visibility = 'unset'
    }
}

// join room
const playerNameInput = document.querySelector('.room-list-page #player-name')

socket.emit('update_room_list')

const roomListTableBody = document.querySelector('.room-list-page .room-list')

socket.on('update_room_list', (data) => {
    roomListTableBody.innerHTML = ''

    Object.keys(data.rooms).forEach((key) => {
        item = data.rooms[key]
        
        let list = document.createElement('tr')
        let name = document.createElement('td')
        let buttonTd = document.createElement('td')
        let button = document.createElement('button')
        button.innerHTML = 'Join'
        name.innerHTML = key

        button.addEventListener('click', () => {
            socket.emit('joinRoom', {
                room_name: key,
                player_name: playerNameInput.value
            })
        })

        buttonTd.appendChild(button)

        list.appendChild(name)
        list.appendChild(buttonTd)

        roomListTableBody.appendChild(list)
    })
})

const createRoomForm = document.querySelector('.room-list-page #create-room')

createRoomForm.addEventListener('submit', (event) => {
    event.preventDefault()

    if (createRoomForm.querySelector('input').value) {
        socket.emit('createRoom', {
            room_name: createRoomForm.querySelector('input').value,
            player_name: playerNameInput.value
        })
    }

    createRoomForm.querySelector('input').value = ''
})

socket.on('successfully_join_room', (data) => {
    console.log('received successfully_join_room')

    roomListPage.style.display = 'none'
    roomPage.style.display = 'block'

    socket.emit('update_room_player_list', {
        room_name: data.room_name
    })
})

socket.onAny((event, ...arg) => {
    console.log(event, arg)
})

const roomPlayerListTableBody = document.querySelector('.room-page .member-list tbody')
const roomStartButton = document.querySelector('.room-page #start-button')

socket.on('recive_room_player_list', (data) => {
    roomPlayerListTableBody.innerHTML = ''

    Object.keys(data.players).forEach((key) => {
        item = data.players[key]
        
        let list = document.createElement('tr')
        let name = document.createElement('td')
        name.innerHTML = item.name

        list.appendChild(name)

        roomPlayerListTableBody.appendChild(list)
    })

    if (data.room_owner == socket.id) {
        roomStartButton.style.display = 'block'
    }
})

socket.on('exit_room', () => {
    roomPage.style.display = 'none'
    roomListPage.style.display = 'block'

    socket.emit('update_room_list')
})