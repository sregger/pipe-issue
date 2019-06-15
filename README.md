# pipe-issue
A repository to test out an issue noticed while piping nodejs streams

# How to run
Install dependencies using

> npm install

Generate the testData using

> node generate-testData

Setup a http server using

> npx http-server testData/

Run the script using

> node streamer.js

This script will

 * download the files listed in testData/files.json
 * decrypt them using the info found in the file's .json
 * compress the plaintext files to a zip

It should generate output similar to

    [pipe-issue]$ node streamer.js 
    ********************************************************************************
    Downloading file_1.txt
    Downloading file_2.txt
    file_1.txt: 48.496ms
    file_2.txt: 42.516ms
    ********************************************************************************
    Downloading file_3.txt
    Downloading file_4.txt
    file_3.txt: 25.852ms
    file_4.txt: 75.961ms
    ********************************************************************************
    Downloading file_5.txt
    file_5.txt: 561.817ms
    ********************************************************************************
    Calling finalize
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    archive on unpipe
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    --------------------------------------------------------------------------------
    2.35 MB total compressed bytes
    --------------------------------------------------------------------------------
    archive close called

and create result.zip.

# How to create the issue

Once the testData is generated open testData/file_1.txt and modify the file. This'll cause the decryption to fail.

    [pipe-issue]$ node streamer.js 
    ********************************************************************************
    Downloading file_1.txt
    Downloading file_2.txt
    Error decrypting file_1.txt due to error Error: Unsupported state or unable to authenticate data
    file_1.txt: 48.083ms
    file_2.txt: 41.939ms
    ********************************************************************************
    Downloading file_3.txt
    Downloading file_4.txt
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    archive on unpipe
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    Detected archive error Error: Unsupported state or unable to authenticate data
    file_3.txt: 10.263ms
    file_4.txt: 59.904ms
    ********************************************************************************
    Downloading file_5.txt
    file_5.txt: 563.892ms
    ********************************************************************************
    Calling finalize
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    archive on unpipe
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    --------------------------------------------------------------------------------
    2.35 MB total compressed bytes
    --------------------------------------------------------------------------------
    archive close called

In the output above you can see Error

> Error: Unsupported state or unable to authenticate data

which, in a later call, is repeated in the archiver. This will also generate an unpipe event

> archive on unpipe

which is caught and the pipe restored. i.e.

    source.pipe(archive)

If this line of code was commented out and the script run the output is

    [pipe-issue]$ node streamer.js 
    ********************************************************************************
    Downloading file_1.txt
    Downloading file_2.txt
    Error decrypting file_1.txt due to error Error: Unsupported state or unable to authenticate data
    file_1.txt: 41.532ms
    file_2.txt: 34.829ms
    ********************************************************************************
    Downloading file_3.txt
    Downloading file_4.txt
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    archive on unpipe
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    Detected archive error Error: Unsupported state or unable to authenticate data
    file_3.txt: 10.271ms
    file_4.txt: 57.078ms
    ********************************************************************************
    Downloading file_5.txt

Here you can see that file_5.txt is never downloaded and the data is not compressed. i.e. "2.35 MB total compressed bytes" is missing.

# Good reads

 * https://blog.hustle.com/streams-and-pipes-and-errors-oh-my-62bc07b48ff1
 * https://www.bennadel.com/blog/2679-how-error-events-affect-piped-streams-in-node-js.htm
 * https://github.com/nodejs/node/issues/3045
 * https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

# Raised

 * https://github.com/nodejs/help/issues/1979
 * https://stackoverflow.com/questions/56569208/nodejs-stream-pipe-confusion-no-unpipe-event