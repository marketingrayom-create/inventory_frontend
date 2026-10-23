export function uploadProgressRequest(url,{headers,body,signal,onUploadProgress},XHR=XMLHttpRequest){
 return new Promise((resolve,reject)=>{
  const xhr=new XHR();let timer,settled=false;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  const fail=error=>{if(settled)return;settled=true;cleanup();reject(error);};
  const watchdog=(ms,message)=>{clearTimeout(timer);timer=setTimeout(()=>{fail(Error(message));xhr.abort();},ms);};
  const abort=()=>{fail(new DOMException('Sync stopped','AbortError'));xhr.abort();};
  if(signal?.aborted){abort();return;}
  xhr.open('POST',url);xhr.withCredentials=true;
  headers.forEach((value,key)=>xhr.setRequestHeader(key,value));
  xhr.upload.onprogress=event=>{watchdog(120000,'Upload stalled for two minutes. Check the network and sync again.');onUploadProgress?.({loaded:event.loaded,total:event.total,stage:'uploading'});};
  xhr.upload.onload=()=>{watchdog(900000,'Server did not confirm saving the file within 15 minutes. Check the backend/database and sync again.');onUploadProgress?.({stage:'saving'});};
  xhr.onload=()=>{if(settled)return;settled=true;cleanup();resolve(new Response(xhr.responseText,{status:xhr.status,statusText:xhr.statusText,headers:{'Content-Type':xhr.getResponseHeader('Content-Type')||'application/json'}}));};
  xhr.onerror=()=>fail(Error('File upload connection failed. Check the network and sync again.'));
  xhr.onabort=()=>fail(new DOMException('Sync stopped','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});watchdog(120000,'Upload stalled for two minutes. Check the network and sync again.');xhr.send(body);
 });
}
