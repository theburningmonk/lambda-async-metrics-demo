'use strict';

const co         = require('co');
const Promise    = require('bluebird');
const processAll = require('./lib').processAll;
const zlib       = Promise.promisifyAll(require('zlib'));

module.exports.handler = co.wrap(function* (event, context, callback) {
  let payload = new Buffer(event.awslogs.data, 'base64');
  let json = (yield zlib.gunzipAsync(payload)).toString('utf8');
  
  let logEvent = JSON.parse(json);
  yield processAll(logEvent.logGroup, logEvent.logStream, logEvent.logEvents);
  callback(null, `Successfully processed ${logEvent.logEvents.length} log events.`);
});