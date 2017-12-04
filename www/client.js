'use strict';
class Client{
	constructor(args){
		this.connected = false;
		this.observer = new Observer();
		this.callbackStack = {};
		this.display = new Display(this);

		this.userid = '';

		this.userNameCache = new Cache();
		this.roomNameCache = new Cache();


		this.observer.bind('connected', ()=>{
			this.display.viewLoading();
			if(localStorage.token){
				let req = {
					method:'login',
					data:[localStorage.token]
				};
				this.send(req, (data)=>{
					if(!data[1]){
						this.display.viewLogin();
						console.log('Token was invalid and deleted');
						delete localStorage.token;
					} else {
						localStorage.token = data[1];
						this.userid = data[2];
						console.log('Logged in with token');
						this.display.viewChat();
					}
				});
			} else {
				this.display.viewLogin();
			}

		});
		this.observer.bind('disconnected', ()=>{
			this.display.viewLoading();
			this.display.popup('Disconnected', 'Reload the page.');
		});


		this.display.observer.bind('login', (e)=>{
			let req = {
				method:'login',
				data:[e.email, e.password]
			};
			this.send(req, (data)=>{
				if(!data[1]){
					this.display.viewLoginError('Failed.');
				} else {
					this.userid = data[2];
					localStorage.token = data[1];
					this.display.viewChat();
				}
			});
		});


		this.display.observer.bind('register', (e)=>{
			let req = {
				method:'register',
				data:[e.email, e.password, e.name]
			};
			this.send(req, (data)=>{
				if(!data[1]){
					this.display.viewRegisterError('Email occupied.');
				} else {
					localStorage.token = data[2];
					this.display.viewChat();
				}
			});
		});


		this.display.observer.bind('createroom', (e)=>{
			let req = {
				method:'createroom',
				data:[e]
			};console.log(e);
			this.send(req, (data)=>{
				if(data[0]){
					throw data;
				} else {
					console.log('Created room?', data);
					this.display.observer.fire('roomupdaterequest');
				}
			});
		});


		this.display.observer.bind('leaveroom', (e)=>{
			let req = {
				method:'leaveroom',
				data:[e]
			};console.log(e);
			this.send(req, (data)=>{
				if(data[0]){
					throw data;
				} else {
					// console.log('Created room?', data);
					// this.display.observer.fire('roomupdaterequest');
					location.reload();
				}
			});
		});


		this.display.observer.bind('roomupdaterequest', (e)=>{
			let req = {
				method:'getrooms',
				data:[]
			};
			this.send(req, (data)=>{
				this.display.roomListUpdate(data[1]);
				for(let i = 0; i < data[1].length; i++){
					req = {
						method:'getroom',
						data:[data[1][i]]
					};
					this.send(req, (data)=>{
						console.log(data);
						if(data[1].owner == this.userid) console.log('I AM THE OWNER');
						this.roomNameCache.set(data[1].id, data[1].name);
						setTimeout(()=>this.display.roomUpdate(data[1]),100);
					});
				}
			});
		});

		this.display.observer.bind('roomclick', (e)=>{
			console.log(e);
		});

		this.display.observer.bind('sendmessage', (e)=>{

			let req = {
				method:'sendmessage',
				data:[e[0],e[1]]
			};
			this.send(req, (data)=>{

			});
			
		});

		this.display.observer.bind('createinvite', (roomid)=>{
			let req = {
				method:'createinvite',
				data:[roomid]
			};
			console.log(roomid);
			this.send(req, (data)=>{
				if(data[0]){
					this.display.popup('Error!', data[0]);
				} else {
					this.display.popup('Invite created', `This link can only be used once: 
						<input type="text" disabled value="${location.href.replace('#','')}?${data[1]}">

						`);
				}
				
			});
		});

		this.display.observer.bind('useinvite', (e)=>{
			let req = {
				method:'useinvite',
				data:[e]
			};
			console.log('Using Invite', e);
			this.send(req, (data)=>{
				if(data[0]){
					this.display.popup('Error!', data[0]);
				} else {
					this.display.popup('Success', 'Invite used!');
					this.display.observer.fire('roomupdaterequest');
				}
				
			});
		});

	}
	random(length){
		var name = '';
		while(length--)
			name += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[ (Math.random()*64|0) ];
		return name;
	}


	connect(ip){
		this.socket = new WebSocket("ws://"+ip,"chat");
		this.socket.binaryType = "arraybuffer";

		this.socket.onopen = function(e) {
			console.log("[WEBSOCKET] Open");
			console.log(e);
			this.observer.fire('connected');

			this.connected = true;
		}.bind(this);

		this.socket.onerror = function(e) {
			console.log("[WEBSOCKET] Error" );
			console.log(e);
			this.observer.fire('disconnected');
			this.observer.fire('error');
			this.connected = false;
		}.bind(this);

		this.socket.onclose = function(e) {
			console.log("[WEBSOCKET] Close" );
			console.log(e);
			this.observer.fire('disconnected');
			this.connected = false;
		}.bind(this);

		this.socket.onmessage = this.handle.bind(this);

	}




	send(request, callback){
		if(callback){
			request.id = this.random(16);
			this.callbackStack[request.id] = callback;
		}
		this.socket.send(JSON.stringify(request));
	}

	handle(e){
		let packet = JSON.parse(e.data);
		switch(packet.method){
			case 'response':
				this.callbackStack[packet.id](packet.data, packet.code);
				break;

			case 'messageevent':
				console.log(packet);
				this.resolveUserName(packet.data[1], (name)=>{
					var date = new Date();
					var t_h = ('0' + date.getHours()).slice(-2);
					var t_m = ('0' + date.getMinutes()).slice(-2);
					var t_s = ('0' + date.getSeconds()).slice(-2);
					let e = {
						author: name,
						room: packet.data[0],
						content: packet.data[2],
						color: this.intToRGB(this.hash(packet.data[1])),
						timestamp: t_h+"."+t_m+"."+t_s
					}
					this.display.newMessage(e);
				});
				break;
			case 'roomchange':
				console.log('ayylmao');
				this.display.roomUpdate(packet.data[0]);
				break;

		}
	}

	hash(str){
	    var hash = 0;
	    for (var i = 0; i < str.length; i++) {
	       hash = str.charCodeAt(i) + ((hash << 5) - hash);
	    }
	    return hash;
	} 

	intToRGB(i){
	    var c = ((i | 0x101010) & 0x00FFFFFF)
	        .toString(16)
	        .toUpperCase();

	    return "00000".substring(0, 6 - c.length) + c;
	}


	resolveRoomName(id, callback){

		let name = this.roomNameCache.get(id);

		if(name) {callback(name);} else {

			let req = {
				method:'getroom',
				data:[id]
			};
			this.send(req, (data)=>{
				name = data[1].name;
				this.roomNameCache.set(id, name);
				callback(name);
			});
		}
	
	}
	resolveUserName(id,callback){
	

		let req = {
			method:'getuser',
			data:[id]
		};
		this.send(req, (data)=>{
			let user = data[1];
			name = user.name;
			this.userNameCache.set(id, name);
			callback(name, (user.state=='online') ? this.intToRGB(this.hash(id)) : '#222222');
		});
	}
	

}

let client;

window.onload = function(){
	client = new Client();
	client.connect(window.location.hostname+':8080');
}




