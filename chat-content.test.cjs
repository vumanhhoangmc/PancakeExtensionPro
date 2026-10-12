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
test('Draft message keeps local phone private, rejects replay and cancels Beta during await',async()=>{
  let listener,storageListener,enabled=true,row={},applyCalls=0,hold,guard;
  const context={
    chrome:{runtime:{id:'extension',onMessage:{addListener(fn){listener=fn;}}},storage:{onChanged:{addListener(fn){storageListener=fn;}},local:{get(defaults,fn){fn({aiAutoOrderBeta:enabled});}}}},
    document:{querySelector(){return row;},addEventListener(){}},location:{pathname:'/multi_pages'},crypto:{randomUUID(){return 'key';}},
    PancakeChatReader:{collectMessages(){return {signature:'chat',text:'địa chỉ',contactPhone:'0900000001'};}},
    PancakeAIOrderPlan:{validateDraft(){}},
    PancakeAIOrderDOM:{async applyDraft(p,t,current,phone){applyCalls++;assert.equal(phone,'0900000001');guard=current;await new Promise(resolve=>hold=resolve);current();return {draftOnly:true};}},
  };
  vm.runInNewContext(fs.readFileSync('chat-content.js','utf8'),context);
  const send=message=>new Promise(resolve=>listener(message,{id:'extension'},resolve));
  const read=await send({type:'pap-read-chat',includeAddress:true});assert.equal(read.contactPhone,undefined);assert.equal(read.signature,undefined);
  const pending=send({type:'pap-apply-draft',key:'key',proposal:{},transcript:'địa chỉ'});
  assert.equal(applyCalls,1);
  assert.equal((await send({type:'pap-apply-draft',key:'key'})).ok,false);
  enabled=false;storageListener({aiAutoOrderBeta:{newValue:false}},'local');assert.throws(guard);hold();
  assert.equal((await pending).ok,false);
  enabled=true;assert.equal((await send({type:'pap-apply-draft',key:'key'})).ok,false);assert.equal(applyCalls,1);
});
