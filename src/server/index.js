import 'babel-polyfill';
import { clearInterval } from 'timers';

const server = require('websocket').server;
const http = require('http');
const fs = require('fs');
const bytes = require('bytes');
const shell = require('shelljs');
const numeral = require('numeral');

const tmpDir = `${process.cwd()}/capture/tmp`;
const destDir = `${process.cwd()}/capture`;

let file;
let filename;
let logStream;
let idx;
let blobsRecieved = 0;
let startDate;

// https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketServer.md#server-config-options
const socket = new server({
  httpServer: http.createServer().listen(1337),
  maxReceivedFrameSize: bytes('512KB'), // 64KB
  maxReceivedMessageSize: bytes('1024MB'),
  fragmentationThreshold: bytes('16KB'),
  fragmentOutgoingMessages: true,
  disableNagleAlgorithm: false,
  closeTimeout: 10000,
});

socket.on('request', request => {
  const connection = request.accept(null, request.origin);

  connection.on('message', async message => {
    switch (message.type) {
      case 'utf8':
        var { type, data } = JSON.parse(message.utf8Data);

        switch (type) {
          case 'CREATE_FILE':
            filename = data;
            file = `${tmpDir}/${filename}.webm`;
            logStream = fs.createWriteStream(file, {
              flags: 'a',
              encoding: 'utf8',
            });

            console.log(`CREATE_FILE ${file}`);
            idx = setInterval(printStats, 1000);
            break;
          case 'STOP_RECORDING':
            console.log('STOP_RECORDING');
            clearInterval(idx);
            if (logStream) {
              logStream.end();
              logStream = null;
              await convertFile(filename);
            }
            break;
        }
        break;
      case 'binary':
        logStream.write(message.binaryData);

        if (blobsRecieved === 0) {
          startDate = new Date();
        }

        blobsRecieved += message.binaryData.length;
        break;
      default:
    }
  });

  connection.on(
    'close',
    async (webSocketConnection, closeReason, description) => {
      console.log('connection closed', closeReason, description);
      clearInterval(idx);

      if (logStream) {
        logStream.end();
        logStream = null;
        await convertFile(filename);
      }
    },
  );

  connection.on('open', () => {
    console.log('connection open');
  });

  connection.on('error', e => {
    console.log('connection error', e);
  });
});

const printStats = () => {
  let elapsed = 0;

  if (startDate) {
    const diff = new Date().getTime() - startDate.getTime();
    elapsed = numeral(diff / 1000).format('00:00:00');
  }

  if (logStream && logStream.bytesWritten > 0) {
    console.log(
      `${filename}, size: ${bytes(
        logStream.bytesWritten,
      )}, blobsRecieved: ${numeral(blobsRecieved).format(
        '0,0',
      )}, time: ${elapsed}`,
    );
  }
};

const convertFile = (filename, targetExt = 'mp4') => {
  const ffmpeg = shell.exec('which ffmpeg');

  if (!ffmpeg) {
    throw new Error(
      'FFmpeg multimedia framework required for webm > mp4 conversion. See https://ffmpeg.org/',
    );
  }

  const file = `${tmpDir}/${filename}`;
  const destFile = `${destDir}/${filename}`;

  // https://www.reddit.com/r/ffmpeg/comments/efvzhv/very_very_slow_encoding_speeds/
  // ffmpeg -i input.webm -c:v libx264 -preset ultrafast -crf 23 output.mp4
  shell.exec(
    `ffmpeg -i ${file}.webm ${destFile}.${targetExt} -y`,
    (code, stdout, stderr) => {
      if (code !== 0) {
        console.log(stderr);
      } else {
        fs.unlinkSync(`${file}.webm`);
      }
    },
  );
};
