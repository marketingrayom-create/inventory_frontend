import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scanBrowserFolder,skipFolderEntry,staleFolderRecords,matchingFolderRecord} from '../src/services/browserFolderSync.js';
function directory(name,entries){return {name,kind:'directory',async *values(){yield* entries;}};}
function entry(name,content,modified){return {name,kind:'file',getFile:async()=>new File([content],name,{lastModified:modified})};}
test('local folder scan preserves nested paths, skips protected locations, and updates only changed files',async()=>{
 const uploads=[];let heartbeat;
 const root=directory('Documents',[directory('.ssh',[entry('key','secret',1)]),entry('.env','secret',1),directory('Invoices',[entry('new.txt','new',200),entry('same.txt','old',100)])]);
 const request=async(route,options)=>{
  if(route.includes('/file?'))return {file:route.includes('same.txt')?{sourceSize:3,mtimeMs:100}:null};
  if(route.endsWith('/file')){uploads.push({path:options.body.get('path'),mtime:options.body.get('mtimeMs'),bytes:await options.body.get('file').text()});return {};}
  if(route.endsWith('/heartbeat'))heartbeat=JSON.parse(options.body);
  return {};
 };
 assert.equal(await scanBrowserFolder({sourceId:'source',token:'token',handle:root,includeSubfolders:true},{request}),'');
 assert.deepEqual(uploads,[{path:'Invoices/new.txt',mtime:'200',bytes:'new'}]);assert.deepEqual(heartbeat,{error:'',folders:['Invoices'],syncedFiles:2,failedFiles:0,complete:true});
 assert.equal(skipFolderEntry('.env.local'),true);assert.equal(skipFolderEntry('Invoices'),false);
});
test('paused or disconnected source prevents any local folder enumeration',async()=>{
 const handle={async *values(){assert.fail('Do not read a disconnected folder');}};
 await assert.rejects(scanBrowserFolder({sourceId:'source',handle},{request:async()=>{throw Object.assign(Error('Paused'),{status:409});}}),/Paused/);
});
test('subfolders are excluded by default and cannot be enabled by a stale browser record',async()=>{
 const uploaded=[];
 const handle=directory('Selected',[entry('direct.txt','a',1),directory('Other folder',[entry('nested.txt','b',2)])]);
 await scanBrowserFolder({sourceId:'source',handle,includeSubfolders:true},{request:async(route,options)=>{
  if(route.endsWith('/source'))return {source:{includeSubfolders:false}};
  if(route.includes('/file?'))return {file:null};
  if(route.endsWith('/file'))uploaded.push(options.body.get('path'));
  return {};
 }});
 assert.deepEqual(uploaded,['direct.txt']);
});
test('aborting a scan prevents file uploads',async()=>{
 const controller=new AbortController();controller.abort();let uploaded=false;
 await assert.rejects(scanBrowserFolder({sourceId:'source',handle:directory('Docs',[entry('file.txt','text',1)])},{signal:controller.signal,request:async(route)=>{if(route.endsWith('/file'))uploaded=true;return {};}}),{name:'AbortError'});
 assert.equal(uploaded,false);
});
test('database deletion removes only previously checked local connections; new selections survive older responses',()=>{
 const records=[{sourceId:'deleted'},{sourceId:'active'},{sourceId:'just-connected'}];
 assert.deepEqual(staleFolderRecords(records,[{_id:'active'}],['deleted','active']),[{sourceId:'deleted'}]);
 assert.deepEqual(staleFolderRecords(records,[],['deleted','active']),[{sourceId:'deleted'},{sourceId:'active'}]);
 assert.deepEqual(staleFolderRecords(records,[],[]),[]);
});
test('renamed folder handles reuse the existing saved source and never match another account',async()=>{
 const record={userId:'owner',sourceId:'saved',handle:{identity:'same-folder'}};
 const handle={name:'New name',isSameEntry:async other=>other.identity==='same-folder'};
 assert.equal((await matchingFolderRecord([record],'owner',handle)).sourceId,'saved');assert.equal(await matchingFolderRecord([record],'other-account',handle),null);
});
test('files removed before upload report incomplete sync rather than success',async()=>{
 let heartbeat;const handle=directory('Docs',[{name:'missing.pdf',kind:'file',getFile:async()=>{throw new DOMException('File removed','NotFoundError');}}]);
 const warning=await scanBrowserFolder({sourceId:'source',handle},{request:async(route,options)=>{if(route.endsWith('/heartbeat'))heartbeat=JSON.parse(options.body);return {};}});
 assert.match(warning,/missing.pdf/);assert.equal(heartbeat.complete,false);assert.equal(heartbeat.failedFiles,1);assert.equal(heartbeat.syncedFiles,0);
});
test('upload body uses copied bytes if the local file disappears after snapshot read',async()=>{
 let uploaded,read=false;
 const handle=directory('Docs',[{name:'bill.pdf',kind:'file',getFile:async()=>({size:3,lastModified:10,type:'application/pdf',arrayBuffer:async()=>{assert.equal(read,false);read=true;return new TextEncoder().encode('PDF').buffer;}})}]);
 await scanBrowserFolder({sourceId:'source',handle},{request:async(route,options)=>{if(route.includes('/file?'))return {file:null};if(route.endsWith('/file'))uploaded=await options.body.get('file').text();return {};}});
 assert.equal(uploaded,'PDF');assert.equal(read,true);
});
test('deleting the synced root reports retained archive instead of a failed file',async()=>{
 let heartbeat;
 const handle={async *values(){throw new DOMException('Directory removed','NotFoundError');}};
 const result=await scanBrowserFolder({sourceId:'source',handle},{request:async(route,options)=>{
  if(route.endsWith('/heartbeat'))heartbeat=JSON.parse(options.body);
  return {source:{includeSubfolders:true,lastCompleteAt:new Date()}};
 }});
 assert.equal(result,'Local folder removed — saved copy retained.');
 assert.equal(heartbeat.localMissing,true);
 assert.equal(heartbeat.failedFiles,0);
 assert.equal(heartbeat.complete,false);
 assert.equal(heartbeat.error,'');
});

