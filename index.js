const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 3000


let users = {}
let rooms = {}

const questions = [
    'water',
    'ballon',
    'computer',
    'camera',
    'box',
    'fan',
    'clock',
    'glass'
]

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
            if (rooms[users[socket.id].room].status !== 'open') {
                const sendData = {}
                const users_temp = Object.assign({}, users);
                const socket_room_before_delete = users_temp[socket.id].room

                delete users_temp[socket.id]

                console.log('users_temp')
                console.log(users_temp)
                console.log(socket.id)

                Object.keys(users_temp).forEach((key) => {
                    value = users_temp[key]
                    if (value.room == socket_room_before_delete) {
                        sendData[key] = value
                    }
                })
        
                io.to(users[socket.id].room).emit('receive_player_game_list', {
                    players: sendData
                })
            }
            
            if (rooms[users[socket.id].room].owner == socket.id) {
                io.to(users[socket.id].room).emit('exit_room')
                Object.keys(users).forEach((key) => {
                    value = users[key]

                    io.in(users[socket.id].room).socketsLeave(users[socket.id].room)
                    
                    if (value.room == users[socket.id].room) {
                        users[key].room = ''
                    }
                }) 
                
                delete rooms[users[socket.id].room]
                delete users[socket.id]

                return
            }

            const sendData2 = {}
    
            Object.keys(users).forEach((key) => {
                value = users[key]
                if (key !== socket.id) {
                    if (value.room == users[socket.id].room) {
                        sendData2[key] = value
                    }
                }
            })
            
            if (Object.keys(sendData2).length <= 0) {
                delete rooms[users[socket.id].room]
                delete users[socket.id]

                return
            }

            if (rooms[users[socket.id].room].status != 'open') {
                io.to(users[socket.id].room).emit('receive_room_player_list', {
                    players: sendData2,
                    room_owner: rooms[users[socket.id].room].owner
                })
            }
        }

        delete users[socket.id]
    })

    // draw
    socket.on('clear', () => {
        io.to(users[socket.id].room).emit('clear')
    })

    socket.on('drawing', (data) => {
        socket.to(users[socket.id].room).emit('drawing', data)
    })

    socket.on('mousedown', (data) => {
        io.to(users[socket.id].room).emit('mousedown', data)
    })

    socket.on('mousemove', (data) => {
        io.to(users[socket.id].room).emit('mousemove', data)
    })

    socket.on('mouseup', () => {
        io.to(users[socket.id].room).emit('mouseup')
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
        if (!data.room_name in rooms) return
        if (rooms[data.room_name].status != 'open') return

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

        io.to(socket.id).emit('successfully_join_room', {
            room_name: data.room_name,
            room_owner: rooms[data.room_name].owner
        })
    })

    socket.on('createRoom', (data) => {
        if (data.room_name in rooms) return

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
            owner: socket.id,
            now_turn: '',
            now_question: ''
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

        io.to(data.room_name).emit('receive_room_player_list', {
            players: sendData,
            room_owner: rooms[data.room_name].owner
        })
    })

    socket.on('start_game', () => {
        let usersLength = 0
    
        Object.keys(users).forEach((key) => {
            value = users[key]
            if (value.room == users[socket.id].room) {
                usersLength++
            }
        })

        if (socket.id == rooms[users[socket.id].room].owner) {
            if (usersLength >= 2) {
                rooms[users[socket.id].room].status = 'start'
                io.to(users[socket.id].room).emit('game_successfully_started')
            }
        }
    })

    // game page
    socket.on('get_player_game_list', () => {
        if (socket.id === rooms[users[socket.id].room].owner) {
            const sendData = {}
    
            Object.keys(users).forEach((key) => {
                value = users[key]
                if (value.room == users[socket.id].room) {
                    sendData[key] = value
                }
            })
    
            io.to(users[socket.id].room).emit('receive_player_game_list', {
                players: sendData
            })
        }
    })

    socket.on('game_ready', () => {
        console.log(users)
        let turn_before = ''
        let timer = 0
        if (socket.id === rooms[users[socket.id].room].owner) {
            const turnInterval = setInterval(() => {
                try {
                    if (!socket.id in users) return
    
                    console.log('interval', timer)
                    io.to(users[socket.id].room).emit('update_time', {
                        now_drawing: turn_before,
                        time: timer
                    })
    
                    timer--
    
                    if (timer <= 0) {
                        timer = 20
                        
                        console.log('timer <= 0', turn_before, timer)
    
                        io.to(users[socket.id].room).emit('clear')
                        let usersList = []
                        
                        if (turn_before) {
                            io.to(users[socket.id].room).emit('stop_draw', {
                                now_drawing: turn_before
                            })
                            
                            usersList = Object.keys(users).filter((item) => item !== turn_before)
                        } else {
                            usersList = Object.keys(users)
                        }
                        
                        turn_before = usersList[Math.floor(Math.random() * usersList.length)]
                        
                        const now_question = questions[Math.floor(Math.random() * questions.length)]
                        
                        rooms[users[socket.id].room].now_question = now_question
                        rooms[users[socket.id].room].now_drawing = turn_before
                        
                        io.to(users[socket.id].room).emit('start_draw', {
                            now_drawing: turn_before,
                            now_drawing_name: users[turn_before].name,
                            now_question: now_question
                        })
                    }
                } catch (error) {
                    clearInterval(turnInterval)
                }
            }, 1000)
        }
    })

    socket.on('send_answer', (data) => {
        if (rooms[users[socket.id].room].now_drawing != socket.id) {
            if (rooms[users[socket.id].room].now_question === data.answer) {
                users[socket.id].score++

                const sendData = {}
    
                Object.keys(users).forEach((key) => {
                    value = users[key]
                    if (value.room == users[socket.id].room) {
                        sendData[key] = value
                    }
                })
        
                io.to(users[socket.id].room).emit('receive_player_game_list', {
                    players: sendData
                })
            }
        }
    })
})
