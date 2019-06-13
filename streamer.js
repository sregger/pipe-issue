// Setup a http server using
//   npx http-server testData/
//
// Then run this script using
//   node streamers.js
//
// Good read: https://blog.hustle.com/streams-and-pipes-and-errors-oh-my-62bc07b48ff1
// Seems to apply to the use of progressStream
// Also
//    https://www.bennadel.com/blog/2679-how-error-events-affect-piped-streams-in-node-js.htm
//    https://github.com/nodejs/node/issues/3045

const fs = require('fs');
const b64u = require('b64u');
const archiver = require('archiver');
const nodeCrypto = require('crypto');
const request = require('request');
const MailComposer = require("nodemailer/lib/mail-composer");
const prettyBytes = require('pretty-bytes');
const path = require('path');
const passThrough = require('stream');
const progressStream = require('progress-stream');

const output = fs.createWriteStream('result.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', () => {
  console.log('--------------------------------------------------------------------------------')
  console.log(prettyBytes(archive.pointer()) + ' total compressed bytes');
  console.log('--------------------------------------------------------------------------------')
});

output.on('unpipe', (err) => {
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
  console.error(`output on unpipe`);
  console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
})

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

function createDecipher(scr, tiv, ttag) {
    const algorithm = 'aes-256-gcm';
    // toJSON(true) exposes a base 64 encoded version of the key
    const jwkKey = scr.jwkKey; //scr.key.toJSON(true).k;
    const key = b64u.toBuffer(jwkKey)
    // The Initialization Vector is a salt used when creating the ciphertext.
    // It is used during the initial part of the Decipher.
    const iv = Buffer.from(tiv);
    // The Auth tag - essentially a 16 bit MAC of the ciphertext.
    const tag = Buffer.from(ttag);
    // Additional Authentication Data used to validate the decrypted plaintext.
    // Its use is optional in GCM mode but Cisco have opted in.
    const aad = Buffer.from(scr.aad, "utf8");

    const decipher = nodeCrypto.createDecipheriv(algorithm, key, iv);
    // Must be set before any decryption occurs
    decipher.setAuthTag(tag);
    decipher.setAAD(aad);

    return decipher;
}

async function download(files) { 
    const promises = [];
    const attachments = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const scr = JSON.parse(fs.readFileSync(`./testData/${file}.scr`));
      const iv = fs.readFileSync(`./testData/${file}.iv`);
      const tag = fs.readFileSync(`./testData/${file}.tag`);
      const decipher = createDecipher(scr, iv, tag);

      const timeMarker = `${file}`
      console.info('Downloading ' + timeMarker);
      console.time(timeMarker);

      // Kick off an async promise to download the file
      promises.push(new Promise((resolve, reject) => {
        // Create a request for the file
        const uri = `http://127.0.0.1:8080/${file}`
        const req = request(encodeURI(uri)) 

        // Stream download the file
        const stream = req
          .on('error', (error) => {
            console.error(`Failure downloading ${file} with error ${error}`);
            // Always resolve an error. It should not stop the stream. But will be reported on the UI.
            resolve();
          })
          .pipe(progressStream((progress) => {}))
          // Pipe it to decryption
          .pipe(decipher)
          .on('error', (error) => {
            console.error(`Error decrypting ${file} due to error ${error}`);
          })
          .on('finish', () => {
            console.timeEnd(file);
            resolve();
          });
          // .pipe(progressStream({drain: false}, (progress) => {}));
          // .pipe(passThrough.PassThrough())
          // .on('error', (error) => {
          //   console.error(`Error progressing ${file} due to error ${error}`);
          // });

        archive.append(stream, { name: file });
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

const files = [
    'test_1.txt',
    'test_2.txt',
    'test_3.txt',
    'test_4.txt',
    'test_5.txt',
    'test_6.txt',
    'test_7.txt',
    'test_8.txt',
    'test_9.txt',
    'test_10.txt',
    'test_11.txt',
    'test_12.txt',
    'test_13.txt',
    'test_14.txt',
    'test_15.txt',
    'test_16.txt',
    'test_17.txt',
    'test_18.txt',
    'test_19.txt',
    'testdata.bin',
    'testdata2.bin',
    'testdata3.bin',
    'testdata4.bin',
    '(limit 1Mb) 97052b5f-2524-4441-8838-51a9326d66d5.zip',
    '(limit 50 Mb per file and 75 Mb total) 97052b5f-2524-4441-8838-51a9326d66d5.zip'
]

async function run() {
    console.log('********************************************************************************')
    await download(files.slice(0, 10))
    console.log('********************************************************************************')
    await download(files.slice(10, 20))
    console.log('********************************************************************************')
    await download(files.slice(20, 25))
    console.log('********************************************************************************')
    console.log('Calling finalize')
    await finalize();
}

run()