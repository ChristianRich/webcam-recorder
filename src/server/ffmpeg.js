import 'babel-polyfill';
import fs from 'fs';
import shell from 'shelljs';

// For testing out various conversion settings
const convertFile = (target, dest, deleteTargetAfterProcessing = true) => {
  const ffmpeg = shell.exec('which ffmpeg');

  if (!ffmpeg || !ffmpeg.length) {
    return console.warn(
      'Skipped mp4 video conversion: FFmpeg multimedia framework required for webm > mp4 conversion. See https://ffmpeg.org/',
    );
  }

  shell.exec(
    `ffmpeg -loglevel info -i ${target} ${dest} -y`,
    (code, stdout, stderr) => {
      if (code !== 0) {
        console.log(stderr);
        fs.unlinkSync(dest);
      } else {
        if (deleteTargetAfterProcessing === true) {
          fs.unlinkSync(target);
        }

        console.log('webm to mp4 file conversion complete');
      }
    },
  );
};

convertFile(
  `${process.cwd()}/capture/tmp/test.webm`,
  `${process.cwd()}/capture/tmp/test.mp4`,
  false,
);
