/**
 * Gmail OAuth2 Refresh Token Generator
 *
 * Run: node scripts/get-gmail-token.js
 *
 * 1. Opens a browser for Google sign-in
 * 2. After consent, paste the authorization code here
 * 3. Prints the refresh token to add to your .env / docker-compose
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

// Load from .env or pass as environment variables
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CS;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CS in .env first');
  process.exit(1);
}
const REDIRECT_URI = 'http://localhost:9090';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://mail.google.com/'],
});

console.log('\n=== Gmail OAuth2 Token Generator ===\n');
console.log('Opening browser for authorization...\n');
console.log('If the browser does not open, visit this URL:\n');
console.log(authUrl);
console.log('\nWaiting for callback...\n');

// Open browser
const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
require('child_process').exec(`${open} "${authUrl}"`);

// Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;

  if (query.code) {
    try {
      const { tokens } = await oauth2Client.getToken(query.code);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Success!</h1><p>You can close this tab and return to the terminal.</p>');

      console.log('=== SUCCESS ===\n');
      console.log('Add these to your .env and docker-compose.yml:\n');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`\nAccess token (for reference): ${tokens.access_token?.slice(0, 30)}...`);
      console.log('\nYou can close this terminal now.');

      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>${err.message}</p>`);
      console.error('Failed to get tokens:', err.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Error</h1><p>No authorization code received.</p>');
  }
});

server.listen(9090, () => {
  console.log('Listening on http://localhost:9090 for OAuth callback...');
});
