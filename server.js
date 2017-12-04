'use strict';
const http = require('http');
const Storage = require('./database.js');
const FileServer = require('./fileserver.js');
const WebSocketServer = require('websocket').server;
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));

class Server {
	constructor(){
		this.wshttp = http.createServer(function(request, response) {
			response.writeHead(404); response.end();
		});

		this.wshttp.listen(8080, function() {
			console.log('Server is listening on port 8080');
		});

		this.ws = new WebSocketServer({
			httpServer: this.wshttp,
			autoAcceptConnections: false
		});

		this.peers = {};

		this.ws.on('request', function(request) {

			let wantedprotocol = "chat";

			if ( request.requestedProtocols[0] != wantedprotocol ) { 
				request.reject();
				console.log('Connection from origin ' + request.origin + ' rejected.');
				return;
			}		

			let id = Math.round(0xFFFFFFFF*Math.random());

			this.peers[id] = new Peer({
				socket:request.accept(wantedprotocol, request.origin),
				id:id,
				main:this
			});
			
			console.log('Connection from origin ' + request.origin + ' accepted.');


		}.bind(this));


		this.storage = new Storage(config.mongodb_url);


		if(config.enable_file_server){
			this.fileserver = new FileServer(config.file_server_port);
		}


		// setInterval(()=>{
		// 	for(let key in this.peers){
		// 		let peer = this.peers[key];
		// 		if(peer.user) {
		// 			let user = this.storage.getUser(peer.user);
		// 			if(user.state != 'online') {
		// 				this.storage.userSetState(peer.user, 'online');		
		// 				user.userChangeRooms(user.id);
		// 			}
		// 		} 
		// 	}
		// }, 5000);

	}
}

class Peer{
	constructor(args){
		this.main = args.main;
		this.id = args.id;
		this.socket = args.socket;

		this.socket.on('message', this.handlePacket.bind(this));
		this.socket.on('close', this.handleClose.bind(this));

		this.user = null;

		console.log("Socket " + this.id + "created");
	}
	parseJSON(string){
		let json = {};
		try{
			json = JSON.parse(string);
		}catch(e){
			console.log('Client sent a bad request.');
			console.log(e);
		}
		return json;
	}

	handlePacket(message){
		if (message.type !== 'utf8') return;

		
		let req = this.parseJSON(message.utf8Data);



		let storage = this.main.storage;

		let res = {
			method: 'response',
			data: [null],
			code: 200,
			id: req.id
		};

		if(!req.method || typeof req.data != 'object') this.method = 'none';
		let room, invite, user;

		for (var i = 0; i < req.data.length; i++) {
			req.data[i] = req.data[i].replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
		}

		switch (req.method){

			case 'login':
				let id = storage.login(req.data[0],req.data[1]);

				res.data[1] = false;
				if(id){
					res.data[2] = id;
					res.data[1] = storage.getUser(id).token;
					console.log(id);
					this.user = id;
					storage.userSetState(id, 'online');
					this.userChangeRooms(this.user);
				} 
				break;

			case 'register':
				let email = req.data[0];
				let password = req.data[1];
				let name = req.data[2];
				if(storage.usersFindEmail(email)){
					res.data[0] = 'Email already registered!';
					res.data[1] = false;
				} else {
					let id = storage.createUser( email, password, name );
					res.data[2] = id;
					res.data[1] = storage.getUser(id).token;
					this.user = id;
					storage.userSetState(id, 'online');
					this.userChangeRooms(this.user);
				}
				break;

			case 'createroom':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}
				room = storage.createRoom(req.data[0], this.user);
				storage.roomAddUser(room, this.user);
				this.roomChangeEvent(room.id);
				res.data[1] = room;
				break;

			case 'createinvite':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}
				room = storage.getRoom(req.data[0]);
				if(!room || room.owner != this.user) {
					res.code = 403; res.data[0] = "Forbidden or not found."; break;
				}

				invite = storage.createInvite(room.id, this.user);
				res.data[1] = invite;
				break;

			case 'useinvite':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}
				invite = storage.getInvite(req.data[0]);
				if(!invite) {res.code = 404; res.data[0] = "Not found."; break;}

				room = storage.getRoom(invite.room);
				storage.removeInvite(invite.id);

				if(!room) {res.code = 500; res.data[0] = "Server error. Invite points to an invalid room."; break;}
					
				storage.roomAddUser(room.id, this.user);
				this.roomChangeEvent(room.id);
				res.data[1] = room.id;
				break;

			case 'getrooms':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}

				let rooms = storage.getUser(this.user).rooms;

				res.data[1] = rooms;
				break;

			case 'leaveroom':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}

				res.data[1] = storage.roomRemoveUser(req.data[0], this.user);


				this.roomChangeEvent(req.data[0]);

				break;

			case 'sendmessage':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}


				room = storage.getRoom(req.data[0]);

				if(!room || !storage.roomHasUser(room.id, this.user)) {
					res.code = 403; res.data[0] = "Forbidden or not found."; break;
				}

				// SEND THE MESSAGE!

				for (let key in this.main.peers){
					let peer = this.main.peers[key];
					if(!peer.user) continue;
					if(storage.roomHasUser(room.id, peer.user)){
						peer.send( { method: 'messageevent', data: [ room.id, this.user, req.data[1] ] } );
					}
				}

				res.data[1] = '';
				break;

			case 'getroom':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}


				room = storage.getRoom(req.data[0]);

				if(!room || !storage.roomHasUser(room.id, this.user)) {
					res.code = 403; res.data[0] = "Forbidden or not found."; break;
				}

				res.data[1] = room;
				break;

			case 'getuser':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}


				user = storage.getUser(req.data[0]);

				if(!user) {
					res.code = 403; res.data[0] = "Forbidden or not found."; break;
				}

				console.log(user.id, user.state);

				res.data[1] = {
					id: user.id,
					name: user.name,
					state: user.state,
				};
				break;
			case 'getself':
				if(!this.user) {res.code = 403; res.data[0] = "Forbidden. You are not logged in."; break;}


				user = storage.getUser(this.user);

				if(!user) {
					res.code = 403; res.data[0] = "Forbidden or not found."; break;
				}

				res.data[1] = {
					id: user.id,
					name: user.name,
					state: user.state
				};
				break;

			default:
				res.data[0] = "Bad request";
				res.code = 400;
				break;
		}
		this.send(res);
	}

	userChangeRooms(userid){
		let storage = this.main.storage;
		let user = storage.getUser(userid);
		for (var i = 0; i < user.rooms.length; i++) {
			this.roomChangeEvent(user.rooms[i]);
		}
	}
	roomChangeEvent(roomid){
		let storage = this.main.storage;
		for (let key in this.main.peers){
			let peer = this.main.peers[key];
			if(!peer.user || peer.user == this.user) continue;
			if(storage.roomHasUser(roomid, peer.user)){
				peer.send( { method: 'roomchange', data: [storage.getRoom(roomid)] } );
			}
		}
	}

	handleClose(reasonCode, description) {
		console.log(' Peer ' + this.socket.remoteAddress + ' disconnected.');
		console.log(reasonCode, description);
		delete this.main.peers[this.id];
		this.main.storage.userSetState( this.user, 'offline');
		this.userChangeRooms(this.user);
	}

	send(msg){

		this.socket.send( JSON.stringify(msg) );

	}

}


module.exports.Server = Server;
module.exports.Peer = Peer;