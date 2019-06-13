const fs = require('fs');
const b64u = require('b64u');
const archiver = require('archiver');
const nodeCrypto = require('crypto');
const request = require('request');
const prettyBytes = require('pretty-bytes');
const path = require('path');
const passThrough = require('stream');
const progressStream = require('progress-stream');
const ciphers = require('./js/ciphers');
const files = require('./testData/files.json').files;

const output = fs.createWriteStream('result.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', () => {
  console.log('--------------------------------------------------------------------------------')
  console.log(prettyBytes(archive.pointer()) + ' total compressed bytes');
  console.log('--------------------------------------------------------------------------------')
});

archive.on('error', (err) => {
  console.error(`Detected archive error ${err}`);
})

archive.on('unpipe', (source) => {
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
  console.error(`archive on unpipe`);
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
  // Causes the encrypted file to be appended to the zip
  source.pipe(archive)
})

archive.pipe(output);

async function download(files) { 
    const promises = [];
    const attachments = [];

    for (const file of files) {
      const decryptInfo = require(`./testData/${file.name}.json`);
      const key = fs.readFileSync((decryptInfo.key.data);
      const iv = Buffer.from(decryptInfo.iv.data);
      const tag = Buffer.from(decryptInfo.tag.data);
      const decipher = ciphers.createDecipher(key, iv, tag);

      console.info('Downloading ' + file.name);
      console.time(file.name);

      // Kick off an async promise to download the file
      promises.push(new Promise((resolve, reject) => {
        // Create a request for the file
        const req = request(encodeURI(decryptInfo.url)) 

        // Stream download the file
        const stream = req
          .on('error', (error) => {
            console.error(`Failure downloading ${file.name} with error ${error}`);
            // Always resolve an error. It should not stop the stream. But will be reported on the UI.
            resolve();
          })
          .pipe(progressStream((progress) => {}))
          // Pipe it to decryption
          .pipe(decipher)
          .on('error', (error) => {
            console.error(`Error decrypting ${file.name} due to error ${error}`);
          })
          .on('finish', () => {
            console.timeEnd(file.name);
            resolve();
          });
          // .pipe(progressStream({drain: false}, (progress) => {}));
          // .pipe(passThrough.PassThrough())
          // .on('error', (error) => {
          //   console.error(`Error progressing ${file} due to error ${error}`);
          // });

        archive.append(stream, { name: file.name });
      }));
    }

    return Promise.all(promises);
}

async function finalize() {
    if (!archive) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log('archive close called')
        resolve(archive)
      });
      archive.on('error', (err) => reject(err));

      // finalize() only completes once all streams have finished
      archive.finalize();
    });
}

async function run() {
    console.log('********************************************************************************')
    await download(files.slice(0, 2))
    console.log('********************************************************************************')
    await download(files.slice(3, 4))
    console.log('********************************************************************************')
    await download(files.slice(4, 5))
    console.log('********************************************************************************')
    console.log('Calling finalize')
    await finalize();
}

run()