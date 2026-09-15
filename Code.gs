/* Replace the existing Apps Script with this file and update its deployment. */
const ADMIN_KEY = 'scenezy123';

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return response({error:'Server busy. Please try again.'});
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.key !== ADMIN_KEY) return response({error:'Unauthorized: Galat Key'});
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.action === 'getAllData') return response({success:true, events:getEvents(ss), leads:getLeads(ss)});
    if (data.action === 'addEvent' || data.action === 'updateEvent') {
      const sheet=ss.getSheetByName('Events');
      if(!sheet) throw new Error('Events sheet not found');
      const event=data.event;
      if(!event || !event.name || !event.venue || !Array.isArray(event.nights) || !event.nights.length || !Array.isArray(event.passes) || !event.passes.length) throw new Error('Name, venue, nights and passes required');
      if(event.nights.some(n=>!n.d || !Number.isFinite(Number(n.price)) || Number(n.price)<0) || event.passes.some(p=>!p.name || !Number.isFinite(Number(p.add)) || Number(p.add)<0)) throw new Error('Invalid night or pass pricing');
      event.id=event.id || Utilities.getUuid();
      if(data.action==='addEvent') {
        sheet.appendRow([JSON.stringify(event)]);
      } else {
        const original=data.original;
        if(!original)throw new Error('Original event required. Refresh and try again.');
        const rows=sheet.getDataRange().getValues();
        let matched=-1;
        for(let i=1;i<rows.length;i++) {
          let current;try{current=JSON.parse(rows[i][0])}catch(_){continue}
          if(original.id ? current.id===original.id : JSON.stringify(current)===JSON.stringify(original)) {
            if(matched!==-1)throw new Error('Multiple matching events. Assign unique IDs in the sheet.');
            if(JSON.stringify(current)!==JSON.stringify(original))throw new Error('Event changed. Refresh before editing again.');
            matched=i;
          }
        }
        if(matched===-1)throw new Error('Event changed or not found. Refresh before editing again.');
        sheet.getRange(matched+1,1).setValue(JSON.stringify(event));
      }
      return response({success:true,event:event});
    }
    if(data.action==='saveLead') {
      const sheet=ss.getSheetByName('Leads');
      if(!sheet)throw new Error('Leads sheet not found');
      const d=data.payload;
      if(!d || !d.ref)throw new Error('Booking reference required');
      const rows=sheet.getDataRange().getValues();
      if(!rows.slice(1).some(row=>String(row[1])===String(d.ref))) sheet.appendRow([new Date(),d.ref,d.name,d.venue,d.night,d.pass,d.qty,d.total,'New',d.waLink]);
      return response({success:true});
    }
    if(data.action==='updateStatus') {
      if(!['New','Converted','Lost'].includes(data.newStatus))throw new Error('Invalid status');
      const sheet=ss.getSheetByName('Leads');
      if(!sheet)throw new Error('Leads sheet not found');
      const rows=sheet.getDataRange().getValues();
      for(let i=1;i<rows.length;i++)if(String(rows[i][1])===String(data.ref)){
        sheet.getRange(i+1,9).setValue(data.newStatus);
        return response({success:true});
      }
      throw new Error('Ref ID not found');
    }
    return response({error:'Unknown action'});
  } catch(error) {return response({error:String(error.message || error)})}
  finally {lock.releaseLock()}
}
function getEvents(ss) {
  const sheet=ss.getSheetByName('Events');
  if(!sheet || sheet.getLastRow()<=1)return [];
  return sheet.getDataRange().getValues().slice(1).reduce((events,row)=>{try{const event=JSON.parse(row[0]);if(event && typeof event==='object')events.push(event)}catch(_){}return events},[]);
}
function getLeads(ss) {
  const sheet=ss.getSheetByName('Leads');
  if(!sheet || sheet.getLastRow()<=1)return [];
  return sheet.getDataRange().getValues().slice(1).map(r=>({ts:r[0],ref:r[1],event:r[2],venue:r[3],night:r[4],pass:r[5],qty:r[6],amount:r[7],status:r[8],waLink:r[9]})).reverse();
}
function response(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)}
