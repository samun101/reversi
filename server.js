//setup the static file Server
var static = require('node-static');

var http = require('http');

var port = process.env.PORT;
var directory = __dirname+'/public';

if(typeof port=='undefined' ||!port){
  directory='./public';
  port = 8080;
}

var file = new static.Server(directory);

var app = http.createServer( function(request,response){
    request.addListener('end', function(){
      file.serve(request,response);
    }).resume();
  }).listen(port);
console.log('server is running');

//setup web socket Server
//Registry of players and player info
var players =[];
var io = require('socket.io').listen(app);
io.sockets.on('connection', function(socket){
  log('Client Connection by '+socket.id);
  function log(){
    var array = ['*** Server Log Message: '];
    for(var i = 0; i<arguments.length;i++){
      array.push(arguments[i]);
      console.log(arguments[i]);
    }
    socket.emit('log',array);
    socket.broadcast.emit('log',array);
  }



  /*join_room command
    payload:
      'room': room to join,
      'username': username of person joining
    join_room_response:
      'result': success
      'room': room joined,
      'username' : username that joined
      'socket_id' : The socket ID of the person
      'membership' : number of people in the room, including the new one
    or
    'result': fail
    'room': failure message
    */
  socket.on('join_room',function(payload){
    log('\'join_room\' command'+JSON.stringify(payload));
    //chech client sent payload
    if(('undefined' === typeof payload) || !payload){
      var error_message = 'join_room had no payload, command aborted'
      log(error_message);
      socket.emit('join_room_response',{
              result:'fail',
              message:error_message});
      return ;
      }
    //chech that joining actual room
    var room = payload.room;
    if(('undefined' === typeof room) || !room){
        var error_message = 'join_room didn\'t specify a room, command aborted'
        log(error_message);
        socket.emit('join_room_response',{
                result:'fail',
                message:error_message});
        return ;
        }
    //chech that username is provided
    var username = payload.username;
    if(('undefined' === typeof username) || !username){
      var error_message = 'join_room didn\'t specify a userame command aborted'
      log(error_message);
      socket.emit('join_room_response',{
              result:'fail',
              message:error_message});
      return ;
    }

    //store info about Players
    players[socket.id]={};
    players[socket.id].username=username;
    players[socket.id].room=room;

    //actually have user join room
    socket.join(room);

    //getting room object
    var roomObject = io.sockets.adapter.rooms[room];

    var numClients = roomObject.length;
    var success_data ={
        result: 'success',
        room: room,
        username: username,
        socket_id: socket.id,
        membership:(numClients +1)

    };

    io.in(room).emit('join_room_response',success_data);

    for(var s_in_r in roomObject.sockets){
      var success_data ={
          result: 'success',
          room: room,
          username: players[s_in_r].username,
          socket_id: s_in_r,
          membership:(numClients +1)
      };
      socket.emit('join_room_response',success_data);
    }

    log('join_room success');
    if(room !=='lobby'){
      send_game_update(socket,room,'initial update');
    }
  });

  socket.on('disconnect',function(){
    log('Client disconnected '+JSON.stringify(players[socket.id]));
    if('undefined' !== typeof players[socket.id] && players[socket.id]){
      var username = players[socket.id].username;
      var room = players[socket.id].room;
      var payload = {
        username: username,
        socket_id: socket.id
      };
      delete players[socket.id];
      io.in(room).emit('player_disconnected',payload);
    }
  });

  /*send_message command
    payload:
      'room': room to join,
      'username': username of person sending message,
      'message': message to send
    send_message_response:
      'result':'success',
      'username': username of the person that spoke
      'message': the message spoken
    or
    'result': fail
    'room': failure message
    */
  socket.on('send_message',function(payload){
      log('server received a command','send_message',payload);
      if(('undefined' === typeof payload) || !payload){
        var error_message = 'send_message had no payload, command aborted'
        log(error_message);
        socket.emit('send_message_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var room = payload.room;
      if(('undefined' === typeof room) || !room){
          var error_message = 'send_message didn\'t specify a room, command aborted'
          log(error_message);
          socket.emit('send_message_response',{
                  result:'fail',
                  message:error_message});
          return ;
      }

      var username = payload.username;
      if(('undefined' === typeof username) || !username){
        var error_message = 'send_message didn\'t specify a userame command aborted'
        log(error_message);
        socket.emit('send_message_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var message = payload.message;
      if(('undefined' === typeof message) || !message) {
        var error_message = 'send_message didn\'t specify a message command aborted'
        log(error_message);
        socket.emit('send_message_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var success_data = {
        results: 'success',
        room: room,
        username: username,
        message: message
      };

      io.sockets.in(room).emit('send_message_response',success_data);
      log('Message sent to room  '+room+' by '+ username);
    });


  /*invite command
      payload:
        'requested_user': the user invited to a game (socket id)

      invite_response:
        'result':'success',
        'socket_id':socket id of person being invited
        'message': the message spoken
      or
        'result': fail
        'room': failure message

      invited:
        'result':'success',
        'socket_id':socket id of person being invited
      or
        'result': fail
        'room': failure message
      */
  socket.on('invite',function(payload){
        log('invite with' +JSON.stringify(payload));
        //make sure payload was sent
        if(('undefined' === typeof payload) || !payload){
          var error_message = 'invite had no payload, command aborted'
          log(error_message);
          socket.emit('invite_response',{
                  result:'fail',
                  message:error_message});
          return ;
        }
        //message can be traced to a username
        var username = players[socket.id].username;
        if(('undefined' === typeof username) || !username){
          var error_message = 'cant identify the person being invited'
          log(error_message);
          socket.emit('invite_response',{
                  result:'fail',
                  message:error_message});
          return ;
        }

        var requested_user = payload.requested_user;
        if(('undefined' === typeof requested_user) || !requested_user) {
          var error_message = 'invite didnt request a user'
          log(error_message);
          socket.emit('invite_response',{
                  result:'fail',
                  message:error_message});
          return ;
        }

        var room =players[socket.id].room;
        var roomObject = io.sockets.adapter.rooms[room];

        if(!roomObject.sockets.hasOwnProperty(requested_user)){
          var error_message = 'invite requested a user that wasnt in the room command aborted';
          log(error_message)
          socket.emit('invite_response',{
            result:'fail',
            message:error_message})
        }

        var success_data = {
          results: 'success',
          socket_id: requested_user
        };
        socket.emit('invite_response',success_data);

        var success_data = {
          results: 'success',
          socket_id: socket.id,
        };
        socket.to(requested_user).emit('invited',success_data);
        log('invite successful')

      });

  /*uninvite command
        payload:
          'requested_user': the user invited to a game (socket id)

        uninvite_response:
          'result':'success',
          'socket_id':socket id of person being uninvited
          'message': the message spoken
        or
          'result': fail
          'room': failure message

        uninvited:
          'result':'success',
          'socket_id':socket id of person being uninvited
        or
          'result': fail
          'room': failure message
        */
  socket.on('uninvite',function(payload){
          log('uninvite with' +JSON.stringify(payload));
          //make sure payload was sent
          if(('undefined' === typeof payload) || !payload){
            var error_message = 'uninvite had no payload, command aborted'
            log(error_message);
            socket.emit('uninvite_response',{
                    result:'fail',
                    message:error_message});
            return ;
          }
          //message can be traced to a username
          var username = players[socket.id].username;
          if(('undefined' === typeof username) || !username){
            var error_message = 'cant identify the person'
            log(error_message);
            socket.emit('uninvite_response',{
                    result:'fail',
                    message:error_message});
            return ;
          }

          var requested_user = payload.requested_user;
          if(('undefined' === typeof requested_user) || !requested_user) {
            var error_message = 'uninvite didnt request a user'
            log(error_message);
            socket.emit('uninvite_response',{
                    result:'fail',
                    message:error_message});
            return ;
          }

          var room =players[socket.id].room;
          var roomObject = io.sockets.adapter.rooms[room];

          if(!roomObject.sockets.hasOwnProperty(requested_user)){
            var error_message = 'uninvite requested a user that wasnt in the room command aborted';
            log(error_message)
            socket.emit('uninvite_response',{
              result:'fail',
              message:error_message})
          }

          var success_data = {
            results: 'success',
            socket_id: requested_user
          };
          socket.emit('uninvite_response',success_data);

          var success_data = {
            results: 'success',
            socket_id: socket.id,
          };
          socket.to(requested_user).emit('uninvited',success_data);
          log('uninvite successful')

        });

  /*game_start command
              payload:
                'requested_user': the user to play with

              game_start_response:
                'result':'success',
                'socket_id':socket id of person playing with
                'game_id': id of game session,
              or
                'result': fail
                'room': failure message
              */
  socket.on('game_start',function(payload){
                log('game_start with' +JSON.stringify(payload));
                //make sure payload was sent
                if(('undefined' === typeof payload) || !payload){
                  var error_message = 'uninvite had no payload, command aborted'
                  log(error_message);
                  socket.emit('game_start_response',{
                          result:'fail',
                          message:error_message});
                  return ;
                }
                //message can be traced to a username
                var username = players[socket.id].username;
                if(('undefined' === typeof username) || !username){
                  var error_message = 'fame_start cant identify the person'
                  log(error_message);
                  socket.emit('game_start_response',{
                          result:'fail',
                          message:error_message});
                  return ;
                }

                var requested_user = payload.requested_user;
                if(('undefined' === typeof requested_user) || !requested_user) {
                  var error_message = 'game start didnt request a user'
                  log(error_message);
                  socket.emit('game_start_response',{
                          result:'fail',
                          message:error_message});
                  return ;
                }

                var room =players[socket.id].room;
                var roomObject = io.sockets.adapter.rooms[room];

                if(!roomObject.sockets.hasOwnProperty(requested_user)){
                  var error_message = 'game_start requested a user that wasnt in the room command aborted';
                  log(error_message)
                  socket.emit('game_start_response',{
                    result:'fail',
                    message:error_message})
                }
                var game_id=Math.floor((1+Math.random())*0x10000).toString(16).substring(1);
                var success_data = {
                  results: 'success',
                  socket_id: requested_user,
                  game_id: game_id
                };
                socket.emit('game_start_response',success_data);
                var success_data = {
                  results: 'success',
                  socket_id: socket.id,
                  game_id: game_id
                };

                socket.to(requested_user).emit('game_start_response',success_data);
                log('game_start successful')

              });
/*play_token command
              payload:
                'row': 0-7 the row for the token
                'column': 0-7 the column for the token
                'color': white or black
                if successful will be followed by a game_update message
              play_token_response:
                'result':'success',
              or
                'result': fail
                'room': failure message
*/
socket.on('play_token',function(payload){
      log('game_start with' +JSON.stringify(payload));
      //make sure payload was sent
      if(('undefined' === typeof payload) || !payload){
        var error_message = 'play_token had no payload, command aborted'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
            return ;
        }
      //player has been previously registered
      var player = players[socket.id];
      if(('undefined' === typeof player) || !player){
        var error_message = 'You are not recognized please step back once'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var username = players[socket.id].username;
      if(('undefined' === typeof username) || !username){
        var error_message = 'We dont know who sent the message, check your username'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var game_id = players[socket.id].room;
      if(('undefined' === typeof game_id) || !game_id){
        var error_message = 'play_token cant find your game, sorry'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var row = payload.row;
      if(('undefined' === typeof row) || row<0 || row>7){
        var error_message = 'didnt specify a valid row'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var column = payload.column;
      if(('undefined' === typeof colum) || column<0 || column>7){
        var error_message = 'didnt specify a valid column'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }

      var color = payload.color;
      if(('undefined' === typeof color) || !color || (color !='white'&& color!='black')){
        var error_message = 'didnt specify a valid color'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }
      var game = games[game_id];;
      if(('undefined' === typeof game) || !game){
        var error_message = 'couldnt find your game'
        log(error_message);
        socket.emit('play_token_response',{
                result:'fail',
                message:error_message});
        return ;
      }
      var success_data ={
        result: 'success'
      }
      socket.emit('play_token_response',success_data);
      if(color='white'){
        game.board[row][column] = 'w';
        game.whose_turn = 'black';
      }
      if(color='black'){
        game.board[row][column] = 'b';
        game.whose_turn = 'white';
      }
      var d = new Date();
      game.last_move_time = d.getTime();
      send_game_update(socket,game_id,'played a token');
});
//code related to game game state
var games=[];

function create_new_game(){
  var new_game ={};
  new_game.player_white={};
  new_game.player_black={};
  new_game.player_white.socket='';
  new_game.player_white.username='';
  new_game.player_black.socket='';
  new_game.player_black.username='';

  var d = new Date();
  new_game.last_move_time = d.getTime();

  new_game.whose_turn ='white';
  new_game.board = [
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ','w','b',' ',' ',' '],
    [' ',' ',' ','b','w',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
    [' ',' ',' ',' ',' ',' ',' ',' '],
  ];
  return new_game;
};

function send_game_update(socket, game_id, message){
  //chech if game_id already exists
  if(('undefined'===typeof games[game_id] || !games[game_id])){
    console.log('no game exists, creating '+game_id+ ' for '+socket);
    games[game_id] = create_new_game();
  }
  // make sure only players are present
  var roomObject;
  var numClients;
  do{
    roomObject = io.sockets.adapter.rooms[game_id];
    numClients = roomObject.length;
    if(numClients>2){
      console.log('too many clients in room: '+game_id+' #: '+numClients);
      if(games[game_id].player_white.socket == roomObject.sockets[0]){
        games[game_id].player_white.socket = '';
        games[game_id].player_white.username= '';
      }
      if(games[game_id].player_black.socket == roomObject.sockets[0]){
        games[game_id].player_black.socket = '';
        games[game_id].player_black.username= '';
      }
      var sacrifice = Object.keys(roomObject.sockets)[0];
      io.of('/').connected[sacrifice].leave(game_id);
    }
  }while((numClients-1)>2)
  //assign socket a color
  if((games[game_id].player_white.socket != socket.id)&&(games[game_id].player_black.socket != socket.id)){
    console.log('player isnt assigned a color: '+ players[socket.id].username);
    if((games[game_id].player_black.socket != '')&&(games[game_id].player_white.socket != '')){
      games[game_id].player_white.socket = '';
      games[game_id].player_white.username = '';
      games[game_id].player_black.socket = '';
      games[game_id].player_black.username = '';
    }
  }
  if(games[game_id].player_black.socket == ''){
    if(games[game_id].player_white.socket != socket.id){
      games[game_id].player_black.socket = socket.id;
      games[game_id].player_black.username = players[socket.id].username;
    }
  }
  else if(games[game_id].player_white.socket == ''){
    if(games[game_id].player_black.socket != socket.id){
      games[game_id].player_white.socket = socket.id;
      games[game_id].player_white.username = players[socket.id].username;
    }
  }

  //send game update
  var success_data={
      result:'success',
      game:games[game_id],
      message:message,
      game_id:game_id
  };
  io.in(game_id).emit('game_update',success_data);
  //check if game is over
}
})
