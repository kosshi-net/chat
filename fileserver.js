/* globals require, console*/
'use strict';
var http = require("http");
var fs = require("fs");
var mime = require('mime');

class FileServer {
	constructor(PORT){
		var server = http.createServer(this.handleRequest);

		server.listen(PORT, function(){
		    console.log("Server listening on: http://localhost:%s", PORT);
		});
	}

	handleRequest(request, response){
		var IP = request.connection.remoteAddress;




		// Request
		// Check for registered urls
		// Check for directory or file
		var dir = "./www" + request.url.split('?')[0];
		var code = 200;

		fs.access(dir, fs.F_OK, accessCallback_1);
		function accessCallback_1(err){
			if(err){
				dir = "./err/404.html"; 
				code = 404;
			}
			fs.stat(dir, statCallback_1);
		}
		function statCallback_1(err,stats){
			if(stats.isDirectory()){
				if( dir[dir.length-1] != "/" ){
					response.writeHead(302, { 
						'Content-Type': 'text/plain',
						'Location': (request.url.split('?')[0])+="/"
					});
					response.end("Redirecting...", 'utf-8');
					return;
				}
				dir += "index.html";
			}
			fs.access(dir, fs.F_OK, accessCallback_2);
		}
		var contentType;
		function accessCallback_2(err){
			if(err){
				dir = "./err/404.html"; 
				code = 404;
			}
			contentType = mime.lookup(dir);
			fs.readFile(dir, readFileCallback_1);
		}
		function readFileCallback_1(error, content) {
			if (error) throw "Error while reading file " +  dir;
			response.writeHead(code, { 'Content-Type': contentType });
			response.end(content, 'utf-8');

			var date = new Date();
			var t_h = ('0' + date.getHours()).slice(-2);
			var t_m = ('0' + date.getMinutes()).slice(-2);
			var t_s = ('0' + date.getSeconds()).slice(-2);
			var timestamp = "["+t_h+"."+t_m+"."+t_s+"]";
			console.log(`${timestamp} ${IP} ${code} ${request.url}`);

			return;
		}
	}
}


module.exports = FileServer;