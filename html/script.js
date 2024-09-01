const errorText = document.getElementById("error");

if (location.search.includes("error=invalidName")) {
    errorText.innerText = "Name must be between 1 and 256 alphanumeric characters.";
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

        var content = document.getElementById("content");

        if (songs.length == 0) {
            content.innerHTML = "<p>No songs in playlist.</p>";
        }
        
        var tag = document.createElement('script');
  
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        var player;

        var requestsList = document.getElementById("requests");

        if (requests.length == 0) {
            requestsList.innerHTML = "<p>No requests awaiting.</p>";
        }

        for (let i = 0; i < requests.length; i++) {
            requestsList.innerHTML += "<p>" + requests[i] + "</p>";
        }
    });
}
function onYouTubeIframeAPIReady() {
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

// 4. The API will call this function when the video player is ready.
var done = false;
function onPlayerReady(event) {
  if (done) {
    return;
  }
  event.target.playVideo();
  done = true;
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
function onPlayerStateChange(event) {
  if (event.data == 0) {
    nextVideo();
  }
}

function nextVideo() {
  var currentSong = player.getVideoUrl().slice(-("dQw4w9WgXcQ".length));
  console.log(player.getVideoUrl());
  if (settings["shuffle"] == "true") {
    nextIndex = Math.floor(Math.random() * songs.length);
  } else {
    nextIndex = songs.indexOf(currentSong) + 1;
    if (nextIndex >= songs.length) {
      nextIndex = 0;
    }
  }
  var videoId = songs[nextIndex];
  player.loadVideoById(videoId);
}

var settings = {};

function trackSetting(id) {
    // add an event listener to track all changes to any input element with the given id.
    var input = document.getElementById(id);

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

trackSetting("shuffle");
trackSetting("acceptall");
trackSetting("maxlength");