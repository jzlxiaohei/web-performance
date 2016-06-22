# 收集web用户的性能数据


使用`window.performance`收集性能数据,应用于android和ios上的web页面

目前safari只支持 `Navigation Timing`,所以`resource`类的entries获取不了,
`mark`和`measure`通过[usertiming](https://github.com/nicjansma/usertiming.js)来polyfill
(为了方便,已经把这个项目的文件copy到本项目的polyfill中,用户需要首先加载里面的`usertiming.js`)


#api

`getMetricsForTiming()`

返回timing的性能数据(单位ms),目前返回的数据有:

        start: navigationStart,
        url: window.location.href,
        total: 总耗时(loadEventEnd - navigationStart),
        dns: dns lookup 耗时
        tcp: connect 耗时
        timeToFirstByte: 接受到第一个字节的耗时(responseStart - navigationStart),
        domContentLoading:  domContentLoadedEventStart - domLoading),
        domProcessing: domComplete - domLoading


`getMetricsForResource()`

返回resource的性能数据,`safari`下,此项没有意义

    requests: 统计发生时,一共多少个资源请求,
    domains: 涉及多少域名,
    subDomainsOfTdl: 本域名下的子域名个数,
    requestsToHost: host一共发起了多少请求,
    tldAndSubdomainRequests: host及其子域名一共发起了多少请求,
    resources: resources 数组,每个resources的metrics数据:

          name: res.name,
          domain: res.domain,
          fileType: res.fileType,
          initiatorType: res.initiatorType,
          fileExtension: res.fileExtension,
          loadtime: res.loadtime,
          isRequestToHost: res.isRequestToHost,
          requestStartDelay: res.requestStartDelay,//准备开始request和真正开始之间的耗时
          dns: res.dns,
          tcp: res.tcp,
          ttfb: res.ttfb, // timeToFirstByte
          requestDuration: res.requestDuration (responseStart - requestStart)
          ssl: res.ssl( connectEnd - currR.secureConnectionStart)


getMarkAndMeasure()

返回调用时的`mark`和`measure`类型的entries(`getEntryByType`),`safari`下需配和`polyfill/usertiming`一起使用,并且是模拟值

返回的格式

    data:{
        marks:[],
        measures:[]
    }

`ready(fn)`

有些性能数据,需要window.onload 后才能获取,提供一个简单的借口.注意是`onload后`,因为执行回调的时候loadEventEnd还没有值,需要一个`setTimeout`进行延迟执行.

#例子
    // 在页面比较前面的位置引入 <script src='polyfill/usertiming.js'>

    import perfObj from 'web-performance'

    perfObj.ready(function(){
        console.log(perfObj.getMetricsForTiming())
        console.log(perfObj.getMetricsForResource())
    })

    setTimeout(()=>{
        window.performance.mark('mark_end_xhr');
        window.performance.measure('mark_xhr','mark_start_xhr','mark_end_xhr');
        console.log(perfObj.getMarkAndMeasure())
    },1000)

    window.performance.mark('mark_start_xhr');


鸣谢:
   统计数据的部分代码来自项目:

   [performance-bookmarklet](https://github.com/micmro/performance-bookmarklet)

   是一个chrome和firefox的插件,可以安装,实际体验一下.







