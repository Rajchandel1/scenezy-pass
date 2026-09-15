const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const file of ['index.html','admin.html'])for(const match of fs.readFileSync(file,'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(match[1]);
const event={name:'First night',venue:'Farm',nights:[{d:'11 Oct',day:'Sun',price:750}],passes:[{name:'Regular',note:'Entry',add:0}]};
const tables={Events:[['Event'],[JSON.stringify(event)]],Leads:[['Timestamp','Ref','Event','Venue','Night','Pass','Qty','Amount','Status','WhatsApp']]};
let releases=0;
const context={console,LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>releases++})},Utilities:{getUuid:()=> 'generated-id'},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>({getLastRow:()=>tables[name].length,getDataRange:()=>({getValues:()=>tables[name].map(r=>r.slice())}),appendRow:r=>tables[name].push(r),getRange:(row,col)=>({setValue:value=>tables[name][row-1][col-1]=value})})})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})}};
vm.createContext(context);vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);
function call(data){return JSON.parse(context.doPost({postData:{contents:JSON.stringify({key:'scenezy123',...data})}}))}
assert.match(call({key:'bad',action:'getAllData'}).error,/Unauthorized/);
let edited={...event,id:'event-1',name:'Edited night',venue:'New venue',nights:[{d:'12 Oct',day:'Mon',price:900}],passes:[{name:'VIP',note:'Front row',add:200}]};
assert.equal(call({action:'updateEvent',original:event,event:edited}).success,true);
assert.equal(tables.Events.length,2,'Edit must replace a row, never append');
assert.deepEqual(call({action:'getAllData'}).events[0],edited);
assert.match(call({action:'updateEvent',original:event,event:edited}).error,/changed|not found/);
const second={...edited,name:'Second edit'};
assert.equal(call({action:'updateEvent',original:edited,event:second}).success,true);
const hidden={...second,hidden:true};
assert.equal(call({action:'updateEvent',original:second,event:hidden}).success,true);
assert.equal(call({action:'getAllData'}).events[0].hidden,true);
assert.equal(call({action:'getAllData'}).events.filter(e=>e.hidden!==true).length,0);
assert.equal(call({action:'updateEvent',original:hidden,event:second}).success,true);
assert.equal(call({action:'getAllData'}).events.filter(e=>e.hidden!==true).length,1);
assert.match(call({action:'updateEvent',original:second,event:{...second,nights:[{d:'12 Oct',price:-1}]}}).error,/pricing/);
const payload={ref:'SZ-TEST',name:'Edited night',venue:'New venue',night:'12 Oct',pass:'VIP',qty:2,total:2200,waLink:'https://wa.me/123'};
assert.equal(call({action:'saveLead',payload}).success,true);
assert.equal(call({action:'saveLead',payload}).success,true);
assert.equal(tables.Leads.length,2,'Same reference must not duplicate a lead');
for(const status of ['Converted','Lost','New']){
 assert.equal(call({action:'updateStatus',ref:payload.ref,newStatus:status}).success,true);
 assert.equal(call({action:'getAllData'}).leads[0].status,status);
}
assert.match(call({action:'updateStatus',ref:payload.ref,newStatus:'Other'}).error,/Invalid status/);
const html=fs.readFileSync('index.html','utf8');
const copy=html.match(/function ticketCopy\(t\) \{([\s\S]*?)\n      \}/)[1];
const nodes={};const renderCopy=new Function('t','$',copy);
for(const status of ['New','Converted','Lost']){
 renderCopy({status},selector=>nodes[selector]??={});
 assert.equal(nodes['.tHero h2'].textContent==='You’re going!',status==='Converted');
}
assert(html.includes('id="eventHeading" hidden'));
assert(html.includes('showTicket(t, true)'));
console.log('PASS: syntax, legacy/full event edits, conflict detection, pricing validation, lead deduplication, all status transitions, confirmation copy, initial loading visibility.');
