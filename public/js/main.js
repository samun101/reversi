/*functions for things*/

//returns value associated with 'which Param as the URL'
function getURLParameters(whichParam){
  var pageURL=window.location.search.substring(1);
  var pageURLVariables = pageURL.split('&');
  for(var i = 0; i < pageURLVariables.length; i++){
    var parameterName = pageURLVariables[i].split('=');
    if(parameterName[0] == whichParam){
      return parameterName[1];
    }
  }
}

var username = getURLParameters('username');
if ('undefined'== typeof username || !username) {
  username = 'Anon_'+Math.random();
}



var chat_room = getURLParameters('game_id');
if ('undefined'== typeof chat_room || !chat_room) {
  chat_room = 'lobby';
}

//connect to Server
var socket = io.connect();
//when sever sends log messages
socket.on('log', function(array){
  console.log.apply(console,array);
});


//when someone joins room
socket.on('join_room_response',function(payload){
  if(payload.result =='fail'){
    alert(payload.message);
    return ;
  }

  //if we're being notified of joining room
  if(payload.socket_id == socket.id){
    if($('.socket_'+payload.socket_id).length){
      return;
    }
    var nodeA = $('<div></div>');
    nodeA.addClass('socket_'+payload.socket_id);
    var nodeB = $('<div></div>');
    nodeB.addClass('socket_'+payload.socket_id);
    var nodeC = $('<div></div>');
    nodeC.addClass('socket_'+payload.socket_id);

    nodeA.addClass('w-100');

    nodeB.addClass('col-9 text-right');
    nodeB.append('<h4>'+payload.username+'</h4>');

    nodeC.addClass('cold-3 text-left');
    var buttonC = makeReplayButton(payload.socket_id);

    nodeC.append(buttonC);

    nodeA.hide();
    nodeB.hide();
    nodeC.hide();
    $('#players').append(nodeA,nodeB,nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
    nodeC.slideDown(1000);
    return;
  }


  //if someone joined the room add row to lobby table
  var dom_elements = $('.socket_'+payload.socket_id);

  if(dom_elements.length==0){
    var nodeA = $('<div></div>');
    nodeA.addClass('socket_'+payload.socket_id);
    var nodeB = $('<div></div>');
    nodeB.addClass('socket_'+payload.socket_id);
    var nodeC = $('<div></div>');
    nodeC.addClass('socket_'+payload.socket_id);

    nodeA.addClass('w-100');

    nodeB.addClass('col-9 text-right');
    nodeB.append('<h4>'+payload.username+'</h4>');

    nodeC.addClass('cold-3 text-left');
    var buttonC = makeInviteButton(payload.socket_id);

    nodeC.append(buttonC);

    nodeA.hide();
    nodeB.hide();
    nodeC.hide();
    $('#players').append(nodeA,nodeB,nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
    nodeC.slideDown(1000);

    }
    else{
      uninvite(payload.socket_id);
      var buttonC = makeInviteButton(payload.socket_id);
      $('.socket_'+payload.socket_id+'button').replaceWith(buttonC);
      dom_elements.slideDown(1000);
    }

  var newHTML = '<p>'+payload.username+' just entered the lobby</p>';
  var newNode = $(newHTML);
  $('#messages').append(newNode);
  newNode.slideDown(1000);
});

//when someone leaves room
socket.on('player_disconnected',function(payload){
  if(payload.result =='fail'){
    alert(payload.message);
    return ;
  }

  //if we're being notified of leaving room
  if(payload.socket_id == socket.id){
//    $('#messages').append('<p>Successfuly Joined Lobby</p>');
    return;
  }

  //if someone leaves room remove them
  var dom_elements = $('.socket_'+payload.socket_id);

  if(dom_elements.length != 0){
    dom_elements.slideUp(1000);
    }

  var newHTML = '<p>'+payload.username+' has left the lobby</p>';
  var newNode = $(newHTML);
  $('#messages').append(newNode);
  newNode.slideDown(1000);
});

socket.on('request_game_response',function(payload){
  console.log(JSON.stringify(payload));
  replay_id=payload.game_id;
  var board = payload.board;
  $('#request_games').hide(1000);
  $('#turn_buttons_last').html('<button class="btn btn-outline-info" onclick="go_to_turn('+payload.game_id+','+5+')">Next Turn</button>')
  display_board(board);
});

socket.on('uninvite_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }var newNode = makeInviteButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

socket.on('uninvited',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInviteButton(payload.message);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

function game_start(who){
  var payload = {};

  payload.requested_user = who;
  console.log('***Client Log Message: \'game_start\' payload:'+JSON.stringify(payload));
  socket.emit('game_start',payload);
}

socket.on('uninvite_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }var newNode = makeInviteButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

socket.on('game_start_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeEngageButton();
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);

  //go to new page
  window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;
});

socket.on('invite_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }var newNode = makeInvitedButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

socket.on('invited',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  var newNode = makePlayButton(payload.socket_id);
  $('.socket_'+payload.socket_id+' button').replaceWith(newNode);
});

socket.on('saved_games',function(payload){
  console.log('Recieved: '+JSON.stringify(payload));
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  if(payload.length ==0){
    alert('sorry, no games saved, returning you to lobby');
    window.location.href = 'lobby.html?username='+username;
    return;
  }
  for(var i in payload){
    $('#saved_games').append($('<option value="'+i+'">'+payload[i]+'</option>'));
  }
  $('.requesting_game').html('<button type="submit" class="btn btn-default btn-primary"> Send</button>')
});

socket.on('send_message_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  var newHTML = '<p><b> '+payload.username+' says:</b> '+JSON.stringify(payload.message)+'</p>'
  var newNode = $(newHTML)
  newNode.hide();
  $('#messages').append(newNode);
  newNode.slideDown(1000);
});

socket.on('replay_turn_response',function(payload){
  if(payload.result=='fail'){
    alert(payload.message);
    return;
  }
  console.log(JSON.stringify(payload));
  replay_id = payload.game_id;
  var board = payload.board;
  if(payload.turn <= 5){
  //  reset_board(board);
    $('#turn_buttons_last').html('<button class="btn btn-outline-info" onclick="go_to_turn('+replay_id+','+(payload.turn+1)+')">Next Turn</button>');
    $('#turn_buttons_next').html('');
  }
  else if (payload.turn >= payload.end_turn) {
    $('#turn_buttons_next').html('<button class="btn btn-outline-info" onclick="go_to_turn('+replay_id+','+(payload.turn-1)+')">Last Turn</button>');
    $('#turn_buttons_last').html('');
  }
  else{
    $('#turn_buttons_next').html('<button class="btn btn-outline-info" onclick="go_to_turn('+replay_id+','+(payload.turn-1)+')">Last Turn</button>');
    $('#turn_buttons_last').html('<button class="btn btn-outline-info" onclick="go_to_turn('+replay_id+','+(payload.turn+1)+')">Next Turn</button>');
  }
  $('#turn_counter').html('<h3> You are viewing the results of turn '+(payload.turn - 5)+'</h3>');
  reset_board(board);
  display_board(board);
})

function select_replay(){
  var payload = {};
  var game_replay = $('#saved_games').val();
  payload.requested_game=game_replay;
  socket.emit('request_game',payload);
}

function send_to_save(game){
  var payload = {};
  payload.should_be_True = 1;
  payload.game_id = game.last_move_time;
  console.log('*** Client Log Message: \'save_game\' payload: '+JSON.stringify(payload));
  socket.emit('save_game',payload);
  $('#save_game_button').html('<button type="button" class="btn-outline-primary btn-large">Game Saved</button>');
}

function reset_board(game){
  board =[
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0]]
  var row,column;
  for(row = 0;row<8;row++){
    for(column = 0; column <8;column++){
      //to empty
      $('#'+row+'_'+column).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');
    }
  }
}

function request_replays(){
  var payload ={};
  payload.username = username;

  console.log('requesting replays from server');
  socket.emit('replay_games',payload);
}

function go_to_turn(game_id,turn){
  var payload ={}
  payload.game_id = game_id;
  payload.turn = turn;
  console.log(payload);
  socket.emit('replay_turn',payload);
}

function send_message(){
  var payload ={};
  payload.room = chat_room;
  payload.username = username;
  payload.message = $('#send_message_holder').val();
  console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
  socket.emit('send_message',payload);
}

function makeReplayButton(socket_id){
  var newHTML = '<button type = \'button\' class=\'btn-outline-primary\'>View Replays</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    window.location.href = 'replays.html?username='+username;
    request_replays();
  });
  return newNode;
}

