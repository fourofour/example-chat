/*
* user
*   {
*     username: username (String),
*     id: id (String),
*     connection: Object (Object)
*   }
* */

/*
* room
*   {
*     key: key (String)
*   }
*
* */

/*
* message
*  {
*     type: USER_MESSAGE | SERVER_MESSAGE | SYSTEM_INIT | SERVER_FORCE_MESSAGE (String),
*     id: userId (String),
*     username: username (String),
*     message: message (String),
*     room: key (String),
*     target: {
*       id: userId (String),
*       username: username (String)
*     },
*     data: {
*       users: clients (Array),
*       rooms: roomsList (Array),
*       client: client (Object)
*     }
*  }
*
* */

var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http, {
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false
})

let clients = []
let rooms = new Map([
  ['Global', 'room/global'],
  ['Server', 'room/server']
])

let createRoom = function (RoomKey) {
  rooms.set(RoomKey, 'room/' + RoomKey.toLowerCase())
}

let getClientInfo = function (SocketId) {
  let item

  clients.forEach(function (value, index, array) {
    if (value.id === SocketId) {
      item = {
        client: value,
        index
      }
    }
  })

  return item
}

rooms.forEach(function (value, key, map) {
  createRoom(key)
})

io.on('connection', function(socket) {
  clients.push({
    id: socket.id
  })

  console.log('a user connected')

  socket.on('NewUser', function(user) {
    let { client, index } = getClientInfo(socket.id)

    clients[index].username = user.username

    let roomsList = []

    rooms.forEach(function (value, key, map) {
      roomsList.push({ key })
    })

    socket.emit('AddMessage', {
      type: 'SYSTEM_INIT',
      data: {
        users: clients,
        rooms: roomsList,
        client: {
          id: client.id,
          username: client.username
        }
      }
    })

    io.emit('NewUser', client)
  })

  socket.on('JoinRoom', function(room) {
    let { client } = getClientInfo(socket.id)

    io.emit(rooms.get(room.key), {
      type: 'SERVER_MESSAGE',
      message: client.username + ' has joined the room',
      room: {
        key: room.key
      }
    })
  })

  socket.on('LeaveRoom', function(room) {
    let { client } = getClientInfo(socket.id)

    io.emit(rooms.get(room.key), {
      type: 'SERVER_MESSAGE',
      message: client.username + ' has left the room',
      room: {
        key: room.key
      }
    })
  })

  socket.on('CreateRoom', function(room) {
    let exist = false

    rooms.forEach(function (value, index, array) {
      if (value.name === room.name) {
        exist = true
      }
    })

    if (!exist) {
      createRoom(room.key)
    }
  })

  socket.on('NewMessage', function(message) {
    let { client } = getClientInfo(socket.id)

    message.username = client.username
    message.id = client.id

    if (message.target && message.target.id === client.id) {
      message.target.username = client.username
    }

    if (message.room) {
      io.emit(rooms.get(message.room.key), message)
    } else if (message.target) {
      if (message.target.id !== message.id) {
        socket.to(message.target.id).emit('AddMessage', message)
      }

      socket.emit('AddMessage', message)
    } else {
      io.emit('AddMessage', message)
    }
  })

  socket.on('disconnect', function() {
    let { client, index } = getClientInfo(socket.id)

    console.log(client.username + ' disconnected')

    io.emit('RemoveUser', client)

    clients.splice(index, 1)
  })
})

http.listen(3001, function() {
  console.log('listening on *:3001')
})