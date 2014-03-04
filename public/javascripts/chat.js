$(document).ready(function(){
	// global
	connected = 0;
	joined = 0;

	showroom();
	var socket = io.connect("http://localhost:3000");

	socket.on('message', function(data){
		alert(data);
	});

	$('#adduser').click(function(){
		if(!connected){
			var username = prompt("Enter a username.");
			if(username){
				socket.emit('adduser', username);
			}
		}
		else{
			alert("You're already connected.");
		}
	});

	socket.on('addeduser', function(){
		connected = 1;
		showroom();
	});

	$('#createroom').click(function(){
		var roomname = prompt("Enter name for room.");
		if(roomname){
			socket.emit('createroom', roomname);
		}
	});

	socket.on('addroom', function(newroom){
		// add tab
		var l = '<li><a href="#' + newroom + '" data-toggle="tab">' + newroom + '</a></li>';
		$('#tablist').append(l);
		$('a[data-toggle="tab"]').bind('click', tabclick_callback);
		// add chat window
		var l = '<div class="tab-pane" id="' + newroom + '">';
		l += '<div class="chats"></div>';
		l += '<ul class="members"></ul>';
		l += '</div>';
		$('#chatwindows').append(l);
	});

	socket.on('joinedroom', function(newroom){
		joined += 1;
		updateInputAndLeaveBox(newroom);
		showroom();
		$('a[href="#' + newroom+ '"]').click();
	});

	$('#leavechat').click(function(){
		var roomname = $(this).attr("data-roomname");
		socket.emit('leaveroom', roomname);
	});

	socket.on('removeroom', function(roomname){
		$('a[href=#' + roomname + ']').parent().detach();
		$('#' + roomname).detach();
	});

	socket.on('leftroom', function(data){
		joined -=1;
		showroom();
		for(var i in data){
			$('a[href="#' + i + '"]').click();
			updateInputAndLeaveBox(i);
			break;
		}
	});

	socket.on('updatechat', function(roomname, sender, msg){
		var chatwin = $('#' + roomname + ' .chats')[0];
		var text = '<p><b>' + sender + ': </b>' + msg + '</p>';
		$(chatwin).append(text);
	});

	socket.on('updatemembers', function(roomname, data){
		var memberswin = $('#' + roomname + ' .members')[0];
		memberswin = $(memberswin);
		var members = data[roomname];
		memberswin.children().detach();
		for(var i=0; i<members.length; i++){
			var l = '<li class="membername">' + members[i] + '</li>';
			memberswin.append(l);
		}
	});

	socket.on('updateroomlist', function(data){
		// delete present rooms
		$('#roomlist').children().detach();
		// update list
		for(var roomname in data){
			var l = '<li class="roomname" data-roomname="' + roomname + '">' + roomname + '</li>';
			$('#roomlist').append(l);
			$('li[data-roomname="' + roomname+ '"]').bind('click', roomnameclick_callback);
		}
	});

	function roomnameclick_callback(){
		var roomname = $(this).attr("data-roomname");
		socket.emit('joinroom', roomname);
	}

	function tabclick_callback(){
		var roomname = $(this).attr('href');
		roomname = roomname.slice(1); // remove the hash
		updateInputAndLeaveBox(roomname);
	}

	$('#inputbox').keypress(function(e){
		var val, roomname;
		roomname = $(this).attr('data-roomname');
		if(roomname == 'none'){
			alert('Not connected to any room.');
			return;
		}
		if(e.which == 13){
			$(this).blur();
			val = $(this).val();
			socket.emit('sendchat', val, roomname);
			$(this).val('');
			$(this).focus();
		}
	})

	function updateInputAndLeaveBox(roomname){
		$('#inputbox').attr('data-roomname', roomname);
		$('#leavechat').attr('data-roomname', roomname);
	}

	function showroom(){
		if(joined){
			$('#upperbox').show();
			$('#lowerbox').show();
			$('#leavechat').show();
		}
		else{
			$('#upperbox').hide();
			$('#lowerbox').hide();
			$('#leavechat').hide();
		}
		if(connected){
			$('#adduser').hide();
			$('#createroom').show();
			$('#roomlist').show();
		}
		else{
			$('#adduser').show();
			$('#createroom').hide();
			$('#roomlist').hide();
		}
	}
});