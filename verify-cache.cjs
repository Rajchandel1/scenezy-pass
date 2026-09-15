const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const saved=new Map();let now=100000000,calls=0,fail=false;
const ctx={window:{},Date:{now:()=>now},Map,AbortController,setTimeout,clearTimeout,
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
 fetch:async()=>{calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>({success:true,events:[{id:'one'}],leads:[{ref:'test',status:'New'}]})}}
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('scenezy-api.js','utf8'),ctx);
(async()=>{
 let api=ctx.window.ScenezyAPI;
 await Promise.all([api.data('key'),api.networkData('key')]);assert.equal(calls,1,'Parallel reads deduplicate');
 assert.equal((await api.data('key')).cached,true);assert.equal(calls,1);
 assert(!saved.get('scenezy.events.v2').includes('leads'),'Public event cache excludes leads');
 vm.runInContext(fs.readFileSync('scenezy-api.js','utf8'),ctx);api=ctx.window.ScenezyAPI;
 await api.data('key');assert.equal(calls,1,'Reload reuses localStorage');
 now+=api.eventTTL+1;await api.data('key');assert.equal(calls,2,'Expired cache refreshes');
 await api.data('key',{force:true});assert.equal(calls,3,'Manual refresh bypasses cache');
 await api.data('key',{admin:true});assert.equal(calls,4);
 await api.data('key',{admin:true});assert.equal(calls,4,'Admin cache reused');
 now+=api.adminTTL+1;await api.data('key',{admin:true});assert.equal(calls,5);
 await api.data('another-key',{admin:true});assert.equal(calls,6,'Different login cannot reuse dashboard');
 now+=api.eventTTL+1;fail=true;assert.equal((await api.data('key')).stale,true,'Offline retains cached events');
 await assert.rejects(api.data('key',{force:true}),/offline/);
 saved.set('scenezy.events.v2','{invalid');assert.equal(api.read('events.v2'),null);
 ctx.localStorage.setItem=()=>{throw Error('storage disabled')};api.cacheEvents([]);
 console.log('PASS: read deduplication, reload cache, TTLs, manual refresh, admin isolation, offline fallback, corrupt/blocked storage.');
})().catch(error=>{console.error(error);process.exitCode=1});
