'use strict';

// logGroup looks like this:
//    "logGroup": "/aws/lambda/service-env-funcName"
let functionName = function (logGroup) {
  return logGroup.split('/').reverse()[0];
};

// logStream looks like this:
//    "logStream": "2016/08/17/[76]afe5c000d5344c33b5d88be7a4c55816"
let lambdaVersion = function (logStream) {
  let start = logStream.indexOf('[');
  let end = logStream.indexOf(']');
  return logStream.substring(start+1, end);
};

let isDate = function (str) {
  return !isNaN(Date.parse(str));
}

// this won't work for some units like Bits/Second, Count/Second, etc.
// but hey, this is a demo ;-)
let toCamelCase = function(str) {
  return str.substr( 0, 1 ).toUpperCase() + str.substr( 1 );
}

// a typical log message looks like this:
//    "2017-04-26T10:41:09.023Z\tdb95c6da-2a6c-11e7-9550-c91b65931beb\tmy log message\n"
// the metrics message we're looking for looks like this:
//    "2017-04-26T10:41:09.023Z\tdb95c6da-2a6c-11e7-9550-c91b65931beb\tMONITORING|metric_value|metric_unit|metric_name|namespace|dimension1, dimension2, ...\n"
let customMetric = function (functionName, version, message) {
  let parts = message.trim().split('\t', 3);

  if (parts.length === 3 && isDate(parts[0]) && parts[2].startsWith("MONITORING")) {
    let timestamp  = parts[0];
    let requestId  = parts[1];
    let logMessage = parts[2];

    // MONITORING|metric_value|metric_unit|metric_name|namespace|dimension1=value1, dimension2=value2, ...
    let metricData  = logMessage.split('|');
    let metricValue = parseFloat(metricData[1]);
    let metricUnit  = toCamelCase(metricData[2].trim());
    let metricName  = metricData[3].trim();
    let namespace   = metricData[4].trim();
        
    let dimensions = [
      { Name: "Function", Value: functionName },
      { Name: "Version", Value: version }
    ];

    // custom dimensions are optional, so don't assume they're there
    if (metricData.length > 5) {
      let dimensionKVs = metricData[5].trim();
      let customDimensions = dimensionKVs
        .map(kvp => {
          let kv = kvp.trim().split('=');
          return kv.length == 2
            ? { Name: kv[0], Value: kv[1] }
            : null;
        })
        .filter(x => x != null && x != undefined && x.Name != "Function" && x.Name != "Version");
      dimensions = dimensions.concat(customDimensions);
    }

    return {
      Value      : metricValue,
      Unit       : metricUnit,
      MetricName : metricName,
      Dimensions : dimensions,
      Timestamp  : new Date(timestamp),
      Namespace  : namespace
    };
  }

  return null;
};

module.exports = {
  functionName,
  lambdaVersion,
  customMetric
};