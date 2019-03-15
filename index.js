const fs = require('fs');
const readline = require('readline');
const path = require('path');
const request = require('request');
const {
  google
} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), run);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {
    client_secret,
    client_id,
    redirect_uris
  } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */


async function run(auth) {
  try {
      const rows = await migrateUsers(auth)
      const users = await usersToJSON(rows)
      for(const user in users) {
        console.log(users[user])
      }
      // for(const user in users) {
      //   const result = await postUsers(users[user])
      //   console.log(result)
      // }
    } catch(e) {
        console.log(e)
  }
}

function postUsers(user) {
    return new Promise((resolve, reject) => {
      request({
          url: "https://api.kustomerapp.com/v1/customers",
          method: "POST",
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVjOGIzNTQ2YTQ0OWNjMDA5Njk1NWNkNSIsInVzZXIiOiI1YzhiMzU0NTg5MjkwNDAwMTM5M2NmNzQiLCJvcmciOiI1Yzg5NWQwMGI5Yzc0MTAwMWE4OTNhODEiLCJvcmdOYW1lIjoienp6LWNocmlzdG9mZXIiLCJ1c2VyVHlwZSI6Im1hY2hpbmUiLCJyb2xlcyI6WyJvcmcuYWRtaW4iLCJvcmcudXNlciJdLCJleHAiOjE1NTMyMzE4MTMsImF1ZCI6InVybjpjb25zdW1lciIsImlzcyI6InVybjphcGkiLCJzdWIiOiI1YzhiMzU0NTg5MjkwNDAwMTM5M2NmNzQifQ.L5pq9q9AKJimySHIcZXWNZCQWtvscKxL7u6V-hdUkSU'
          },
          json: true,
          body: user
    }, (err, res, body) => {
        if(err) reject(new Error(err.message));
        resolve(body)
    })
    })
}

function migrateUsers(auth) {
  const sheets = google.sheets({
    version: 'v4',
    auth
  });
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId: '1FPYh5c8LY70TlJAS5X2oHASfNWbKPeQEBtTD13y6YEY',
      range: 'Data!A2:G',
    }, (err, res) => {
      if (err) reject(new Error(err.message));
      const rows = res.data.values;
      resolve(rows)
    })
  })
}
    
function usersToJSON(rows) {
  let customers = []
  const regex = /(\W\w{2};?)(\w+@\w+\.com)(\W\w+;?$)/g
  return new Promise((resolve, reject) => {
    if (rows.length) {

      // Creates json object for each row in columns A-G
      rows.forEach((row) => {
        let info = { name: `${row[0]} ${row[1]}`, email: [], birthday: null, phones: []}

        if(row[2].length > 0) {
          info["email"].push({
            email: row[2].replace(regex, "$2")
          })
        }
    
        // Birthday to ISO 8601
        if(row[3].length > 0) {
          date = new Date(row[3]);
          info["birthday"] = date.toISOString();
        } 
    
        // Formats phone numbers
        if(row[4].length > 0) {
          info["phones"].push({
            type: "home",
            phone: row[4]
          });
        }
    
        if(row[5].length > 0) {
          info["phones"].push({
            type: "work",
            phone: row[5]
          }); 
        }
        customers.push({
          name: info.name,
          emails: info.email,
          birthdayAt: info.birthday,
          phones: info.phones
        })
      });
    } else {
      reject(new Error('No data found.'));
    }
    resolve(customers)
  })
}