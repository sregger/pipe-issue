const fs = require('fs');
const b64u = require('b64u');
const nodeCrypto = require('crypto');
const path = require('path');
const passThrough = require('stream');
const progressStream = require('progress-stream');
const ciphers = require('./js/ciphers');
const files = require('./testData/files.json').files;

async function download(files) { 
    const promises = [];
    const attachments = [];

    for (const file of files) {
      const decryptInfo = require(`./testData/${file.name}.json`);
      const key = Buffer.from(decryptInfo.key.data);
      const iv = Buffer.from(decryptInfo.iv.data);
      const tag = Buffer.from(decryptInfo.tag.data);
      const decipher = ciphers.createDecipher(key, iv, tag);

      console.info('Reading ' + file.name);
      console.time(file.name);

      // Kick off an async promise to download the file
      promises.push(new Promise((resolve, reject) => {
        const req = fs.createReadStream(`./testData/${file.name}`);
        // Setting drain to true allows the script to reach Done
        const ps = progressStream({drain: false}, (progress) => {})

        // Read the file from disk
        const stream = req
          .on('error', (error) => {
            console.error(`Failure reading file ${file.name} with error ${error}`);
            console.timeEnd(file.name);
            resolve();
          })
          // Pipe it to decryption
          .pipe(decipher)
          .on('error', (error) => {
            console.error(`Error decrypting ${file.name} due to error ${error}`);
          })
          .on('finish', () => {
            console.timeEnd(file.name);
            resolve();
          })
          .pipe(ps)
          .on('error', () => console.error(`******Progress Error ${file.name}************`))
          .on('unpipe', (source) => {
            console.error('Progress Unpipe ' + file.name)
          });
      }));
    }

    return Promise.all(promises);
}

async function run() {
    console.log('********************************************************************************')
    await download(files.slice(0, 2))
    console.log('********************************************************************************')
    await download(files.slice(2, 4))
    console.log('********************************************************************************')
    await download(files.slice(4, 5))
    console.log('********************************************************************************')
    console.log('________________________________________________________________________________')
    console.log('________________________________________________________________________________')
    console.log('Done')
    console.log('________________________________________________________________________________')
    console.log('________________________________________________________________________________')
}

run()