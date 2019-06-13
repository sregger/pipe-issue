const fs = require('fs');
const crypto = require('crypto');
const { Readable } = require('stream');
const ciphers = require('./js/ciphers');
const files = require('./testData/files.json').files;

class Counter extends Readable {
  constructor(size) {
    super();
    this.size = size;
    this.index = 0;
  }

  _read() {
    const i = this.index++; 
    if (i > this.size)
      this.push(null);
    else {
      this.push(Buffer.from(' ' + i));
    } 
  }
}

for (const file of files) {
  const counter = new Counter(file.size);
  const path = `./testData/${file.name}`
  const writeToFile = fs.createWriteStream(path);
  const encrypt = ciphers.createCipher();

  const stream = counter.pipe(encrypt).pipe(writeToFile)
    .on('finish', () => {
        // Info used to decrypt the file
        const info = {
            key: encrypt.key,
            iv: encrypt.iv,
            tag: encrypt.getAuthTag(),
            url: `http://127.0.0.1:8080/${file.name}`
        };
        fs.writeFile(path + '.json', JSON.stringify(info, undefined, 2), () => console.log('Created ' + path + '.json'));

        // fs.createReadStream(path)
        //  .pipe(ciphers.createDecipher(encrypt.key, encrypt.iv, encrypt.getAuthTag()))
        //  .pipe(fs.createWriteStream(path + '.plain'))
        //  .on('finish', () => console.log('Plaintext version of ' + file.name));
    });
}