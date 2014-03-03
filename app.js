var express = require('express');
// var routes = require('./routes');
// var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
var PORT = 3000
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

server.listen(app.get('port'));

var usernames = [];

var room_user_map = {'Public':[]};

io.sockets.on('connection', function (socket) {
    socket.on('adduser', function(username){
        var flag = 0;
        for(int i=0; i<usernames.length; i++){
            if(usernames[i] == username){
                flag = 1;
                break;
            }
        }
        if(flag){
            socket.emit('message', "User exists already. Pick another username");
        }
        else{
            socket.username = username;
            socket.emit('message', "User created.");
            socket.emit('addeduser', socket.username);
            usernames.push(username);
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
            socket.emit('message', "Room exists already. Pick another name");
        }
        else{
            // create new
            room_user_map[roomname] = [socket.username];
            socket.join(roomname);
            socket.emit('message', "Room created.");
            socket.emit('addroom', roomname);
            socket.emit('joinedroom', roomname);
            socket.broadcast.to(roomname).emit('updatechat', 'SERVER',  socket.username + ' has connected to the room');
            socket.broadcast.to(roomname).emit('updaterooms', room_user_map, roomname);
            socket.broadcast.emit('updateroomlist', room_user_map);
        }
    });

    socket.on('joinroom', function(roomname){
        // if already joined, tell the user of it
        var room_users = room_user_map[roomname]
        var flag = 0;
        for(int i=0; i<room_users.length; i++){
            if(room_users[i] == socket.username){
                flag = 1;
                break;
            }
        }

        if(flag){
            socket.emit('message', "Already connected to " + roomname + ".");
        }
        else{
            // join the user to the room
            room_user_map[roomname].push(socket.username);
            socket.join(roomname);
            socket.emit('message', "Joined successfully."); 
            socket.emit('addroom', roomname);
            socket.emit('joinedroom', roomname);
            socket.broadcast.to(roomname).emit('updatechat', 'SERVER',  socket.username + ' has connected to the room');
            socket.broadcast.to(roomname).emit('updaterooms', room_user_map, roomname);
            socket.broadcast.emit('updateroomlist', room_user_map);
        }
    });

    socket.on('sendchat', function (data, roomname) {
        // we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(roomname).emit('updatechat', socket.username, data);
    });

    socket.on('leaveroom', function(roomname){
        socket.leave(roomname);
        socket.emit('message', "Left room " + roomname + ".");
        var index = room_user_map[roomname].indexOf(socket.username);
        room_user_map[roomname].splice(index, 1);
        // if no users left, room shuts down automatically
        if(room_user_map[roomname].length === 0){
            delete room_user_map[roomname];
        }
        else{
            socket.emit('removeroom', roomname);
            socket.emit('leftroom', room_user_map);
            socket.broadcast.to(roomname).emit('updatechat', 'SERVER',  socket.username + ' has left the room');
            socket.broadcast.to(roomname).emit('updaterooms', room_user_map, roomname);
        }
    });

    socket.on('disconnect', function(){
        var all_rooms = io.sockets.manager.roomClients[socket.id];
        for(var roomname in all_rooms){
            var index = room_user_map[roomname].indexOf(socket.username);
            room_user_map[roomname].splice(index, 1);
            socket.leave(room);
            // #TODO: Needed?
            socket.emit('removeroom', roomname);
            socket.broadcast.to(roomname).emit('updatechat', 'SERVER',  socket.username + ' has left the room');
            socket.broadcast.to(roomname).emit('updaterooms', room_user_map, roomname);
        }
        var index = usernames.indexOf(socket.username);
        usernames.splice(index, 1);
    });
});

app.get('/', function (req, res) {
  res.render('index',{
      title: 'Express'
  });
});