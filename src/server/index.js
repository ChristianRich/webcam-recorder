import 'babel-polyfill';
import http from 'http';
import fs from 'fs';
import { clearInterval } from 'timers';
import { server } from 'websocket';
import bytes from 'bytes';
import shell from 'shelljs';
import numeral from 'numeral';

const destDir = `${process.cwd()}/capture`;
const tmpDir = `${process.cwd()}/capture/tmp`;

let file;
let filename;
let logStream;
let idx;
let startDate;

const createFolders = () => {
  if (!fs.existsSync(destDir)) {
    console.log(`Create ${destDir}`);
    fs.mkdirSync(destDir);
  }
  if (!fs.existsSync(tmpDir)) {
    console.log(`Create ${tmpDir}`);
    fs.mkdirSync(tmpDir);
  }
};

const createCaptureStream = fn => {
  filename = fn;
  file = `${tmpDir}/${filename}.webm`;

  if (logStream) {
    logStream.end();
  }

  logStream = fs.createWriteStream(file, {
    flags: 'a',
    encoding: 'utf8',
  });

  console.log(`CREATE_FILE ${file}`);
  idx = setInterval(printStats, 1000);
};

const streamChunk = data => {
  if (!logStream) {
    return;
  }

  if (logStream.writable) {
    logStream.write(data);
  }

  if (!startDate) {
    startDate = new Date();
  }
};

const processResult = async () => {
  console.log('STOP_RECORDING');
  clearInterval(idx);
  if (logStream) {
    logStream.end();
    logStream = null;
    startDate = null;
    await convertFile(filename);
  }
};

const createSocket = () => {
  // https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketServer.md#server-config-options
  const socket = new server({
    httpServer: http.createServer().listen(process.env.PORT || 1337),
    maxReceivedFrameSize: bytes('512KB'), // 64KB
    maxReceivedMessageSize: bytes('1024MB'),
    fragmentationThreshold: bytes('16KB'),
    fragmentOutgoingMessages: true,
    disableNagleAlgorithm: false,
    closeTimeout: 10000,
  });

  console.log('ws://localhost:1337 is waiting for connections');

  socket.on('request', request => {
    const connection = request.accept(null, request.origin);

    connection.on('message', async message => {
      switch (message.type) {
        case 'utf8':
          var { type, data } = JSON.parse(message.utf8Data);

          switch (type) {
            case 'CREATE_FILE':
              createCaptureStream(data);
              break;
            case 'STOP_RECORDING':
              processResult();
              break;
          }
          break;
        case 'binary':
          streamChunk(message.binaryData);
          break;
        default:
      }
    });

    connection.on(
      'close',
      async (_webSocketConnection, closeReason, description) => {
        console.log('connection closed', closeReason, description);
        clearInterval(idx);

        if (logStream) {
          logStream.end();
          logStream = null;
          // await convertFile(filename);
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
};

const printStats = () => {
  let elapsed = 0;

  if (startDate) {
    const diff = new Date().getTime() - startDate.getTime();
    elapsed = numeral(diff / 1000).format('00:00:00');
  }

  if (logStream && logStream.bytesWritten > 0) {
    console.log(
      `${filename}, size: ${bytes(logStream.bytesWritten)}, time: ${elapsed}`,
    );
  }
};

const convertFile = (filename, targetExt = 'mp4') => {
  const ffmpeg = shell.exec('which ffmpeg');

  if (!ffmpeg || !ffmpeg.length) {
    return console.warn(
      'Skipped mp4 video conversion: FFmpeg multimedia framework required for webm > mp4 conversion. See https://ffmpeg.org/',
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
        console.log('webm to mp4 file conversion complete');
      }
    },
  );
};

createFolders();
createSocket();
