$(document).ready(function(){
	// global
	connected = 0;
	joined = 0;

	if(!joined){
		$('#upperbox').hide();
		$('#lowerbox').hide();
	}
	var socket = io.connect("http://localhost:3000");

	socket.on('message', function(data){
		alert(data);
	});

	/*
	socket.on('connect', function(
		socket.emit('adduser', prompt("Enter a username."));
	});
	*/

	$('#adduser').click(function(){
		if(!connected){
			socket.emit('adduser', prompt("Enter a username."));
		}
		else{
			alert("You're already connected.");
		}
	});

	socket.on('addeduser', function(data){
		$('#username').html(data);
		connected = 1;
	});

	$('#createroom').click(function(){
		socket.emit('createroom', prompt("Enter name for room."));
	});

	socket.on('createdroom', function(){
		joined = 1;
		// switch to tab

	})

	socket.on('addroom', function(newroom){
		// add tab
		var l = '<li><a href="#' + newroom + '" data-toggle="tab">' + newroom + '</a></li>';
		$('#tablist').append(l);
		// add chat window
		var l = '<div class="tab-pane" id="window-' + roomname + '"></div>';
		$('#chatwindows').append(l);
	});

	$('.roomname').click(function(){
		var roomname = $(this).attr("data-roomname");
		socket.emit('joinroom', roomname);
	});

	socket.on('joinedroom', function(newroom){
		$('a[href="#' + newroom+ '"]').click();
	});

	$('.leave').click(function(){
		var roomname = $(this).attr("data-roomname");
		socket.emit('leaveroom', roomname);
	});

	socket.on('removeroom', function(roomname){
		$('a[href=#' + roomname + ']').detach();
		$('#window-' + roomname).detach();
	});

	socket.on('leftroom', function(data){
		for(var i in data){
			$('a[href="#' + i + '"]').click();
			break;
		}
	});

	socket.on('updateroomlist', function(data){
		// delete present rooms
		$('ul#roomlist').children().detach();
		// update list
		for(var roomname in data){
			$('ul#roomlist').append('<li class="roomname" data-roonname="' + roomaname + '">' + roomname + '</li>');
		}
	});

});