test('unchanged automatic scan retains complete status and never starts an upload',async()=>{
 const calls=[];const handle=directory('Docs',[entry('same.txt','old',100)]);
 await scanBrowserFolder({sourceId:'source',handle},{request:async(route)=>{calls.push(route);if(route.includes('/file?'))return {file:{sourceSize:3,mtimeMs:100}};return {};},onProgress:()=>assert.fail('Unchanged files must not display upload progress')});
 assert.equal(calls.some(route=>route.endsWith('/start')),false);
 assert.equal(calls.some(route=>route.endsWith('/file')),false);
 assert.equal(calls.some(route=>route.endsWith('/heartbeat')),true);
});
test('changed file starts syncing once before upload',async()=>{
 const calls=[];await scanBrowserFolder({sourceId:'source',handle:directory('Docs',[entry('a.txt','new',100),entry('b.txt','new',200)])},{request:async(route)=>{calls.push(route);return {};}});
 assert.equal(calls.filter(route=>route.endsWith('/start')).length,1);
 assert.ok(calls.findIndex(route=>route.endsWith('/start'))<calls.findIndex(route=>route.endsWith('/file')));
});

test('batched metadata detects new files and same-size updates on the next scan',async()=>{
 let files=[entry('existing.txt','old',100)],stored=[{relativePath:'existing.txt',sourceSize:3,mtimeMs:100}],uploads=[];
 const handle={async *values(){yield* files;}};
 const request=async(route,options)=>{if(route.endsWith('/manifest'))return {files:stored,next:null};if(route.includes('/file?'))assert.fail('Manifest avoids per-file requests');if(route.endsWith('/file')){uploads.push(options.body.get('path'));const file=options.body.get('file');stored=stored.filter(value=>value.relativePath!==options.body.get('path'));stored.push({relativePath:options.body.get('path'),sourceSize:file.size,mtimeMs:Number(options.body.get('mtimeMs'))});}return {};};
 await scanBrowserFolder({sourceId:'source',handle},{request});assert.deepEqual(uploads,[]);
 files=[entry('existing.txt','NEW',200),entry('added.txt','added',300)];
 await scanBrowserFolder({sourceId:'source',handle},{request});assert.deepEqual(uploads,['existing.txt','added.txt']);uploads=[];
 await scanBrowserFolder({sourceId:'source',handle},{request});assert.deepEqual(uploads,[]);
});
