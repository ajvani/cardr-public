// bizzcard-d9c3c

// Imports
var fs = require('fs');
var google = require('googleapis');
var Vision = require('@google-cloud/vision');
var Storage = require('@google-cloud/storage');
var dotenv = require('dotenv');

// google vision
var storage = Storage();

var vision = Vision({
	projectId: 'bizzcard-d9c3c',
	keyFileName: 'keyauth.json'
});

var path = require('path');

// Getting usable file
var image = fs.readFileSync('assets/card1.jpg');
var buffered = new Buffer(image, 'base64');

// reading document
vision.readDocument(buffered, function(err, results, apiResponse) {
	console.log(apiResponse);
	if (err) {
		console.log(err);
		return;
	}
	
	// Creating data array
	var data = []; 
	var nums = [];
	var buff = ""; 

	count = 0
	for (var text of results) {
		if (text == '\n') {
			nums.push(strip_chars(buff))
			data.push(buff); 
			buff = "";
			count++; 
		} else {
			buff += text; 
		}
	}

	var data_start_length = data.length; 

	for (var text of data) {
		var word = '';

		for (var i = 0; i < text.length; i++) {
			var c = text.charAt(i); 
			if (c != ' ') {
				word += c; 
			} else {
				data.push(word);
				word = '';	
			}
		}
		if (!data.includes(word)) {
			console.log(word);
			data.push(word);
		}
	}

	var result = {
		"name": "",
		"phone": "",
		"company": "", 
		"email": ""
	};

	var emails = []; 
	var numbers = [];

	for (var text of data) {
		analyze(text, emails); 
	}

	for (var array of nums) {
		for (var text of array) {
			if (text.length == 11 || text.length == 10) {
				if (result['phone'] == '') {
					// only using first number
					result['phone'] = text; 
					break;
				}
			}
		}
	}
	if (emails == null) {
		result['email'] = null; 
	} else {
		result['email'] = emails[0];
	}
	result['company'] = company_parser(data,emails[0]);
	result['name'] = name_parser(data,emails[0], data_start_length);

    console.log(result);
}); 

function name_parser(data, email, data_start_length) {
	if (email == null) {
		return null; 
	}

	var marker;

	for (var i = 0; i < email.length; i++) {
		if (email.charAt(i) == '@') {
			marker = i;
			break; 
		}
	}

	for (var i = marker-1; i >= 0; i--) {
		var text = email.substring(i, marker).toUpperCase();
		for (var j = 0; j < data_start_length; j++) {
			var curr = data[j];
			var buff = ''; 
			for (var k = 0; k < curr.length; k++) {
				var c = curr.charAt(k); 
				if (c != ' ') {
					buff += c; 
				} else {
					if (buff.toUpperCase() === text) {
						console.log(curr);
						return curr; 
					}
					buff = '';
				}
			}
			if (buff.toUpperCase() === text) {
				console.log(curr);
				return curr; 
			}
		}
	}

	return null;
}

function company_parser(data,email) {
	var start, end; 
	if (email == null) {
		return null; 
	}
	for (var i = 0; i < email.length; i++) {
		if (email.charAt(i) == '@') {
			start = i; 
		}
		if (email.charAt(i) == '.') {
			end = i; 
			break;
		}
	}

	var possible = email.substring(start+1, end).toUpperCase();
	
	if (data.includes(possible)) {
		return possible;
	} 

	for (var text of data) {
		var word = ''
		for (var i = 0; i < text.length; i++) {
			var c = text.charAt(i); 
			if (c != ' ') {
				word += c; 
			} else {
				if (word.toUpperCase() === 'INC'
					|| word.toUpperCase() === 'INC.') {
					return word; 
				}
				word = ''; 
			}
		}
		if (word.toUpperCase() === 'INC'
			|| word.toUpperCase() === 'INC.') {
			return text; 
		}
	}

	return null; 
}

function strip_chars(text) {
	var stripped = [];
	var buff = '' 
	for (var i = 0; i < text.length; i++) {
		var c = text.charAt(i); 
		if ((c >= '0' && c <= '9') || c == ' '
			|| c == '(' || c == ')' || c == '-') {

			if (!(c == ' ' || c == '(' 
				|| c == ')' || c == '-')) {

				buff += c; 
			}
		} else {
			if (buff != '') {
				stripped.push(buff); 
				buff = '';
			}
		}		
	}

	stripped.push(buff); 

	for (var i = 0; i < stripped.length; i++) {
		stripped[i] = strip_white(stripped[i]);
	}

	return stripped
}

function strip_white(text) {
	var buff = ''; 
	for (var i = 0; i < text.length; i++) {
		var c = text.charAt(i);
		if (c != ' ') {
			buff += c; 
		}
	}
	return buff; 
}

function analyze(word, emails) {
	if (typeof word == "undefined") {
		return; 
	}

	if (word.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g)) {
		emails.push(word.toLowerCase());
	}
}
