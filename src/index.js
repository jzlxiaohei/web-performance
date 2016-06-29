import helper from "./helpers";

function getTimingData() {
  const data = {};

  data.perfTiming = window.performance.timing;

  if (data.perfTiming.loadEventEnd - data.perfTiming.navigationStart < 0) {
    console.warn("Page is still loading - please try again when page is loaded.");
  }

  return data;
}

function getMarkAndMeasure() {
  const data = { url: window.location.href };
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

  data.allResourcesCalc = data.resources
    .map((currR, i, arr) => {
      //crunch the resources data into something easier to work with
      const isRequest = currR.name.indexOf("http") === 0;
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
        fileType: helper.getFileType(fileExtension, currR.initiatorType),
        isRequestToHost: urlFragments[1] === location.host
      };

      for (let attr in currR) {
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
  data.requestsOnly = data.allResourcesCalc.filter((currR) => {
    return currR.name.indexOf("http") === 0 && !currR.name.match(/js.map$/);
  });


//get counts
  data.initiatorTypeCounts = helper.getItemCount(data.requestsOnly.map((currR, i, arr) => {
    return currR.initiatorType || currR.fileExtension;
  }), "initiatorType");

  data.initiatorTypeCountHostExt = helper.getItemCount(data.requestsOnly.map((currR, i, arr) => {
    return (currR.initiatorType || currR.fileExtension) + " " + (currR.isRequestToHost ? "(host)" : "(external)");
  }), "initiatorType");

  data.requestsByDomain = helper.getItemCount(data.requestsOnly.map((currR, i, arr) => currR.domain), "domain");

  data.fileTypeCountHostExt = helper.getItemCount(data.requestsOnly.map((currR, i, arr) => {
    return currR.fileType + " " + (currR.isRequestToHost ? "(host)" : "(external)");
  }), "fileType");

  data.fileTypeCounts = helper.getItemCount(data.requestsOnly.map((currR, i, arr) => currR.fileType), "fileType");

  var tempResponseEnd = {};
//TODO: make immutable
  data.requestsOnly.forEach((currR) => {
    var entry = data.requestsByDomain.filter((a) => a.domain == currR.domain)[0] || {};

    var lastResponseEnd = tempResponseEnd[currR.domain] || 0;

    currR.duration = entry.duration || (currR.responseEnd - currR.startTime);

    if (lastResponseEnd <= currR.startTime) {
      entry.durationTotalParallel = (entry.durationTotalParallel || 0) + currR.duration;
    } else if (lastResponseEnd < currR.responseEnd) {
      entry.durationTotalParallel = (entry.durationTotalParallel || 0) + (currR.responseEnd - lastResponseEnd);
    }
    tempResponseEnd[currR.domain] = currR.responseEnd || 0;
    entry.durationTotal = (entry.durationTotal || 0) + currR.duration;
  });


//Request counts
  data.hostRequests = data.requestsOnly
    .filter((domain) => domain.domain === location.host).length;

  data.currAndSubdomainRequests = data.requestsOnly
    .filter((domain) => domain.domain.split(".").slice(-2).join(".") === location.host.split(".").slice(-2).join("."))
    .length;

  data.crossDocDomainRequests = data.requestsOnly
    .filter((domain) => !helper.endsWith(domain.domain, document.domain)).length;

  data.hostSubdomains = data.requestsByDomain
    .filter((domain) => helper.endsWith(domain.domain, location.host.split(".").slice(-2).join(".")) && domain.domain !== location.host)
    .length;


  data.slowestCalls = [];
  data.average = undefined;

  if (data.allResourcesCalc.length > 0) {
    data.slowestCalls = data.allResourcesCalc
      .filter((a) => a.name !== location.href)
      .sort((a, b) => b.duration - a.duration);

    data.average = Math.floor(data.slowestCalls.reduceRight((a, b) => {
        if (typeof a !== "number") {
          return a.duration + b.duration
        }
        return a + b.duration;
      }) / data.slowestCalls.length);
  }
  return data;
}

var getMetricsForTiming = function () {
  const data = getTimingData();
  const perfTiming = data.perfTiming
  return {
    url: window.location.href,
    start: perfTiming.navigationStart,
    dns: perfTiming.domainLookupEnd - perfTiming.domainLookupStart,
    tcp: perfTiming.connectEnd - perfTiming.connectStart,
    total: perfTiming.loadEventEnd - perfTiming.navigationStart,
    timeToFirstByte: perfTiming.responseStart - perfTiming.navigationStart,
    domContentLoading: perfTiming.domContentLoadedEventStart - perfTiming.domLoading,
    domProcessing: perfTiming.domComplete - perfTiming.domLoading
  };
};

var getMetricsForResource = function () {
  const data = getResourcesData();
  const resources = data.allResourcesCalc.map(res=> {
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
      requestDuration: res.requestDuration,
      ssl: res.ssl
    }
  });
  return {
    url: window.location.href,
    requests: data.requestsOnly.length,
    domains: data.requestsByDomain.length,
    subDomainsOfTld: data.hostSubdomains,
    requestsToHost: data.hostRequests,
    tldAndSubdomainRequests: data.currAndSubdomainRequests,
    resources: resources
  }
};

let isReady = false;
const readyFns = [];
window.addEventListener('load', function () {
  //setTimeout 0 to make loadEventEnd available
  setTimeout(function () {
    readyFns.forEach(fn=> {
      fn()
    });
    isReady = true
  }, 0)
});

export default {
  getMetricsForTiming,
  getMetricsForResource,
  getMarkAndMeasure,
  _getResourcesData: getResourcesData,
  _getTimingData: getTimingData,
  ready(fn){
    if (isReady) {
      fn()
    } else {
      readyFns.push(fn)
    }
  }
};

