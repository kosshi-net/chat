'use strict';
class Cache {
	constructor(){
		this.data = [];
	}

	set(key, value){
		this.data[key] = value;
	};

	get(key){
		return this.data[key];
	}
}