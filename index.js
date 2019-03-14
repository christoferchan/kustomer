const fs = require('fs');
const readline = require('readline');
const path = require('path')
const {
  google
} = require('googleapis');
let obj;

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
  console.log(JSON.parse(content))
  authorize(JSON.parse(content), migrateUsers);
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


// async function postUsers(auth) {
//   const users = await migrateUsers(auth)
//   console.log(users)
// }


function migrateUsers(auth) {
  const sheets = google.sheets({
    version: 'v4',
    auth
  });

  sheets.spreadsheets.values.get({
    spreadsheetId: '1FPYh5c8LY70TlJAS5X2oHASfNWbKPeQEBtTD13y6YEY',
    range: 'Data!A3:G',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    return rows;
    // if (rows.length) {
    //   // Creates json object for each row in columns A-G
    //   let data = []
    //   let date;


    //   rows.forEach((row) => {

    //     if(row[3] !== ""){
    //       date = new Date(row[3])
    //       date = date.toISOString()
    //     } else {
    //       date = ""
    //     }

    //     const phones = await validate(row[4], row[5])

    //     data.push({
    //       name: `${row[0]} ${row[1]}`,
    //       emails: [{
    //         email:row[2]
    //       }],
    //       birthdayAt: date,
    //       phones: phones
    //     })
    //   });
    // } else {
    //   console.log('No data found.');
    // }

    // data = JSON.stringify(data)
    
    // if(!fs.existsSync(path.resolve('./data.json'))) {
    //   fs.writeFile('data.json', data, (err) => {
    //     if(err) throw err;
    //     console.log("File Successfully created")
    //   })
    // }
  });
}

// fs.readFile('data.json', (err, content) => {
//   if (err) return console.log("Error:", err.message)
//   obj = JSON.parse(content)
//   obj.forEach(user => console.log(user))
// })

function vaildatePhones(home, work) {
  let phones = []

  if(home.length > 0){
    phones.push({
      type: "home",
      phone: home
    })
  }

  if(work.length > 0) {
    phones.push({
      type: "work",
      phone: work
    })
  }
  
  return phones;
}

