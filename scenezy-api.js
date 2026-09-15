/* Shared transport for the supplied Google Apps Script deployment. */
window.ScenezyAPI = {
  eventTTL: 6 * 60 * 60 * 1000,
  adminTTL: 2 * 60 * 1000,
  read(name) { try { return JSON.parse(localStorage.getItem('scenezy.'+name)); } catch { return null; } },
  write(name, value) { try { localStorage.setItem('scenezy.'+name,JSON.stringify(value)); } catch {} },
  remove(name) { try { localStorage.removeItem('scenezy.'+name); } catch {} },
  cacheEvents(events) { this.write('events.v2',{at:Date.now(),events}); },
  cacheAdmin(data, key, at=Date.now()) { this.write('admin.v2',{at,key,events:data.events,leads:data.leads}); },
  async networkData(key) {
    this.reads ||= new Map();
    if(this.reads.has(key))return this.reads.get(key);
    const request=this.call({action:'getAllData'},key).then(data=>{this.cacheEvents(data.events);return data}).finally(()=>this.reads.delete(key));
    this.reads.set(key,request);return request;
  },
  async data(key, {admin=false,force=false}={}) {
    const cached=this.read(admin?'admin.v2':'events.v2');
    const valid=cached && Array.isArray(cached.events) && (!admin || (cached.key===key && Array.isArray(cached.leads)));
    const ttl=admin?this.adminTTL:this.eventTTL;
    if(!force && valid && Date.now()-cached.at<ttl)return {...cached,success:true,leads:cached.leads||[],cached:true};
    try {
      const data=await this.networkData(key);
      if(admin)this.cacheAdmin(data,key);
      return data;
    } catch(error) {
      if(!force && valid && !/Unauthorized/i.test(error.message))return {...cached,success:true,leads:cached.leads||[],cached:true,stale:true};
      throw error;
    }
  },
  url: 'https://script.google.com/macros/s/AKfycbwc4RDdlvvkQth7jgoAI7iqt68IXf89VwVW3XxzZByWAw9paejwVIJ5fXqjyu633VoWGw/exec',
  async call(params, key) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(this.url, {
        method: 'POST', redirect: 'follow', signal: controller.signal,
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({...params, key})
      });
      if (!res.ok) {
        const hint=res.status===401||res.status===403 ? 'Check deployment access and authorization.' : res.status===404 ? 'Check the deployed /exec URL.' : 'Check Apps Script deployment and executions.';
        throw new Error('API HTTP '+res.status+'. '+hint);
      }
      let data;
      try { data = await res.json(); }
      catch { throw new Error('API response invalid. Check Apps Script deployment.'); }
      if (!data || data.error || data.success !== true) throw new Error(data?.error || 'Request unsuccessful.');
      if (params.action === 'getAllData' && (!Array.isArray(data.events) || !Array.isArray(data.leads))) throw new Error('Invalid event data received.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Request timed out. For a save, refresh before retrying.');
      throw error;
    } finally { clearTimeout(timer); }
  },
  busy(button, active, label = 'Saving') {
    if (active) { button.dataset.idle = button.innerHTML; button.innerHTML = '<span class="loading-orbit" aria-hidden="true"></span><span>' + label + '</span>'; }
    else if (button.dataset.idle) button.innerHTML = button.dataset.idle;
    button.disabled = active;
    button.setAttribute('aria-busy', String(active));
  }
};
