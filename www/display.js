'use strict';

class Display{
	constructor(main){
		this.observer = new Observer();

		this.main = main;

		this.currentRoom = '';

		this.viewLoading();

		this.roomHTML = [];
		this.roomUserlistHTML = [];


	}

	viewLogin(){
		document.body.innerHTML = `
			
				<div class="login">
					<input type="email"		id="email"		placeholder="Email">
					<input type="password" 	id="password"	placeholder="Password">
					<a id="to_register" href="#">Not registered?</a>
					<button id='login'>Login!</button>
				</div>
			
		`;
		document.querySelector('#to_register').onclick = ()=>{
			this.viewRegister();
		};
		document.querySelector('#login').onclick = ()=>{
			let email = document.querySelector('#email').value;
			let password = document.querySelector('#password').value;
			this.observer.fire('login', {email:email,password:password});
		};
	}
	viewLoginError(error){
		let button = document.querySelector('button#login');
		let _html = button.innerHTML;
		button.innerHTML = error;
		setTimeout(()=>{
			button.innerHTML=_html;
		}, 1000);
	}

	viewRegister(){
		document.body.innerHTML = `
				<div class="register">
					<input type="name"		id="name" 		placeholder="Name">
					<input type="email"		id="email"		placeholder="Email">
					<input type="password" 	id="password"	placeholder="Password">
					<input type="password" 	id="password2"  placeholder="Confirm password">
					<a id="to_login" href="#">Already registered?</a>
					<button id='register'>Register!</button>
				</div>
		`;
		document.querySelector('#to_login').onclick = ()=>{
			this.viewLogin();
		};
		document.querySelector('#register').onclick = ()=>{
			let email = document.querySelector('#email').value;
			let name = document.querySelector('#name').value;
			let password = document.querySelector('#password').value;
			let password2 = document.querySelector('#password2').value;
			if(password != password2){
				this.viewRegisterError('Passwords don\'t match');
				return;
			}
			this.observer.fire('register', {email:email,name:name,password:password});
		};
	}

	viewRegisterError(error){
		let button = document.querySelector('button#register');
		let _html = button.innerHTML;
		button.innerHTML = error;
		setTimeout(()=>{
			button.innerHTML=_html;
		}, 1000);
	}

	viewLoading(){
		document.body.innerHTML = `
			<div class="loading">
				
			</div>
		`;
	}
	
	roomListUpdate(rooms){
		let domrooms = document.querySelector('#rooms');
		if(!domrooms) return;
		console.log(rooms);

		while (domrooms.firstChild) {
			domrooms.removeChild(domrooms.firstChild);
		}

		for (let i = 0; i < rooms.length; i++) {
			let child = document.createElement('button');
			child.id = rooms[i];
			child.innerHTML = 'Loading...';
			child.className = 'room clickable';
			child.onclick = ()=>{ 
				console.log('click', this, child.id); 
				this.roomClick(child.id);
			};
			domrooms.appendChild(child);
		}

	}
	roomUpdate(room){
		let domroom = document.getElementById(room.id);
		if(!domroom) return;

		console.log(room.users);


		this.roomUserlistHTML[room.id]='';

		for (var i = 0; i < room.users.length; i++) {
			this.main.resolveUserName(room.users[i], (name, color)=>{
				this.roomUserlistHTML[room.id] += `<div class='user' style='color:#${color}'>${name}</div>`;
				if(this.currentRoom == room.id) this.roomClick(room.id);
			});
		}

		console.log(room, domroom);

		domroom.innerHTML = '#'+room.name;

		// if(this.currentRoom == room.id) this.roomClick(room.id);

	}

	roomClick(id){
		this.observer.fire('roomclick', id);
		this.currentRoom = id;

		let rooms = document.querySelectorAll('.room');
		for (var i = 0; i < rooms.length; i++) {
			rooms[i].className = 'room clickable';
		}

		document.getElementById(id).className = 'room selected';

		document.querySelector('.bottom').style.display = '';

		let messages = document.querySelector('.messages');
		if(!this.roomHTML[id]) this.roomHTML[id] = '';
		messages.innerHTML = this.roomHTML[id];


		let button = document.querySelector('.bottom > button');
		let input = document.querySelector( '.bottom > input');
		
		this.main.resolveRoomName(id, (name)=>{
			input.placeholder = `Talk in #${name}`;
		});
		

		button.onclick = send.bind(this);
		input.onkeydown = send.bind(this);

		function send(e){
			if(e.key && e.key != 'Enter') return;
			if(input.value.trim() === '') return;

			this.observer.fire('sendmessage', [id, input.value] );
			input.value = '';
		}


		document.querySelector('.userlist').innerHTML = this.roomUserlistHTML[id];


	}

