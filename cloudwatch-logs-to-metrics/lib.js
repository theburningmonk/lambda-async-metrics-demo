'use strict';

const _          = require('lodash');
const co         = require('co');
const Promise    = require('bluebird');
const parse      = require('./parse');
const cloudwatch = require('./cloudwatch');

let processAll = co.wrap(function* (logGroup, logStream, logEvents) {
  let funcName    = parse.functionName(logGroup);
  let lambdaVer   = parse.lambdaVersion(logStream);
  let result = { customMetrics: [], unprocessed: [] };
  for (let evt of logEvents) {
    let metric = parse.customMetric(funcName, lambdaVer, evt.message);
    if (metric) {
      result.customMetrics.push(metric);
    } else {
      result.unprocessed.push(evt);
    }
  }

  let metricDatumByNamespace = _.groupBy(result.customMetrics, m => m.Namespace);
  let namespaces = _.keys(metricDatumByNamespace);
  for (let namespace of namespaces) {
    let datum = metricDatumByNamespace[namespace];

    try {
      yield cloudwatch.publish(datum, namespace);
    } catch (err) {
      console.error("failed to publish metrics", err.message);
      console.error(JSON.stringify(datum));
    }    
  }

  return result;
});

module.exports = {
  processAll
};