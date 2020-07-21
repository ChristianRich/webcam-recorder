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

let filename; // wihtout ext
let file; // filename with .webm ext
let writeStream;
let idx;
let startDate;

const CREATE_FILE = 'CREATE_FILE';
const STOP_RECORDING = 'STOP_RECORDING';

const createFolders = () => {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
};

const createCaptureStream = fn => {
  filename = fn;
  file = `${tmpDir}/${filename}.webm`;

  if (writeStream) {
    writeStream.end();
  }

  writeStream = fs.createWriteStream(file, {
    flags: 'a',
    encoding: 'utf8',
  });

  console.log(`${CREATE_FILE} ${file}`);
  idx = setInterval(printStats, 1000);
};

const writeToStream = data => {
  if (writeStream && writeStream.writable && data && data.length) {
    if (!startDate) startDate = new Date();
    writeStream.write(data);
  }
};

const processResult = async () => {
  console.log(STOP_RECORDING);
  clearInterval(idx);
  if (writeStream) {
    writeStream.end();
    writeStream = null;
    startDate = null;
    await convertFile(
      `${tmpDir}/${filename}.webm`,
      `${destDir}/${filename}.mp4`,
    );
  }
};

const createSocket = () => {
  const PORT = process.env.PORT || 1337;

  // https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketServer.md#server-config-options
  const socket = new server({
    httpServer: http.createServer().listen(PORT),
    maxReceivedFrameSize: bytes('512KB'), // 64KB
    maxReceivedMessageSize: bytes('1024MB'),
    fragmentationThreshold: bytes('16KB'),
    fragmentOutgoingMessages: true,
    disableNagleAlgorithm: false,
    closeTimeout: 10000,
  });

  console.log(`ws://localhost:${PORT} is waiting for connections`);

  socket.on('request', request => {
    const connection = request.accept(null, request.origin);

    connection.on('message', async message => {
      switch (message.type) {
        case 'utf8':
          var { type, data } = JSON.parse(message.utf8Data);

          switch (type) {
            case CREATE_FILE:
              createCaptureStream(data);
              break;
            case STOP_RECORDING:
              processResult();
              break;
          }
          break;
        case 'binary':
          writeToStream(message.binaryData);
          break;
        default:
      }
    });

    connection.on(
      'close',
      async (_webSocketConnection, closeReason, description) => {
        console.log('connection closed', closeReason, description);
        clearInterval(idx);

        if (writeStream) {
          writeStream.end();
          writeStream = null;
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

const getElapsedTime = (startDate, operationName) => {
  if (!startDate) {
    return 0;
  }

  const duration = numeral(
    (new Date().getTime() - startDate.getTime()) / 1000,
  ).format('00:00:00');

  if (typeof operationName === 'string') {
    return `${operationName} completed ${duration}`;
  }

  return duration;
};

const printStats = () => {
  let elapsed = 0;

  if (startDate) {
    const diff = new Date().getTime() - startDate.getTime();
    elapsed = numeral(diff / 1000).format('00:00:00');
  }

  if (writeStream && writeStream.bytesWritten > 0) {
    console.log(
      `${filename}, size: ${bytes(writeStream.bytesWritten)}, time: ${elapsed}`,
    );
  }
};

const convertFile = (
  target,
  dest,
  deleteTargetAfterProcessing = true,
  start = new Date(),
) => {
  const ffmpeg = shell.exec('which ffmpeg');

  if (!ffmpeg || !ffmpeg.length) {
    return console.warn(
      'Skipped mp4 video conversion: FFmpeg multimedia framework required for webm > mp4 conversion. See https://ffmpeg.org/',
    );
  }

  console.log(`Converting ${target} to mp4`);

  shell.exec(
    `ffmpeg -loglevel warning -i ${target} ${dest} -y`,
    (code, stdout, stderr) => {
      console.log(getElapsedTime(start, 'video conversion'));
      if (code !== 0) {
        console.log(stderr);
        fs.unlinkSync(dest);
      } else {
        if (deleteTargetAfterProcessing === true) {
          fs.unlinkSync(target);
        }
      }
    },
  );
};

createFolders();
createSocket();
