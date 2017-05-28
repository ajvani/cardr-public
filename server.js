var firebase = require("firebase");
var express = require("express");
var path = require('path');
var compress = require('compression');
var bodyParser = require('body-parser');
var request = require('request');
var sparkpost = require('sparkpost');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var google = require('googleapis');
var Vision = require('@google-cloud/vision');
var Storage = require('@google-cloud/storage');

// google vision
var storage = Storage();

var vision = Vision({
    projectId: 'bizzcard-d9c3c',
    keyFileName: 'keyauth.json'
});

require('dotenv').load();

var client = new sparkpost(process.env.SPARKPOST_KEY);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(compress());
app.use(fileUpload());
app.set('port', (process.env.PORT || 3000));
//app.use(express.static('../public/', {index: 'manual.html'}))
//app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'public'), {index: 'login.html'}));
//app.use('/public', express.static('public'));

var config = {
    apiKey: process.env.FIREBASE_KEY,
    authDomain: "bizzcard-d9c3c.firebaseapp.com",
    databaseURL: "https://bizzcard-d9c3c.firebaseio.com",
    projectId: "bizzcard-d9c3c",
    storageBucket: "bizzcard-d9c3c.appspot.com",
    messagingSenderId: "887702527695"
};


firebase.initializeApp(config);

var database = firebase.database();

app.post('/cardInfo', function(req, res) {
    var arr = req.body;
    console.log(arr);
    database.ref('events/' + req.body.event).push({
        name: req.body.name,
        title: req.body.title,
        company: req.body.company,
        phone: req.body.phone,
        email: req.body.email
    });
    res.redirect('/main')
});

app.post('/upload', function(req, res) {
  console.log(req.files.sampleFile.data)
  var buffered = req.files.sampleFile.data;

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

    // upload result to firebase

    // callback (result obj that has id) {
        // redirect to /edit/:id (make a new route)
    // }
 
     database.ref('events/Bitcamp').push({
        name: result['name'],
        title: '',
        company: result['company'],
        phone: result['phone'],
        email: result['email']
    });
    res.redirect('/main');
}); 



  
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

    return possible; 
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


app.post('/sendMail', function(req, res) {
    console.log(req.body)

    var carrier = req.body.info[6];
    var phoneSendTo = req.body.info[5];
    var phone = req.body.info[4];
    var email = req.body.info[3];
    var title = req.body.info[2];
    var company = req.body.info[1];
    var name = req.body.info[0];

    var carrierEnd = ""
    if (carrier == 'ATT') {
        carrierEnd = '@mms.att.net'
    } else if (carrier == 'T-Mobile') {
        carrierEnd = '@tmomail.net'
    } else {
        carrierEnd = '@vtext.com'
    }

    client.transmissions.send({
            options: {
                sandbox: true
            },
            content: {
                from: 'testing@sparkpostbox.com',
                subject: 'The Contact Information',
                text: name + "\n" + company + "\n" + title + "\n" + email + "\n" + phone,
            },
            recipients: [
                { address: phoneSendTo + carrierEnd }
            ]
        })
        .then(data => {
            console.log('Woohoo! You just sent your first mailing!');
            console.log(data);
        })
        .catch(err => {
            console.log('Whoops! Something went wrong');
            console.log(err);
        });
})

app.get('/search/:event', function(req, res) {
    var company = req.params.event;
    request('https://bizzcard-d9c3c.firebaseio.com/.json?print=pretty&format=export', function(error, response, body) {
        console.log('error:', error); // Print the error if one occurred 
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
        //console.log('body:', body); // Print the HTML for the Google homepage. 
        var js = JSON.parse(body);
        res.send(js);
    });
})

app.get('/getInfo', function(req, res) {
    request('https://bizzcard-d9c3c.firebaseio.com/.json?print=pretty&format=export', function(error, response, body) {
        console.log('error:', error); // Print the error if one occurred 
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received 
        //console.log('body:', body); // Print the HTML for the Google homepage. 
        var js = JSON.parse(body);

        res.send(js);
        // var arr = [];
        // for (var e in js.events) {
        //     arr.push(e)
        // }
        // for (var i in arr) {
        //  var eventObj = js.events[arr[i]];
        //  console.log('The Name of the Event is: ' + arr[i]);
        //  var keysArr = Object.keys(eventObj);
        //  for(var a in keysArr){
        //      var card = eventObj[keysArr[a]];
        //      console.log(card.name);
        //  }
        //  console.log();
        // }
    });
})


app.get('/manual', function(req, res) {
    res.sendFile('/public/manual.html', { root: __dirname });
});

app.get('/main', function(req, res) {
    res.sendFile('/public/index.html', { root: __dirname });
});

app.get('/', function(req, res) {
    res.sendFile('/public/login.html', { root: __dirname });
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

//writeCardInformation("Career Fair");