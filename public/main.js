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