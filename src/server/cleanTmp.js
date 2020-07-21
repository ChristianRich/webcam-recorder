import 'babel-polyfill';
import fs from 'fs';
import path from 'path';

const deleteZeroSizeTmpFiles = async () => {
  const currentDirPath = `${process.cwd()}/capture/tmp`;

  fs.readdirSync(`${process.cwd()}/capture/tmp`).forEach(name => {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    if (stat.isFile() && stat.size === 0) {
      fs.unlinkSync(filePath);
    }
  });
};

deleteZeroSizeTmpFiles();
