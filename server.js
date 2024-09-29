// server.js
const express = require('express');
const request = require('request');
const path = require('path');
const app = express();

const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; // Replace with your Spotify Client ID
const CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET'; // Replace with your Spotify Client Secret
const REDIRECT_URI = 'http://localhost:8080/callback';

const stateKey = 'spotify_auth_state';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' + new URLSearchParams({ error: 'state_mismatch' }));
    return;
  }

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.redirect('/#' + new URLSearchParams({ error: 'invalid_token' }));
      return;
    }

    const access_token = body.access_token;
    const refresh_token = body.refresh_token;

    // Pass the tokens to the browser
    res.redirect('/#' +
      new URLSearchParams({
        access_token: access_token,
        refresh_token: refresh_token
      }));
  });
});

app.get('/refresh_token', (req, res) => {
  const refresh_token = req.query.refresh_token;

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64') },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({ 'access_token': access_token });
    } else {
      res.status(response.statusCode).send(body);
    }
  });
});

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});