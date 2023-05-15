require('dotenv').config({ path: `${__dirname}/.env` });
const express = require('express');
const port = process.env.PORT || 5000;
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
const S3 = new AWS.S3();

const { google } = require('googleapis');
const YoutubeApi = google.youtube('v3');

const { OAuth2 } = google.auth;

const oAuth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URIS,
);

oAuth2Client.credentials = {
  refresh_token: process.env.REFRESH_TOKEN,
};

app.post('/s3-to-youtube', async (req, res) => {
  const { video, title, description } = req.body;
  const s3data = {
    Bucket: process.env.S3_BUCKET,
    Key: video,
  };
  let fileStream = S3.getObject(s3data).createReadStream();
  const params = {
    auth: oAuth2Client,
    part: 'snippet,status',
    resource: {
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: 'public',
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fileStream,
    },
  };
  const response = await YoutubeApi.videos.insert(params);

  return res
    .status(201)
    .json({ id: response.data.id, url: `https://www.youtube.com/watch?v=${response.data.id}` });
});

app.listen(port, () => {
  console.log(`Listening on: http://localhost:${port}`);
});
