'use strict';

var deasync = require('deasync');
var MongoClient = require('mongodb').MongoClient, assert = require('assert');
const sleeptime = 5;

class Database{
	constructor(url){
		this.url = url || 'mongodb://192.168.10.24:27017/haaarchat';

	}

	getObject(location, id, altsearch, callback) {
		let returnvalue;
		altsearch = altsearch || {id:id};
		console.log(`Searching ${JSON.stringify(altsearch)} in ${location}`);
		MongoClient.connect(this.url, function(err, db) {
			var collection = db.collection(location);
			collection.find( altsearch ).toArray((err, result)=>{
				if(err) throw err;
				assert.equal(err, null);
				db.close();
				returnvalue = (result.length) ? result[0] : undefined;
				console.log('Found ' + result.length);
				if(callback) callback(returnvalue);
			});
		});
	}

	updateObject(location, id, data, callback){
		if(!id) throw 'err' ;
		console.log(`Writing ${id} in ${location}`);

		MongoClient.connect(this.url, function(err, db) {
			var collection = db.collection(location);

			collection.update({id: id}, data , (err, result)=>{
				if(err) throw err;
				assert.equal(err, null);
				db.close();
				if(callback) callback();
			});
		});
	}

	createObject(location, data, callback){
		console.log(`Creating in ${location}`);
		MongoClient.connect(this.url, function(err, db) {
			var collection = db.collection(location);

			collection.insert( data , (err, result)=>{
				if(err) throw err;
				assert.equal(err, null);
				db.close();
				if(callback) callback();
			});
		});
	}

	deleteObject(location, id, callback){
		console.log(`Deleting ${id} in ${location}`);
		MongoClient.connect(this.url, function(err, db) {
			var collection = db.collection(location);

			collection.deleteMany( {id:id} , (err, result)=>{
				if(err) throw err;
				assert.equal(err, null);
				db.close();
				if(callback) callback();
			});
		});
	}

}


module.exports = Database;