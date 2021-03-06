const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const axios = require('axios');
const port = process.env.PORT || 3030;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const SESSION_FILE_PATH = './session.json';
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionData = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});
const client = new Client({
  session: sessionData,
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'],
  },
});

client.on('message', (message) => {
  if (message.body === '!ping') {
    client.sendMessage(message.from, 'pong');
  }
});

client.initialize();

// socket IO
io.on('connection', function (socket) {
  socket.emit('message', 'Connecting...');
  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });
  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready');
    socket.emit('message', 'Whatsapp is ready');
  });
  client.on('authenticated', (session) => {
    socket.emit('authenticated', 'Whatsapp is authenticated');
    socket.emit('message', 'Whatsapp is authenticated');
    console.log('AUTHENTICATED', session);
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
      if (err) {
        console.error(err);
      }
    });
  });
});

const checkRegisteredNumber = async function (number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
};

// send message
app.post('/send-message', [body('number').notEmpty(), body('message').notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }
  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);
  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered',
    });
  }
  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});
// send media
app.post('/send-media', [body('number').notEmpty(), body('caption').notEmpty(), body('file').notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.message;
  const fileUrl = req.body.file;
  //   const media = MessageMedia.fromFilePath('./terbaik.png');

  const isRegisteredNumber = await checkRegisteredNumber(number);
  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered',
    });
  }
  let mimetype;
  const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then((response) => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client
    .sendMessage(number, media, { caption: caption })
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

server.listen(port, function () {
  console.log('App running on *:' + port);
});
