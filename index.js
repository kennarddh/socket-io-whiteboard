const express = require('express')
const { disconnect, send } = require('process')
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

const GenerateRandomString = (length) => {
    let result = ''
    const characters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) {
        result += characters[(Math.floor(Math.random() * characters.length))]
    }

    return result;
}

io.on('connection', (socket) => {
    users[socket.id] = {
        room: '',
        name: '',
        score: 0
    }

    socket.on('disconnect', () => {
        if (users[socket.id].room) {
            io.to(users[socket.id].room).emit('exit_room')
            
            if (rooms[users[socket.id].room].owner == socket.id) {
                
                Object.keys(users).forEach((key) => {
                    value = users[key]

                    io.in(users[socket.id].room).socketsLeave(users[socket.id].room)
                    
                    if (value.room == users[socket.id].room) {
                        users[key].room = ''
                    }
                }) 
                
                delete rooms[users[socket.id].room]

                return
            }

            const sendData = {}
    
            Object.keys(users).forEach((key) => {
                value = users[key]
                if (key !== socket.id) {
                    if (value.room == users[socket.id].room) {
                        sendData[key] = value
                    }
                }
            })
            
            if (Object.keys(sendData).length <= 0) {
                delete rooms[users[socket.id].room]

                return
            }

            io.to(users[socket.id].room).emit('recive_room_player_list', {
                players: sendData,
                room_owner: rooms[users[socket.id].room].owner
            })
        }

        delete users[socket.id]
    })

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

    // room
    socket.on('update_room_list', () => {
        const sendRooms = {}

        Object.keys(rooms).forEach((item) => {
            if (rooms[item].status != 'close') {
                sendRooms[item] = rooms[item] 
            }
        })

        socket.emit('update_room_list', {
            rooms: sendRooms
        })
    })

    socket.on('joinRoom', (data) => {
        if (!users[socket.id].rooms) {
            if (users[socket.id].rooms != socket.id) {
                socket.leave(users[socket.id].rooms)
            }
        }

        socket.join(data.room_name)
        
        users[socket.id].room = data.room_name

        if (data.player_name) {
            users[socket.id].name = data.player_name
        } else {
            users[socket.id].name = GenerateRandomString(10)
        }

        console.log('emit successfully_join_room')

        io.to(socket.id).emit('successfully_join_room', {
            room_name: data.room_name,
            room_owner: rooms[data.room_name].owner
        })
    })

    socket.on('createRoom', (data) => {
        if (!users[socket.id].rooms) {
            if (users[socket.id].rooms != socket.id) {
                socket.leave(users[socket.id].rooms)
            }
        }

        users[socket.id].room = data.room_name
        
        if (data.player_name) {
            users[socket.id].name = data.player_name
        } else {
            users[socket.id].name = GenerateRandomString(10)
        }

        socket.join(data.room_name)

        rooms[data.room_name] = {
            status: 'open',
            owner: socket.id
        }

        io.emit('update_room_list', {
            rooms: rooms
        })
        
        console.log('emit successfully_join_room')

        io.to(socket.id).emit('successfully_join_room', {
            room_name: data.room_name,
            room_owner: rooms[data.room_name].owner
        })
    })

    // room page
    socket.on('update_room_player_list', (data) => {
        const sendData = {}

        Object.keys(users).forEach((key) => {
            value = users[key]
            if (value.room == data.room_name) {
                sendData[key] = value
            }
        })

        io.to(data.room_name).emit('recive_room_player_list', {
            players: sendData,
            room_owner: rooms[data.room_name].owner
        })
    })
    socket.onAny((event, ...arg) => {
        console.log(event, arg)
    })
})
