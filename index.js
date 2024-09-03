require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const fs = require("fs");
const os = require("os");
const app = express();
const cookieParser = require('cookie-parser');
const qrcode = require('qrcode');

const maxLength = process.env.MAX_NAME_LENGTH ?? 256;
const PORT = process.env.PORT ?? 3000;

const videoTitles = {};
const playlists = {};
const playlistNames = [];
var ready = false;
var playlistsRemaining = 0;
dbRead("playlists").then(names => {

  if (Array.isArray(names) == false) {
    dbWrite("playlists", []);
  }

  names = [...new Set(names)];

  dbWrite("playlists", names);
  
  console.log("Loaded " + names.length + " playlists");


  var promises = [];

  playlistsRemaining = names.length;

  for (var i = 0; i < names.length; i++) {
    var promise = dbRead("playlist-" + names[i]);
    promises.push(promise);
    var j = i;
    promise.then(data => {
      playlists[data.name] = data; 
      console.log("Playlist " + data.name + " has " + playlists[names[j]].songs.length + " songs and " + playlists[names[j]].requests.length + " requests");
      playlistsRemaining --;
    });
    playlistNames.push(names[i]);
  }

  checkIfReady();
});

function checkIfReady() {
  if (playlistsRemaining == 0) {
    console.log("All playlists loaded");
    ready = true;
  } else {
    setTimeout(checkIfReady, 100);
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array()); 
app.use(express.static('public'));
app.use(cookieParser());

app.get('/playlist/*', (req, res) => {
  waitUntilReady(() => {
    var name = decodeURIComponent(req.path.substring(10));

    if (!validateName(name)) {
      res.status(400);
      res.redirect("/?error=invalidName");
      return;
    }
    var contents = fs.readFileSync(__dirname + '/html/playlist.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);

    res.send(contents);
  });
});
app.get('/playlistReadonly/*', (req, res) => {
  waitUntilReady(() => {
    var name = decodeURIComponent(req.path.substring(18));

    if (!validateName(name)) {
      res.status(400);
      res.redirect("/?error=invalidName");
      return;
    }
    var contents = fs.readFileSync(__dirname + '/html/playlistReadonly.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);

    res.send(contents);
  });
});
app.get('/request/*', (req, res) => {
  waitUntilReady(() => {
    var name = decodeURIComponent(req.path.substring(9));

    if (!validateName(name)) {
      res.status(400);
      res.redirect("/?error=invalidName");
      return;
    }

    if (playlists[name] == undefined) {
      res.status(404);
      res.redirect("/?error=playlistNotFound");
      return;
    }
    var contents = fs.readFileSync(__dirname + '/html/request.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);

    res.send(contents);
  });
});
app.get('/requestQR/*', (req, res) => {
  var name = decodeURIComponent(req.path.substring(11));

  if (!validateName(name)) {
    res.status(400);
    res.redirect("/?error=invalidName");
    return;
  }

  if (playlists[name] == undefined) {
    res.status(404);
    res.redirect("/?error=playlistNotFound");
    return;
  }
  
  var contents = fs.readFileSync(__dirname + '/html/requestQR.html', {encoding: 'utf-8'}).replace(/{playlistName}/g, name);
  var url = "https://" + req.headers.host + "/request/" + encodeURIComponent(name);
  qrcode.toDataURL(url, {scale: 20}, (err, qr) => {
    contents = contents.replace("{qrcode}", qr);
    contents = contents.replace("{qrcodeURL}", url);

    res.send(contents);
  });
});
app.get('/playlistData/*', (req, res) => {
  waitUntilReady(() => {
    var name = decodeURIComponent(req.path.substring(14));

    if (!validateName(name)) {
      res.status(400);
      res.send({error: "INVALID_NAME", name: name, songs: [], requests: []});
      return;
    }

    if (playlists[name] == undefined) {
      res.status(404);
      res.send({error: "NOT_FOUND", name: name, songs: [], requests: []});
      return;
    }
    
    res.send({error: "", name: name, songs: playlists[name].songs, requests: playlists[name].requests});
  });
});
app.get("/clearName", (req, res) => {
  res.send(__dirname + '/html/clearName.html');
});
app.get("/videoTitle/*", (req, res) => {
  var name = decodeURIComponent(req.path.substring(12));
  
  if (videoTitles[name] != undefined) {
    res.send(videoTitles[name]);
    return;
  }

  fetch("https://www.googleapis.com/youtube/v3/videos?key=AIzaSyBp8HnebL9IzdnEPmmfvkkt9vIhFmKc4bU&id=" + name + "&part=localizations").then(x => x.json()).then(x => {
    try {
      var title = x.items[0].localizations.en.title;
      videoTitles[name] = title;
      res.send(title);
    } catch {
      videoTitles[name] = "Not Found";
      res.send("Not Found");
    }
  });
});
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/html/' + req.path);
});
app.post("/videoTitle", (req, res) => {
  var ids = req.body.ids;

  if (Array.isArray(ids) == false) {
    ids = [ids];
  }

  var titles = {};
  var promises = [];

  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (videoTitles[id] != undefined) {
      titles[id] = videoTitles[id];
    } else {
      var promise = fetch("https://www.googleapis.com/youtube/v3/videos?key=AIzaSyBp8HnebL9IzdnEPmmfvkkt9vIhFmKc4bU&id=" + id + "&part=localizations").then(x => x.json());

      
      var j = i;
      promises.push(
      promise.then(x => {
        try {
          var id = x.items[0].id;
          try {
            var title = x.items[0].localizations.en.title;
            videoTitles[id] = title;
            titles[id] = title;
          } catch {
            videoTitles[id] = "Untitled (API Error)";
            titles[id] = "Untitled (API Error)";
          }
        } catch {
          videoTitles[id] = "Video Not Found (API Error)";
          titles[id] = "Video Not Found (API Error)";
        }
      }));
    }
  }
  Promise.all(promises).then(x => {
    res.send(titles);
  });
});
app.post("/updatePlaylist/*", (req, res) => {
  var name = decodeURIComponent(req.path.substring(16));
  if (!validateName(name)) {
    res.status(400);
    res.send("INVALID_NAME");
    return;
  }
  if ((req.cookies == undefined ? "" : req.cookies.password) != playlists[name].password) {
    res.status(401);
    res.send("NO_AUTHENTICATION");
    return;
  }

  var playlist = playlists[name];
  if (playlist == undefined) {
    res.status(404);
    res.send("PLAYLIST_NOT_FOUND");
    return;
  }

  playlist.songs = [...new Set(req.body.songs)];
  playlist.requests = req.body.requests;
  dbWrite("playlist-" + name, playlist);

  res.status(200);
  res.send("OK");
});
app.post("/createPlaylist", async (req, res) => {
  waitUntilReady(async () => {
    var name = req.body.playlistName;
    var password = req.body.password;

    if (!validateName(name)) {
      res.redirect("/?error=invalidName");
      return;
    }
    if (req.body.readonly == undefined && playlists[name] && playlists[name].password != password) {
      res.redirect("/?error=wrongUserOrPassword");
      return;
    }

    if (!playlists[name]) {
      console.log("Created playlist " + name + " with password " + password);

      var playlist = {name: name, password: password, songs: [], requests: []};
      playlistNames.push(name);
      playlists[name] = playlist;
    
      await dbWrite("playlist-" + name, playlist);
      await dbWrite("playlists", playlistNames);
    }

    res.cookie("password", password, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    
    res.redirect("/playlist/" + name);
  });
});
app.post("/request/*", (req, res) => {
  var name = decodeURIComponent(req.path.substring(9));
  var userName = req.body.userName;
  var songName = req.body.songName;
  var songURL = req.body.songURL;

  if (!validateName(name)) {
    res.redirect("/?error=invalidName");
    return;
  }

  if (songName == undefined || songURL == undefined) {
    res.status(400);
    res.send("BAD_REQUEST");
    return;
  }

  var playlist = playlists[name];

  if (playlist == undefined) {
    res.status(404);
    res.send("PLAYLIST_NOT_FOUND");
    return;
  }

  playlist.requests.push({userName: userName, songName: songName, songURL: songURL});

  dbWrite("playlist-" + name, playlist);

  console.log(userName + " added song " + songName + " to playlist " + name);
  
  res.redirect("/playlist/" + name);
});
app.post("/changePassword.html", (req, res) => {
  var name = req.body.playlistName;
  var oldPassword = req.body.oldPassword;
  var newPassword = req.body.newPassword;
  if (!validateName(name)) {
    res.redirect("/changePassword.html?error=invalidName");
    return;
  }
  if (playlists[name] == undefined || playlists[name].password == oldPassword) {
    res.redirect("/changePassword.html?error=wrongUserOrPassword");
    return;
  }
  playlists[name].password = newPassword;
  dbWrite("playlist-" + name, playlists[name]);
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
function automaticFilter(requester, songName, songURL) {

  return true;
}

async function dbWrite(key, value) {
  // SET userSession jsonObject
  return (await(await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
    },
    body: JSON.stringify(value),
    method: 'POST',
  })).json()).result;
}
async function dbRead(key) {
  return JSON.parse((await (await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
  headers: {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
  },
  })).json()).result);
}

function waitUntilReady(callback) {
  if (ready) {
    callback();
  } else {
    setTimeout(async () => {
      waitUntilReady(callback);
    }, 100);
  }
}

module.exports = app;