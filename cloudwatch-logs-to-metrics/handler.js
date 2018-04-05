'use strict';

const co         = require('co');
const Promise    = require('bluebird');
const processAll = require('./lib').processAll;
const zlib       = Promise.promisifyAll(require('zlib'));
const AWS        = require('aws-sdk');
const lambda     = new AWS.Lambda();

const forwardFunction = process.env.forward_function;

module.exports.handler = co.wrap(function* (event, context, callback) {
  let payload = new Buffer(event.awslogs.data, 'base64');
  let json = (yield zlib.gunzipAsync(payload)).toString('utf8');
  
  let logEvent = JSON.parse(json);
  let result = yield processAll(logEvent.logGroup, logEvent.logStream, logEvent.logEvents);

  console.log(`processed ${result.customMetrics.length} custom metrics`);

  if (result.unprocessed.length > 0 && forwardFunction) {
    logEvent.logEvents = result.unprocessed;
    let newJson = JSON.stringify(logEvent);
    let newBuffer = yield zlib.gzipAsync(newJson);
    let newEvent = { 
      awslogs: {
        data: newBuffer.toString('base64')
      }
    };
    let invokeReq = {
      FunctionName: forwardFunction,
      InvocationType: "Event", 
      Payload: JSON.stringify(newEvent)
    };
    yield lambda.invoke(invokeReq).promise();
  }

  callback(null, `Successfully processed ${logEvent.logEvents.length} log events.`);
});