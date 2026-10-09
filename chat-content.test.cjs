const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('Snapshot rejects changed conversation, changed messages, disabled Beta and wrong sender', async () => {
  let listener, enabled=true, row={}, signature='messages-v1';
  const context={
    chrome:{runtime:{id:'extension',onMessage:{addListener(fn){listener=fn;}}},storage:{local:{get(defaults,fn){fn({aiAutoOrderBeta:enabled});}}}},
    location:{pathname:'/multi_pages'},document:{querySelector(){return row;}},
    crypto:{randomUUID(){return 'snapshot-key';}},
    PancakeChatReader:{collectMessages(){return {signature,text:'Khách: lấy 2kg to',count:1};}},
  };
  vm.runInNewContext(fs.readFileSync('chat-content.js','utf8'),context);
  const send=(type,key)=>new Promise(resolve=>listener({type,key},{id:'extension'},resolve));
  assert.equal(listener({type:'pap-read-chat'},{id:'another-extension'},()=>assert.fail('Wrong sender accepted')),undefined);
  assert.equal((await send('pap-read-chat')).ok,true);
  assert.equal((await send('pap-check-chat','snapshot-key')).ok,true);
  row={};assert.equal((await send('pap-check-chat','snapshot-key')).ok,false);
  await send('pap-read-chat');signature='messages-v2';assert.equal((await send('pap-check-chat','snapshot-key')).ok,false);
  await send('pap-read-chat');enabled=false;assert.equal((await send('pap-check-chat','snapshot-key')).ok,false);
});
