var express = require('express');
// var routes = require('./routes');
// var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
var PORT = 3000
var SERVER_ADDRESS = '0.0.0.0'
app.set('port', process.env.PORT || PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(app.get('port'), SERVER_ADDRESS);

var usernames = [];

var room_user_map = {};

io.sockets.on('connection', function (socket) {
    socket.on('adduser', function(username){
        var flag = 0;
        for(var i=0; i<usernames.length; i++){
            if(usernames[i] == username){
                flag = 1;
                break;
            }
        }
        if(username == 'SERVER') flag = 1;
        if(flag){
            socket.emit('message', "User exists already.", 'danger');
        }
        else{
            socket.username = username;
            usernames.push(username);
            socket.emit('message', "User created.", 'success');
            socket.emit('addeduser');
            socket.emit('updateroomlist', room_user_map);
        }
    });

    socket.on('createroom', function(roomname){
        // check if already there
        var flag = 0;
        for(var room in room_user_map){
            if(room == roomname){
                flag = 1;
                break;
            }
        }
        if(flag){
            socket.emit('message', "Room exists already. Pick another name", 'danger');
        }
        else{
            // create new
            room_user_map[roomname] = [socket.username];
            socket.join(roomname);
            socket.emit('message', "Room created.", 'success');
            socket.emit('addroom', roomname);
            socket.emit('joinedroom', roomname);
            io.sockets.in(roomname).emit('updatechat', roomname, 'SERVER', socket.username + ' has connected to the room');
            io.sockets.in(roomname).emit('updatemembers', roomname, room_user_map);
            io.sockets.emit('updateroomlist', room_user_map);
        }
    });

    function leaveRoomProcess(roomname){
        socket.leave(roomname);
        var index = room_user_map[roomname].indexOf(socket.username);
        room_user_map[roomname].splice(index, 1);
        // if no users left, room shuts down automatically
        socket.emit('removeroom', roomname);
        if(room_user_map[roomname].length == 0){
            delete room_user_map[roomname];
            socket.emit('leftroom', room_user_map);
        }
        else{
            socket.emit('leftroom', room_user_map);
            io.sockets.in(roomname).emit('updatechat', roomname, 'SERVER',  socket.username + ' has left the room');
            io.sockets.in(roomname).emit('updatemembers', roomname, room_user_map);
        }
        io.sockets.emit('updateroomlist', room_user_map);
    }

    socket.on('joinroom', function(roomname){
        // if already joined, tell the user of it
        debugger;
        var room_users = room_user_map[roomname];
        var flag = 0;
        for(var i=0; i<room_users.length; i++){
            if(room_users[i] == socket.username){
                flag = 1;
                break;
            }
        }

        if(flag){
            socket.emit('message', "Already connected to " + roomname + ".", 'warning');
        }
        else{
            // join the user to the room
            room_user_map[roomname].push(socket.username);
            socket.join(roomname);
            socket.emit('message', "Joined successfully.", 'success'); 
            socket.emit('addroom', roomname);
            socket.emit('joinedroom', roomname);
            io.sockets.in(roomname).emit('updatechat', roomname, 'SERVER',  socket.username + ' has connected to the room');
            io.sockets.in(roomname).emit('updatemembers', roomname, room_user_map);
            io.sockets.emit('updateroomlist', room_user_map);
        }
    });

    socket.on('sendchat', function (data, roomname) {
        io.sockets.in(roomname).emit('updatechat', roomname, socket.username, data);
    });

    socket.on('leaveroom', function(roomname){
        socket.leave(roomname);
        var index = room_user_map[roomname].indexOf(socket.username);
        room_user_map[roomname].splice(index, 1);
        // if no users left, room shuts down automatically
        socket.emit('removeroom', roomname);
        if(room_user_map[roomname].length == 0){
            delete room_user_map[roomname];
            socket.emit('leftroom', room_user_map);
        }
        else{
            socket.emit('leftroom', room_user_map);
            io.sockets.in(roomname).emit('updatechat', roomname, 'SERVER',  socket.username + ' has left the room');
            io.sockets.in(roomname).emit('updatemembers', roomname, room_user_map);
        }
        io.sockets.emit('updateroomlist', room_user_map);
        socket.emit('message', "Left room " + roomname + ".", 'success');
    });

    socket.on('disconnect', function(){
        var all_rooms = io.sockets.manager.roomClients[socket.id];
        //console.log("YOLO" + all_rooms);
        for(var roomname in all_rooms){
            if(roomname=="") continue;
            roomname = roomname.slice(1);
            var index = room_user_map[roomname].indexOf(socket.username);
            if(index != -1){
                room_user_map[roomname].splice(index, 1);
                if(room_user_map[roomname].length == 0){
                    delete room_user_map[roomname];
                    socket.broadcast.emit('updateroomlist', room_user_map);
                }
                else{
                    socket.broadcast.to(roomname).emit('updatechat', roomname, 'SERVER',  socket.username + ' has disconnected');
                    socket.broadcast.to(roomname).emit('updatemembers', roomname, room_user_map);
                    socket.leave(roomname);
                }
            }
        }
        var index = usernames.indexOf(socket.username);
        usernames.splice(index, 1);
    });

});

app.get('/', function (req, res) {
  res.render('index',{
      title: 'ChatMan'
  });
});
