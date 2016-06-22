"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _helpers = require("./helpers");

var _helpers2 = _interopRequireDefault(_helpers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getTimingData() {
  var data = {};

  data.perfTiming = window.performance.timing;

  if (data.perfTiming.loadEventEnd - data.perfTiming.navigationStart < 0) {
    console.warn("Page is still loading - please try again when page is loaded.");
  }

  return data;
}

function getMarkAndMeasure() {
  var data = {};
  data.marks = window.performance.getEntriesByType("mark");
  data.measures = window.performance.getEntriesByType("measure");
  // window.performance.webkitGetEntriesByType()...
  return data;
}

function getResourcesData() {
  var data = {
    resources: [],
    allResourcesCalc: []
  };

  data.resources = window.performance.getEntriesByType("resource");

  data.allResourcesCalc = data.resources.map(function (currR, i, arr) {
    //crunch the resources data into something easier to work with
    var isRequest = currR.name.indexOf("http") === 0;
    var urlFragments, maybeFileName, fileExtension;

    if (isRequest) {
      urlFragments = currR.name.match(/:\/\/(.[^/]+)([^?]*)\??(.*)/);
      maybeFileName = urlFragments[2].split("/").pop();
      fileExtension = maybeFileName.substr((Math.max(0, maybeFileName.lastIndexOf(".")) || Infinity) + 1);
    } else {
      urlFragments = ["", location.host];
      fileExtension = currR.name.split(":")[0];
    }

    var currRes = {
      name: currR.name,
      domain: urlFragments[1],
      initiatorType: currR.initiatorType || fileExtension || "SourceMap or Not Defined",
      fileExtension: fileExtension || "XHR or Not Defined",
      loadtime: currR.duration,
      fileType: _helpers2.default.getFileType(fileExtension, currR.initiatorType),
      isRequestToHost: urlFragments[1] === location.host
    };

    for (var attr in currR) {
      if (typeof currR[attr] !== "function") {
        currRes[attr] = currR[attr];
      }
    }

    if (currR.requestStart) {
      currRes.requestStartDelay = currR.requestStart - currR.startTime;
      currRes.dns = currR.domainLookupEnd - currR.domainLookupStart;
      currRes.tcp = currR.connectEnd - currR.connectStart;
      currRes.ttfb = currR.responseStart - currR.startTime;
      currRes.requestDuration = currR.responseStart - currR.requestStart;
    }
    if (currR.secureConnectionStart) {
      currRes.ssl = currR.connectEnd - currR.secureConnectionStart;
    }

    return currRes;
  });

  //filter out non-http[s] and sourcemaps
  data.requestsOnly = data.allResourcesCalc.filter(function (currR) {
    return currR.name.indexOf("http") === 0 && !currR.name.match(/js.map$/);
  });

  //get counts
  data.initiatorTypeCounts = _helpers2.default.getItemCount(data.requestsOnly.map(function (currR, i, arr) {
    return currR.initiatorType || currR.fileExtension;
  }), "initiatorType");

  data.initiatorTypeCountHostExt = _helpers2.default.getItemCount(data.requestsOnly.map(function (currR, i, arr) {
    return (currR.initiatorType || currR.fileExtension) + " " + (currR.isRequestToHost ? "(host)" : "(external)");
  }), "initiatorType");

  data.requestsByDomain = _helpers2.default.getItemCount(data.requestsOnly.map(function (currR, i, arr) {
    return currR.domain;
  }), "domain");

  data.fileTypeCountHostExt = _helpers2.default.getItemCount(data.requestsOnly.map(function (currR, i, arr) {
    return currR.fileType + " " + (currR.isRequestToHost ? "(host)" : "(external)");
  }), "fileType");

  data.fileTypeCounts = _helpers2.default.getItemCount(data.requestsOnly.map(function (currR, i, arr) {
    return currR.fileType;
  }), "fileType");

  var tempResponseEnd = {};
  //TODO: make immutable
  data.requestsOnly.forEach(function (currR) {
    var entry = data.requestsByDomain.filter(function (a) {
      return a.domain == currR.domain;
    })[0] || {};

    var lastResponseEnd = tempResponseEnd[currR.domain] || 0;

    currR.duration = entry.duration || currR.responseEnd - currR.startTime;

    if (lastResponseEnd <= currR.startTime) {
      entry.durationTotalParallel = (entry.durationTotalParallel || 0) + currR.duration;
    } else if (lastResponseEnd < currR.responseEnd) {
      entry.durationTotalParallel = (entry.durationTotalParallel || 0) + (currR.responseEnd - lastResponseEnd);
    }
    tempResponseEnd[currR.domain] = currR.responseEnd || 0;
    entry.durationTotal = (entry.durationTotal || 0) + currR.duration;
  });

  //Request counts
  data.hostRequests = data.requestsOnly.filter(function (domain) {
    return domain.domain === location.host;
  }).length;

  data.currAndSubdomainRequests = data.requestsOnly.filter(function (domain) {
    return domain.domain.split(".").slice(-2).join(".") === location.host.split(".").slice(-2).join(".");
  }).length;

  data.crossDocDomainRequests = data.requestsOnly.filter(function (domain) {
    return !_helpers2.default.endsWith(domain.domain, document.domain);
  }).length;

  data.hostSubdomains = data.requestsByDomain.filter(function (domain) {
    return _helpers2.default.endsWith(domain.domain, location.host.split(".").slice(-2).join(".")) && domain.domain !== location.host;
  }).length;

  data.slowestCalls = [];
  data.average = undefined;

  if (data.allResourcesCalc.length > 0) {
    data.slowestCalls = data.allResourcesCalc.filter(function (a) {
      return a.name !== location.href;
    }).sort(function (a, b) {
      return b.duration - a.duration;
    });

    data.average = Math.floor(data.slowestCalls.reduceRight(function (a, b) {
      if (typeof a !== "number") {
        return a.duration + b.duration;
      }
      return a + b.duration;
    }) / data.slowestCalls.length);
  }
  return data;
}

var getMetricsForTiming = function getMetricsForTiming() {
  var data = getTimingData();
  return {
    timestamp: new Date(data.perfTiming.navigationStart).toISOString(),
    url: window.location.href,
    total: data.perfTiming.loadEventEnd - data.perfTiming.navigationStart,
    timeToFirstByte: data.perfTiming.responseStart - data.perfTiming.navigationStart,
    domContentLoading: data.perfTiming.domContentLoadedEventStart - data.perfTiming.domLoading,
    domProcessing: data.perfTiming.domComplete - data.perfTiming.domLoading
  };
};

var getMetricsForResource = function getMetricsForResource() {
  var data = getResourcesData();
  var resources = data.allResourcesCalc.map(function (res) {
    return {
      name: res.name,
      domain: res.domain,
      fileType: res.fileType,
      initiatorType: res.initiatorType,
      fileExtension: res.fileExtension,
      loadtime: res.loadtime,
      isRequestToHost: res.isRequestToHost,
      requestStartDelay: res.requestStartDelay,
      dns: res.dns,
      tcp: res.tcp,
      ttfb: res.ttfb,
      requestDuration: res.requestDuration
    };
  });
  return {
    requests: data.requestsOnly.length,
    domains: data.requestsByDomain.length,
    subDomainsOfTdl: data.hostSubdomains,
    requestsToHost: data.hostRequests,
    tldAndSubdomainRequests: data.currAndSubdomainRequests,
    resources: resources
  };
};
var isReady = false;
var readyFns = [];
window.addEventListener('load', function () {
  //setTimeout 0 to make loadEventEnd available
  setTimeout(function () {
    readyFns.forEach(function (fn) {
      fn();
    });
    isReady = true;
  }, 0);
});

exports.default = {
  getMetricsForTiming: getMetricsForTiming,
  getMetricsForResource: getMetricsForResource,
  getMarkAndMeasure: getMarkAndMeasure,
  _getResourcesData: getResourcesData,
  _getTimingData: getTimingData,
  ready: function ready(fn) {
    if (isReady()) {
      fn();
    } else {
      readyFns.push(fn);
    }
  }
};