function makeInviteButton(socket_id){
  var newHTML = '<button type = \'button\' class=\'btn-outline-primary\'>Invite</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    invite(socket_id);
  });
  return newNode;
}

function makeInvitedButton(socket_id){
  var newHTML = '<button type = \'button\' class=\'btn-primary\'>Invited</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    uninvite(socket_id);
  });
  return newNode;
}

function makePlayButton(socket_id){
  var newHTML = '<button type = \'button\' class=\'btn-success\'>Play</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    game_start(socket_id);
  });
  return newNode;
}

function makeEngageButton(){
  var newHTML = '<button type = \'button\' class=\'btn-outline-danger\'>Engaged</button>';
  var newNode = $(newHTML);

  return newNode;
}

function display_board(board){
  old_board =[
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0]]
  var row,column;
  var blacksum =0;
  var whitesum =0;
  for(row = 0;row<8;row++){
    for(column = 0; column <8;column++){
      if(board[row][column]<0){
        blacksum++;
      }
      else if(board[row][column]>0){
        whitesum++;
      }
      if(old_board[row][column] != board[row][column]){
        //to empty
        if(board[row][column]== 0){
            $('#'+row+'_'+column).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');
          }
          else if(old_board[row][column]<0 && board[row][column]== 0){
            $('#'+row+'_'+column).html('<img src="assets/images/black_to_empty.gif" alt="empty square"/>');
          }
          //to full
          else if(old_board[row][column] == 0 && board[row][column]<0){
            $('#'+row+'_'+column).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');
          }
          else if(old_board[row][column] == 0  && board[row][column]>0){
            $('#'+row+'_'+column).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>');
          }
          else{
            $('#'+row+'_'+column).html('<img src="assets/images/error.gif" alt="Somethings wrong"/>');
          }
      }
    }
  }

  $('#blacksum').html(blacksum);
  $('#whitesum').html(whitesum);
}

