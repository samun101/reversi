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


});
