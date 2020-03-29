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

  socket.on('disconnect',function(socket){
    log('Client disconnected '+JSON.stringify(players[socket.id]));
    if('undefined' !== typeof players[socket.id]&&players[socket.id]){
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
});
