/**
 * Created by totor on 2017-11-19.
 */

/**
 * Created by heungseok2 on 2017-03-02.
 */

var express = require('express');
var app = express();
var http = require('http').Server(app);
// var world = require('./js/server_world');

app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/data', express.static(__dirname + '/data'));
app.use('/images', express.static(__dirname + '/images'));
app.use('/lib', express.static(__dirname + '/lib'));


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


http.listen(7777, function(){
    console.log("Server Running and Listen to port 7777");
});