const errorText = document.getElementById("error");

var settings = {};

if (location.search.includes("error=invalidName")) {
  errorText.innerText = "Name must be between 1 and 256 alphanumeric characters.";
}
if (location.search.includes("error=wrongUserOrPassword")) {
    errorText.innerText = "Playlist exists, choose another name or enter correct access password.";
}
if (location.search.includes("error=playlistNotFound")) {
    errorText.innerText = "Playlist does not exist.";
}

if (location.pathname.startsWith("/playlist/")) {
    name = location.pathname.substring(10);
    document.getElementById("title").innerText = name;

    async function fetchData() {
        var data = await fetch("/playlistData/" + name)
        data = await data.json();
        return data;
    }

    fetchData().then(x => { 
        songs = x.songs;
        requests = x.requests;
  
        var tag = document.createElement('script');
      
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        drawSongs();
        
        drawRequests();
    });
}
if (location.pathname.startsWith("/request/")) {
  trackSetting("userName");

  // hide nameRow if name exists
  if (settings.userName) {
    document.getElementById("userName").style.display = "none";
    document.getElementById("nameLabel").innerHTML = settings.userName;
  }
}
var playWhenReady = false;
function startVideo() {

  if (window.YT == undefined) {
    playWhenReady = true;
    return;
  }
  var currentSong = songs[Math.floor(Math.random() * songs.length)];

  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: currentSong,
    playerVars: {
      'playsinline': 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onYouTubeIframeAPIReady() {
  if (playWhenReady) {
    startVideo();
  }
  
}

// 4. The API will call this function when the video player is ready.
var done = false;
function onPlayerReady(event) {
  if (done) {
    return;
  }
  event.target.playVideo();
  content.innerHTML = `<p> Playing: ${player.videoTitle}</p>`;
  done = true;
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
  if (event.data == 0) {
    nextVideo();
  } else {
    content.innerHTML = `<p> Playing: ${player.videoTitle}</p>`;
  }
}

function nextVideo() {
  if (settings["shuffle"] == "true") {
    nextIndex = Math.floor(Math.random() * songs.length);
  } else {
    var currentSong = player.getVideoUrl().slice(-("dQw4w9WgXcQ".length));
    nextIndex = songs.indexOf(currentSong) + 1;
    if (nextIndex >= songs.length) {
      nextIndex = 0;
    }
  }
  var videoId = songs[nextIndex];
  player.loadVideoById(videoId);
  content.innerHTML = `<p>Loading...</p>`;
}

function removeVideo(index) {
  if (index !=undefined) {
    songs.splice(index, 1);
  } else {
    var currentSong = player.getVideoUrl().slice(-("dQw4w9WgXcQ".length));

    if (currentSong != undefined && songs.indexOf(currentSong) >= 0) {
      songs.splice(songs.indexOf(currentSong), 1);
    }
  }
  updatePlaylist();
  nextVideo();
}

function trackSetting(id) {
    // add an event listener to track all changes to any input element with the given id.
    var input = document.getElementById(id);

    if (input == null) {
      return;
    }

    if (localStorage["setting_" + id]) {
        if (input.type == "checkbox") {
            input.checked = localStorage["setting_" + id] == "true";
        } else {
            input.value = localStorage["setting_" + id];
        }
    }

    settings[id] = localStorage["setting_" + id];
    
    input.addEventListener('input', (event) => {
        if (input.type == "checkbox") {
            localStorage["setting_" + id] = input.checked;
        } else {
            localStorage["setting_" + id] = input.value;
        }

        settings[id] = localStorage["setting_" + id];
    });
}

async function updatePlaylist() {
  var data = await fetch("/updatePlaylist/" + playlistName, { 
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      songs: songs,
      requests: requests,
    }),
  });
}

function acceptRequest(index) {
  songs.push(requests[index].songURL.slice(-11));
  requests.splice(index, 1);

  if (songs.length == 1) {
    drawSongs();
  }
  drawRequests();

  updatePlaylist();
}

function rejectRequest(index) {
  console.log(index);
  requests.splice(index, 1);
  drawRequests();

  updatePlaylist();
}

function drawRequests() {

  var requestsList = document.getElementById("requests");

  if (requests.length == 0) {
    requestsList.innerHTML = "<p style='color: #7f7f7f'>No requests awaiting.</p>";
  } else {
    requestsList.innerHTML = "";
    for (let i = 0; i < requests.length; i++) {
      requestsList.innerHTML += `<hr><p id='request-${i}'>${requests[i].userName} requested <a href="${requests[i].songURL}">${requests[i].songName}</a><br/><button onclick="acceptRequest(${i})">Accept</button> <button onclick="rejectRequest(${i})">Reject</button></p>`;
    }
    requestsList.innerHTML += "<hr>";
  }
}

function drawSongs() {

  var content = document.getElementById("content");
  var currentSongInfo = document.getElementById("currentSongInfo");

  if (songs.length == 0) {
    content.innerHTML = "<p style='color: #7f7f7f'>No songs in playlist.</p>";
    currentSongInfo.style.display = "none";
  } else if (player.videoTitle == undefined) {
    startVideo();
    content.innerHTML = "<p>Loading...</p>";
    currentSongInfo.style.display = "unset";
  } else {
    content.innerHTML = `<p> Playing: ${player.videoTitle}</p>`;
  }
  var songsList = document.getElementById("songs");
  var html = "<table style='width: 100%; table-layout: fixed'>";
  getSongName(songs).then(names => {
    for (let i = 0; i < songs.length; i++) {
      html += `<tr><td style="text-align: right;"><a href="https://www.youtube.com/watch?v=${songs[i]}" style="color:white;text-decoration:none">${names[songs[i]]} </a></td><td style="text-align: left;"> <button onclick="removeVideo(${i})">Remove</button></td></tr>`;
    }
    html += "</table><hr>";

    songsList.innerHTML = html;
  });
}

function addSong() {
  var url = document.getElementById("forceAddURL").value;

  if (url == "") {
    return;
  }

  songs.push(url.slice(-11));
  drawSongs();
  updatePlaylist();

  document.getElementById("forceAddURL").value = "";
}

async function getSongName(ids) {
  return await (await fetch("http://localhost:3000/videoTitle", {
  headers: {
      'Accept': 'application/json', 
      "Content-Type": "application/json"
  },
  body: JSON.stringify({ids}),
  method: "POST"
})).json();
}

trackSetting("shuffle");
trackSetting("acceptall");
trackSetting("maxlength");