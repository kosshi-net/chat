'use strict';
let Server = require('./server.js').Server;
const readline = require('readline');



let server = new Server();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', (msg) => {
	let cmd = msg.split(' ');
	let arg = "";

	{
		let _arg = msg.split(' ');
		for (let i = 1; i < _arg.length; i++) 
			arg += _arg[i] + " ";
	}

	switch(cmd[0]){
		case "exit":
		case "stop":
		case "close":
		case "end":
			console.log("Stopping...");
			process.exit(0);
			break;
		case "eval":
			/* jshint ignore:start */
			try {
				eval(arg);
			} catch( err ){
				console.log(err);
			}
			/* jshint ignore:end */
			break;
		default:
			console.log("Invalid command", cmd);
			break;
	}
});


