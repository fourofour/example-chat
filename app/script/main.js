// Setting up our log system
class Log {
  constructor(message_board = document, online_list = document) {
    this.message_board = message_board;
    this.online_list = online_list;
  }

  message(data) {
    let element = document.createElement('li'),
        span1 = document.createElement('span'),
        text1 = document.createTextNode(data.message);

    let span2, text2;

    if(data.label) {
      span2 = document.createElement('span');
      text2 = document.createTextNode(data.label);

      span2.classList.add('label')

      span2.appendChild(text2);
      element.appendChild(span2);
    }

    span1.classList.add('info');
    span1.appendChild(text1);
    element.appendChild(span1);

    this.message_board.appendChild(element);
    this.message_board.scrollTop = this.message_board.scrollHeight;
  }

  list(list = []) {
    [...this.online_list.childNodes].forEach(function(currentValue, index, array) {
      currentValue.remove();
    });

    for(let i=0; i < list.length; i++) {
      let element = document.createElement('li'),
          span1 = document.createElement('span'),
          text1 = document.createTextNode(list[i][1]),
          span2 = document.createElement('span'),
          text2 = document.createTextNode('poke');

      span1.appendChild(text1);
            
      span2.classList.add('poke');
      span2.setAttribute('data-socket-id', list[i][0]);
      span2.setAttribute('data-name', list[i][1]);
      span2.addEventListener('click', client.event.poke);
      span2.appendChild(text2);

      element.appendChild(span1);
      element.appendChild(span2);

      this.online_list.appendChild(element);
    }
  }
}

// Setting up a class to control our client behavior
class Client {
  constructor() {
    let client = this;

    this.show = {
      register: function() {
        let register_form = elements.get('register_form');

        register_form.style.removeProperty('display');
      },
      chat: function() {
        let message_form = elements.get('message_form');

        message_form.style.removeProperty('display');
      }
    };

    this.hide = {
      register: function() {
        let register_form = elements.get('register_form');

        register_form.style.display = 'none';
      },
      chat: function() {
        let message_form = elements.get('message_form');

        message_form.style.display = 'none';
      }
    };

    this.state = {
      register: function() {
        client.hide.chat();
        client.show.register();
      },
      chat: function() {
        client.show.chat();
        client.hide.register();
      }
    };

    this.event = {
      poke(event) {
        event.preventDefault();

        let data = {
          username : config.get('username'),
          target : {
            username: this.getAttribute('data-name'),
            id: this.getAttribute('data-socket-id')
          }
        };

        socket.emit('new:poke', data);
      }
    }
  }
}

// Building our client object
let client = new Client();

// Keep all elements in a collection
let elements = new Map();

// Keep all clinet configs
let config = new Map();

// Collection and assign all necessary DOM elements to prevent using global namespace on window object
elements.set('message_form', document['message_form']);
elements.set('message_input', document['message_form']['message_input']);
elements.set('register_form', document['register_form']);
elements.set('register_input', document['register_form']['register_input']);
elements.set('message_board', document.getElementById('message_board'));
elements.set('online_list', document.getElementById('online_list'));

let socket = io();
let log = new Log(elements.get('message_board'), elements.get('online_list'));

// Register Nickname event handler - submit on form
elements.get('register_form').addEventListener('submit', function(event) {
  event.preventDefault();

  let input = elements.get('register_input');
  
  if(input.value.length > 0 && config.get('connected'))
    socket.emit('register:username', input.value);

  input.value = '';
});

// Sending message event handler - submit on form
elements.get('message_form').addEventListener('submit', function(event) {
  event.preventDefault();
  
  let input = elements.get('message_input');
  
  if(input.value.length > 0 && config.get('connected'))
    socket.emit('new:message', input.value);

  input.value = '';
});

// sockets
config.set('connected', false);

socket.on('connect', function() {
  config.set('connected', true);

  let data = {
    message: 'connected'
  };

  log.message(data);
});

socket.on('disconnect', function() {
  config.set('connected', false);

  client.state.register();

  let data = {
    message: 'you are disconnected!'
  };

  log.message(data);
});

socket.on('reconnect', function () {
  config.set('connected', true);

  let username = config.get('username');
  let data = {
    message: 'you have been reconnected'
  };

  if(username)
    socket.emit('register:username', username);
  
  log.message(data);
});

socket.on('reconnect_error', function () {
  let data = {
    message: 'attempt to reconnect has failed'
  };

  log.message(data);
});

socket.on('new:message', function(data) {
  if(config.get('username'))
    log.message(data);
});

socket.on('register:username', function(username) {
  config.set('username', username);

  client.state.chat();

  let data = {
    message: 'Welcome ' + username
  };

  log.message(data);
});

socket.on('update:list', function(list) {
  log.list(list);
});

socket.on('new:poke', function(info) {
  let option = {
    label: info.username,
    message: 'I Poked you dude!'
  };

  log.message(option);
});
// end of sockets

window.addEventListener('load', function(event) {
  client.state.register();
});