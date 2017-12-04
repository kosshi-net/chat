'use strict';
const sha256 = require('sha256');

const mongosync = require('./mongosync.js');

class Storage{
	constructor(url){
		this.data = new mongosync(url);
	

	}
	random(length){
		var name = '';
		while(length--)
			name += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[ (Math.random()*64|0) ];
		return name;
	}

	newID(location, length){
		// DA2DB !
		length = length || 32;
		while(true){
			let id = this.random(length);
			if(!this.data.getObject(location, id)) return id;
		}
	}





	createRoom(name, owner){
		// DA2DB !
		let room = {
			id: this.newID('rooms'),
			users: [],
			name: name,
			messages: [],
			owner: owner
		};
		// this.data.rooms[room.id] = room;
		this.data.createObject('rooms', room);
		return room.id;
	}
	removeRoom(roomid){
		// DA2DB !
		if(!this.roomExists(roomid)) return false;
		// delete this.data.rooms[roomid];
		this.data.deleteObject('rooms', roomid);
	}
	getRoom(roomid){
		// DA2DB !
		// return this.data.rooms[roomid];
		return this.data.getObject('rooms', roomid);
	}
	roomExists(roomid){
		// DA2DB !
		if(this.getRoom(roomid)) 
			return true;
		return false;
	}
	roomGetUsers(roomid){
		if(!this.roomExists(roomid)) return false;
		return this.getRoom(roomid).users;
	}
	roomAddUser(roomid, userid){
		// DA2DB
		if(!this.roomExists(roomid)) return false;
		if(!this.userExists(userid)) return false;

		let room = this.getRoom(roomid);
		let user = this.getUser(userid);


		room.users.push(userid);
		user.rooms.push(roomid);
		

		this.data.updateObject( 'rooms', roomid, room );
		this.data.updateObject( 'users', userid, user );

		return true;
	}
	roomRemoveUser(roomid, userid){
		// DA2DB
		if(!this.roomExists(roomid)) return false;
		if(!this.userExists(userid)) return false;

		let room = this.getRoom(roomid);
		room.users = room.users.filter( (id)=>{ return id != userid; });

		let user = this.getUser(userid);
		user.rooms = user.rooms.filter( (id)=>{ return id != roomid; });
		console.log(104);
		console.log(room, user);
		this.data.updateObject( 'rooms', roomid, room );
		this.data.updateObject( 'users', userid, user );

		return true;
	}
	roomHasUser(roomid, userid){
		if(!this.roomExists(roomid)) return false;
		if(!this.userExists(userid)) return false;
		let users = this.getRoom(roomid).users;
		for (var i = 0; i < users.length; i++) if(users[i]==userid) return true;
		return false;

	}


	createInvite(roomid){
		// DA2DB !
		let invite = {
			id: this.newID('invites', 8),
			room: roomid
		};
		// this.data.invites[invite.id] = invite;
		this.data.createObject( 'invites', invite );
		return invite.id;

	}

	getInvite(invite){
		// DA2DB !
		// return this.data.invites[invite];
		return this.data.getObject('invites', invite);
	}

	inviteExists(invite){
		if(this.getInvite(invite)) 
			return true;
		return false;
	}

	removeInvite(invite){
		// DA2DB !
		// delete this.data.invites[invite];
		return this.data.deleteObject('invites', invite);
	}





	login(email, password){
		if(password){
			let id = this.usersFindEmail(email);
			if(!id) return false;
			let user = this.getUser(id);
			if ( sha256(user.salt+password) == user.password ) return id;
			return false;
		} else {
			let id = this.usersFindToken(email);
			if(!id) return false;
			return id;
		}
	}
	createUser(email, password, name){
		// DA2DB
		let user = {
			id: this.newID('users'),
			name: name,
			email: email,

			rooms:[],

			state:'offline',

			salt: this.random(8),
			password: null,

			token: null,
		};
		user.password = sha256(user.salt+password);
		user.token = this.createToken();
		// this.data.users[user.id] = user;

		this.data.createObject('users', user);

		return user.id;
	}
	getUser(id){
		// DA2DB
		return this.data.getObject('users', id);
	}

	userSetState(id, state){
		if(!this.userExists(id)) return false;

		let user = this.getUser(id);
		user.state = state;

		this.data.updateObject( 'users', id, user );

		return true;
	}

	userExists(id){
		if(this.getUser(id)) 
			return true;
		return false;
	}
	usersFindEmail(email){
		// DA2DB
		let a = this.data.getObject('users', undefined, {email:email});
		if(a)
			return a.id;
		return false;

	}
	usersFindToken(token){
		// DA2DB
		let a = this.data.getObject('users', undefined, {token:token});
		if(a)
			return a.id;
		return false;
	}
	createToken(){
		while(true){
			let token = this.random(64);
			if(!this.usersFindToken(token)) return token;
		}
	}






}

module.exports = Storage;