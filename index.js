const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 3000


const users = {}
const rooms = {}

server.listen(port, () => {
    console.log('Server listening at port %d', port)
})

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    // draw
    socket.on('clear', () => {
        io.sockets.emit('clear')
    })

    socket.on('mousedown', (data) => {
        io.sockets.emit('mousedown', data)
    })

    socket.on('mousemove', (data) => {
        io.sockets.emit('mousemove', data)
    })

    socket.on('mouseup', () => {
        io.sockets.emit('mouseup')
    })

    // join room
    
})