function invite(who){
  var payload = {};

  payload.requested_user = who;
  console.log('***Client Log Message: \'invite\' payload:'+JSON.stringify(payload));
  socket.emit('invite',payload);
}

function uninvite(who){
  var payload = {};
  payload.requested_user = who;
  console.log('***Client Log Message: \'uninvite\' payload:'+JSON.stringify(payload));
  socket.emit('uninvite',payload);
}

$(function(){
  var payload = {};
  payload.room=chat_room;
  payload.username=username;
  console.log('***Client Log Message: \'join room\' payload:'+JSON.stringify(payload));
  socket.emit('join_room',payload);

  $('#quit').append('<a href="lobby.html?username='+username+'" class="btn btn-danger btn-default active" roles="button" aria-pressed="true">Quit</a>');
});

var old_board=[
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
  ['?','?','?','?','?','?','?','?'],
];
var my_color = 0;
var interval_timer;
socket.on('game_update',function(payload){

  console.log('***Client Log Message: \'game update\'\n\t payload:'+JSON.stringify(payload));

  if(payload.result=='fail'){
    console.log(payload.message);
    window.location.href = 'lobby.html?username'+username;
    alert(payload.message);
    return;
  }

  var board = payload.game.board;
  if('undefined' == typeof board || !board){
    console.log('internal error: recieved a malformed board update from the server');
    return;
  }

  //update my_color
  if(socket.id == payload.game.player_white.socket){
    my_color = 'white';
  }
  else if(socket.id == payload.game.player_black.socket){
    my_color = 'black';
  }
  else{
    window.location.href='lobby.html?username='+username;
  }
  $('#header-row').html('<h1>'+payload.game.player_white.username+' vs. '+payload.game.player_black.username+'</h1>');
  $('#my_color').html('<h2 id = "my_color">I am '+my_color+'</h2>');
  $('#my_color').append('<h3> You are on turn '+(payload.game.turn_count - 4)+'</h3>');
  $('#my_color').append('<h4>It is '+payload.game.whose_turn+'\'s turn</h4>');
  $('#my_color').append('<h4>Elapsed time <span id="elapsed"></span></h4>');

  clearInterval(interval_timer);
  interval_timer = setInterval( function(last_time){
    return function(){
      var d = new Date();
      var elapsedmilli = d.getTime() - last_time;
      var minutes = Math.floor((elapsedmilli/(60*1000)));
      var seconds = Math.floor((elapsedmilli%(60*1000)/1000));
      if(seconds <10){
        $('#elapsed').html(minutes+' : 0'+seconds)
      }
      else{
        $('#elapsed').html(minutes+' : '+seconds)
      }
    }}(payload.game.last_move_time)
   , 1000);

  var blacksum = 0;
  var whitesum =0;

  //animate changes
  var row,column;
  for(row = 0;row<8;row++){
    for(column = 0; column <8;column++){
      if(board[row][column]<0){
        blacksum++;
      }
      else if(board[row][column]>0){
        whitesum++;
      }
      if(old_board[row][column] != board[row][column]){
        if(old_board[row][column] == '?' && board[row][column] == 0){
          $('#'+row+'_'+column).html('<img src="assets/images/Empty.gif" alt="empty square"/>');
        }
        else if(old_board[row][column] == '?' && board[row][column]>0){
          $('#'+row+'_'+column).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>' );
        }
        else if(old_board[row][column] == '?' && board[row][column]<0){
          $('#'+row+'_'+column).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');
        }
        //to empty
        else if(old_board[row][column]>0 && board[row][column]== 0){
          $('#'+row+'_'+column).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');
        }
        else if(old_board[row][column]<0 && board[row][column]== 0){
          $('#'+row+'_'+column).html('<img src="assets/images/black_to_empty.gif" alt="empty square"/>');
        }
        //to full
        else if((old_board[row][column]>0 || old_board[row][column] == 0) && board[row][column]<0){
          $('#'+row+'_'+column).html('<img src="assets/images/white_to_black.gif" alt="black square"/>');
        }
        else if((old_board[row][column]<0 || old_board[row][column] == 0)  && board[row][column]>0){
          $('#'+row+'_'+column).html('<img src="assets/images/black_to_white.gif" alt="white square"/>');
        }
        else{
          $('#'+row+'_'+column).html('<img src="assets/images/error.gif" alt="Somethings wrong"/>');
        }
      }

        //setting up interactivity
        $('#'+row+'_'+column).off('click');
        $('#'+row+'_'+column).removeClass('hovered_over');
        /*var check;
        if(my_color ==='black'){
          check = -1;
        }
        if(my_color ==='white'){
          check = 1;
        }*/
        if(payload.game.whose_turn === my_color){
          if(payload.game.legal_moves[row][column]!=0){
            $('#'+row+'_'+column).addClass('hovered_over');
            $('#'+row+'_'+column).click(function(r,c){
              return function(){
                var payload = {};
                payload.row = r;
                payload.column = c;
                payload.color = my_color;
                console.log('*** Client log Message: \'play_token\' payload: '+JSON.stringify(payload));
                socket.emit('play_token',payload);
              };
            }(row,column));
          }
        }
      }
    }
  $('#blacksum').html(blacksum);
  $('#whitesum').html(whitesum);
  old_board=board;
});

socket.on('play_token_response',function(payload){
  console.log('***Client log message: \'play_token_response\'\n\tpayload: '+JSON.stringify(payload));
  if(payload.result =='fail'){
    console.log(payload.message);
    alert(payload.message);
    return;
  }
});

socket.on('game_over',function(payload){
  console.log('***Client log message: \'game_over\'\n\tpayload: '+JSON.stringify(payload));
  if(payload.result =='fail'){
    console.log(payload.message);
    alert(payload.message);
    return;
  }

  $('#game_over').html('<h1>Game Over</h1><h2>'+payload.who_won+'</h2>');
  $('#game_over_button').html('<a href="lobby.html?username='+username+'" class="btn btn-success btn-large active" roles="button" aria-pressed="true">Return to the Lobby</a>');
  var newNode = $('<button type="button" class="btn btn-primary btn-large active">Save Game</button>');
  newNode.click(send_to_save(payload.game));
  $('#save_game_button').html(newNode);
});
