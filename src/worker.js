import {handleApi} from './api.js';
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/'))return handleApi(request,env,{cache:caches.default,cacheNamespace:url.hostname,waitUntil:promise=>ctx.waitUntil(promise)});
    return env.ASSETS.fetch(request);
  }
};
