require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const fs = require("fs");
const app = express();

const dbKey = process.env.DB_KEY;
const maxLength = process.env.MAX_NAME_LENGTH ?? 256;
const PORT = process.env.PORT ?? 3000;

// for parsing application/json
app.use(bodyParser.json()); 

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true })); 
//form-urlencoded

// for parsing multipart/form-data
app.use(upload.array()); 
app.use(express.static('public'));

app.get('/playlist/*', (req, res) => {
  var name = req.path.substring(10);

  if (!validateName(name)) {
    res.status(400);
    res.redirect("/?error=invalidName");
    return;
  }
  var contents = fs.readFileSync(__dirname + '/html/playlist.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);

  res.send(contents);
});
app.get('/request/*', (req, res) => {
  var name = req.path.substring(10);

  if (!validateName(name)) {
    res.status(400);
    res.redirect("/?error=invalidName");
    return;
  }
  var contents = fs.readFileSync(__dirname + '/html/request.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);

  res.send(contents);
});
app.get('/playlistData/*', (req, res) => {
  var name = req.path.substring(14);

  if (!validateName(name)) {
    res.status(400);
    res.send({error: "INVALID_NAME", name: name, songs: [], requests: []});
    return;
  }
  
  res.send({error: "", name: name, songs: [], requests: []});
});

app.post("/updatePlaylist/*", (req, res) => {
  var name = req.path.substring(14);
  if (!validateName(name)) {
    res.status(400);
    res.send("INVALID_NAME");
    return;
  }

  

  res.status(200);
  res.send("OK");
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/html/' + req.path);
});

app.post("/createPlaylist", (req, res) => {
  var name = req.body.playlistName;

  if (!validateName(name)) {
    res.redirect("/?error=invalidName");
    return;
  }
  
  res.redirect("/playlist/" + name);
});

app.listen(PORT, () => {
  console.log('Started on port ' + PORT);
});

var allowedChars = process.env.ALLOWED_NAME_CHARS ?? "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";

function validateName(name) {
  // return true if the name is between 1 and 256 alphanumeric or space characters
  if (name.length < 1 || name.length > maxLength) {
    return false;
  }

  for (let i = 0; i < name.length; i++) {
    let c = name[i];
    if (allowedChars.indexOf(c) == -1) {
      return false;
    }
  }
  return true;
}

module.exports = app;