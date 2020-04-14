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
//    $('#messages').append('<p>Successfuly Joined Lobby</p>');
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
//when you leave the room
/*socket.on('player_disconnected',function(payload){
  if(payload.result =='fail'){
    alert(payload.message);
    return ;
  }
});
*/

function send_message(){
  var payload ={};
  payload.room = chat_room;
  payload.username = username;
  payload.message = $('#send_message_holder').val();
  console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
  socket.emit('send_message',payload);
}

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


$(function(){
  var payload = {};
  payload.room=chat_room;
  payload.username=username;
  console.log('***Client Log Message: \'join room\' payload:'+JSON.stringify(payload));
  socket.emit('join_room',payload);
})
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
var my_color = ' ';
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

  $('#my_color').html('<h3 id = "my_color">I am '+my_color+'</h3>');

  //animate changes
  var row,column;
  for(row = 0;row<8;row++){
    for(column = 0; column <8;column++){
      if(old_board[row][column] !=board[row][column]){
        //?????????????????????????
        if(old_board[row][column] == '?' && board[row][column] == ' '){
          $('#'+row+'_'+column).html('<img src="assets/images/empty.gif" alt="empty square"/>');
        }
        else if(old_board[row][column] == '?' && board[row][column]== 'w'){
          $('#'+row+'_'+column).html('<img src="assets/images/empty_to_white.gif" alt="white square"/>' );
        }
        else if(old_board[row][column] == '?' && board[row][column]== 'b'){
          $('#'+row+'_'+column).html('<img src="assets/images/empty_to_black.gif" alt="black square"/>');
        }
        //to empty
        else if(old_board[row][column] == 'w' && board[row][column]== ' '){
          $('#'+row+'_'+column).html('<img src="assets/images/white_to_empty.gif" alt="empty square"/>');
        }
        else if(old_board[row][column] == 'b' && board[row][column]== ' '){
          $('#'+row+'_'+column).html('<img src="assets/images/black_to_empty.gif" alt="empty square"/>');
        }
        //to empty
        else if(old_board[row][column] == 'w' && board[row][column]== 'b'){
          $('#'+row+'_'+column).html('<img src="assets/images/white_to_black.gif" alt="black square"/>');
        }
        else if(old_board[row][column] == 'b' && board[row][column]== 'w'){
          $('#'+row+'_'+column).html('<img src="assets/images/black_to_white.gif" alt="white square"/>');
        }
        else{
          $('#'+row+'_'+column).html('<img src="assets/images/error.gif" alt="Somethings wrong"/>');
        }
        //setting up interactivity
        $('#'+row+'_'+column).off('click)');
        if(board[row][column]==' '){
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
        else{
          $('#'+row+'_'+column).removeClass('hovered_over');
        }
      }
    }
  }
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
