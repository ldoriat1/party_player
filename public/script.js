// public/script.js

let accessToken = null;
let refreshToken = null;
let player = null;
let deviceId = null;
let queue = [];
let currentTrackIndex = 0;

// On Load
window.onload = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  accessToken = params.get('access_token');
  refreshToken = params.get('refresh_token');

  if (!accessToken) {
    // Show the login button
    document.getElementById('login-btn').addEventListener('click', () => {
      window.location.href = '/login';
    });
  } else {
    // Hide the login button and show the user info
    document.getElementById('login').style.display = 'none';
    document.getElementById('logout-btn').addEventListener('click', logout);

    initializeApp();
  }
};

function initializeApp() {
  getUserProfile();
  initializePlayer();

  document.getElementById('search-btn').addEventListener('click', searchTracks);
}

function logout() {
  accessToken = null;
  refreshToken = null;
  player.disconnect();
  window.location.href = '/';
}

// Get User Profile
function getUserProfile() {
  fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
    .then(response => response.json())
    .then(data => {
      document.getElementById('user-name').innerText = `Logged in as ${data.display_name}`;
      document.getElementById('user-info').style.display = 'block';
      document.getElementById('search-section').style.display = 'block';
    });
}

// Initialize Spotify Player
function initializePlayer() {
  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
      name: 'Party Playlist Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.8
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    player.addListener('player_state_changed', state => {
      if (!state) {
        return;
      }

      const { paused, position, duration } = state;

      if (paused && position === 0 && duration !== 0) {
        // Track ended
        playNextTrack();
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      deviceId = device_id;
      transferPlaybackHere(device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect();
  };
}

function transferPlaybackHere(deviceId) {
  fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      'device_ids': [deviceId],
      'play': false,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
}

// Search Tracks
function searchTracks() {
  const query = document.getElementById('search-input').value;
  fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  })
    .then(response => response.json())
    .then(data => {
      displaySearchResults(data.tracks.items);
    });
}

// Display Search Results
function displaySearchResults(tracks) {
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '';
  tracks.forEach(track => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'song-item';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'song-info';
    infoDiv.innerText = `${track.name} by ${track.artists[0].name}`;

    const addButton = document.createElement('button');
    addButton.innerText = 'Add to Queue';
    addButton.onclick = () => addToQueue(track);

    trackDiv.appendChild(infoDiv);
    trackDiv.appendChild(addButton);
    resultsDiv.appendChild(trackDiv);
  });
}

// Add to Queue
function addToQueue(track) {
  const song = {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artist: track.artists[0].name,
    votes: 0
  };
  queue.push(song);
  displayQueue();

  // If the queue has only one song, start playing
  if (queue.length === 1) {
    playNextTrack();
  }
}

// Display Queue
function displayQueue() {
  const queueDiv = document.getElementById('queue');
  queueDiv.innerHTML = '';

  // Sort queue based on votes
  queue.sort((a, b) => b.votes - a.votes);

  queue.forEach((song, index) => {
    const songDiv = document.createElement('div');
    songDiv.className = 'song-item';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'song-info';
    infoDiv.innerText = `${song.name} by ${song.artist} - Votes: ${song.votes}`;

    const voteDiv = document.createElement('div');
    voteDiv.className = 'vote-buttons';

    const upvoteBtn = document.createElement('button');
    upvoteBtn.innerText = 'Upvote';
    upvoteBtn.onclick = () => {
      voteSong(song.id, 1);
    };

    const downvoteBtn = document.createElement('button');
    downvoteBtn.innerText = 'Downvote';
    downvoteBtn.onclick = () => {
      voteSong(song.id, -1);
    };

    voteDiv.appendChild(upvoteBtn);
    voteDiv.appendChild(downvoteBtn);

    songDiv.appendChild(infoDiv);
    songDiv.appendChild(voteDiv);
    queueDiv.appendChild(songDiv);
  });
}

// Vote Song
function voteSong(songId, value) {
  const song = queue.find(s => s.id === songId);
  if (song) {
    song.votes += value;

    // Re-sort the queue
    queue.sort((a, b) => b.votes - a.votes);

    // Update currentTrackIndex if necessary
    currentTrackIndex = queue.findIndex(s => s.id === song.id);

    displayQueue();
  }
}

// Play Track
function playTrack(trackUri) {
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
}

// Play Next Track
function playNextTrack() {
  if (currentTrackIndex < queue.length) {
    const nextTrack = queue[currentTrackIndex];
    playTrack(nextTrack.uri);
    currentTrackIndex++;
  } else {
    console.log('End of queue');
  }
}