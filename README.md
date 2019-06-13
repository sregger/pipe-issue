# pipe-issue
A repository to test out an issue noticed while piping nodejs streams

# How to run
Setup a http server using
> npx http-server testData/

Then run this script using
> node streamers.js

# Good reads

 * https://blog.hustle.com/streams-and-pipes-and-errors-oh-my-62bc07b48ff1
 * https://www.bennadel.com/blog/2679-how-error-events-affect-piped-streams-in-node-js.htm
 * https://github.com/nodejs/node/issues/3045
 * https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81

# Raised

 * https://github.com/nodejs/help/issues/1979
 * https://stackoverflow.com/questions/56569208/nodejs-stream-pipe-confusion-no-unpipe-event