	newMessage(e){
			
		if(!this.roomHTML[e.room]) this.roomHTML[e.room] = '';

		let messages = document.querySelector('.messages');

		// let message = document.createElement('div');

		let message = `<div class="message">${e.timestamp} - &lt;<span style='color:#${e.color};'>${e.author}</span>&gt; ${e.content}</div>`;

		this.roomHTML[e.room]+=message;




		// message.className = 'message';
		// message.innerHTML = `&lt;<span style='color:#${color};'>${author}</span>&gt; ${content}`;

		// messages.appendChild(message);

		if(e.room != this.currentRoom) return; 

		messages.innerHTML = this.roomHTML[e.room];
		messages.scrollTop+=22;
	}	

	popup(title, content){

		let div = document.createElement('div');
		div.innerHTML = `
			<div class='popup'>
			<h1>${title}</h1>
			<br>${content}
			<button onclick=' let div = document.querySelector(".backdrop"); document.body.removeChild(div); '>Close</button>
			</div>
			`;
		div.className = 'backdrop';

		document.body.appendChild(div);

	}

	viewChat(){
		document.body.innerHTML = `
			<div class='top'>
				

				<div id="rooms" class='rooms'>

				</div>
				<div id="createRoom">
					<input type="text"><button>Create</button>
				</div>

				<div class='sysctrl'>
					<i class="material-icons noselect clickable add">add 						</i>
					<i class="material-icons noselect clickable delete">delete					</i>
					<i class="material-icons noselect clickable share">share					</i>
					<i class="material-icons noselect clickable logout">power_settings_new		</i>
				</div>



			</div>

			<div class='middle'>
				<div class='messages'>
					<center>Join a room to start talking!</center>
				</div>
				<div class='userlist'
				</div>
			</div>

			<div class='bottom'>
				<input type="text" placeholder='Pick or join a room to start talking!'>
				<button class='clickable'>Send</button>
			</div>
			
		`;

		document.querySelector('.bottom').style.display = 'none';

		let code = location.href.split('?');
		if(code[1]){
			this.observer.fire('useinvite', code[1]);
			window.history.pushState('Chat', 'Chat', './');
		}


		document.querySelector('.rooms').addEventListener('wheel', (e)=>{document.querySelector('.rooms').scrollLeft+=e.deltaY})
		// document.querySelector('#createRoom > button').onclick = ()=>{
			// this.observer.fire('createroom', document.querySelector('#createRoom > input').value);
		// };

		document.querySelector('.add').onclick = ()=>{
			this.popup('Create room', `<input id="roomname" placeholder="Room name"></input><br><button id="createroom">Create room</button>`);
			document.querySelector('#createroom').onclick = ()=>{
				this.observer.fire('createroom', document.querySelector('#roomname').value);
				let div = document.querySelector(".backdrop"); 
				document.body.removeChild(div);
			};
		}

		document.querySelector('.delete').onclick = ()=>{
			this.popup('Leave room', `Are you sure?<br><button id="leaveButton">Leave room</button>`);
			document.querySelector('#leaveButton').onclick = ()=>{
				this.observer.fire('leaveroom', this.currentRoom);
				let div = document.querySelector(".backdrop"); 
				document.body.removeChild(div);
			};
		}

		// document.querySelector('#useInvite').onclick = ()=>{
		// 	this.observer.fire('useinvite', document.querySelector('#inviteCode').value);
		// };

		document.querySelector('.share').onclick = ()=>{
			this.observer.fire('createinvite', this.currentRoom);
		};

		document.querySelector('.logout').onclick = ()=>{
			delete localStorage.token;
			location.reload();
		};

		this.observer.fire('roomupdaterequest');
	}
}