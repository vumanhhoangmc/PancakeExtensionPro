const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup({draft='',comment=true,recording=false}={}) {
  let now=0, serial=0, storageListener, selected=null, item={textContent:'old'};
  const queue=new Map(), listeners={}, events=[];
  class Element { getBoundingClientRect(){return {width:100,height:40};} matches(){return comment;} }
  class Textarea extends Element { get value(){return this._value || '';} set value(v){this._value=v;} dispatchEvent(e){events.push(e.type);} }
  const composer=new Textarea(); composer.value=draft;
  const row=new Element();row.isConnected=true;row.classList={contains(){return false;}};row.querySelector=()=>({className:'list_tags_conv_123_456 list-tags-conv'});
  const target=new Element();target.closest=s=>s==='.conversation-list-item'?row:null;
  const document={addEventListener(type,fn){listeners[type]=fn;},getElementById(id){return id==='message_123_456'?item:null;},querySelector(s){return s==='.conversation-list-item.selected'?selected:s.includes('comment-message-ele')?item:s.includes('replyBoxComposer')?composer:s.includes('post-module')?new Element():null;}};
  const context={document,Element,HTMLTextAreaElement:Textarea,location:{pathname:'/multi_pages',search:'',hash:''},getComputedStyle:()=>({visibility:'visible'}),Event:class {constructor(type){this.type=type;}},Date:{now:()=>now},setTimeout(fn,ms){const id=++serial;queue.set(id,{fn,at:now+ms});return id;},clearTimeout(id){queue.delete(id);},chrome:{storage:{local:{get(_,fn){fn({autoCommentReply:true,uiRecording:recording});}},onChanged:{addListener(fn){storageListener=fn;}}}}};
  vm.runInNewContext(fs.readFileSync('comment-reply.js','utf8'),context);
  return {composer,events,click(){listeners.click({target,isTrusted:true});},ready(replace=false){selected=replace?{querySelector:row.querySelector}:row;row.isConnected=!replace;item=new Element();item.textContent='new';},advance(ms=100){const until=now+ms;for(let steps=0;queue.size&&steps<200;steps++){const [id,job]=[...queue.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(job.at>until)break;queue.delete(id);now=job.at;job.fn();}now=until;},disable(){storageListener({autoCommentReply:{newValue:false}},'local');},type(){listeners.input({isTrusted:true});},pending(){return queue.size;}};
}
test('Comment fills exact two-line draft with input/change only; never sends',()=>{
  const app=setup();app.click();app.ready();app.advance();
  assert.equal(app.composer.value,'Dạ em đã gửi tin nhắn cho mình rồi đó ạ 🥰\nAnh/chị vui lòng kiểm tra tin nhắn giúp em nha.');
  assert.deepEqual(app.events,['input','change']);assert.equal(app.pending(),0);
});
test('Inbox and recording mode do not fill',()=>{
  for(const options of [{comment:false},{recording:true}]){const app=setup(options);app.click();app.ready();app.advance();assert.equal(app.composer.value,'');}
});
test('Existing draft is preserved',()=>{const app=setup({draft:'Đang soạn riêng'});app.click();app.ready();app.advance();assert.equal(app.composer.value,'Đang soạn riêng');assert.deepEqual(app.events,[]);});
test('Waits for selected comment; timeout leaves old composer empty',()=>{const app=setup();app.click();app.advance(5000);assert.equal(app.composer.value,'');assert.equal(app.pending(),0);});
test('Turning switch off or typing cancels pending fill',()=>{for(const action of ['disable','type']){const app=setup();app.click();app[action]();app.ready();app.advance();assert.equal(app.composer.value,'');assert.equal(app.pending(),0);}});
test('New click invalidates earlier task and fills once',()=>{const app=setup();app.click();app.click();app.ready();app.advance();assert.deepEqual(app.events,['input','change']);});
test('React replaces clicked row: same conversation key still fills correct comment',()=>{const app=setup();app.click();app.ready(true);app.advance();assert.deepEqual(app.events,['input','change']);});
