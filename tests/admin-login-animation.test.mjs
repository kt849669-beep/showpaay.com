import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createLoginTransition } from '../admin-app/js/login-transition.js';

function harness({valid = false, failInsert = false, fallback = false} = {}) {
  const events = [];
  let ready, submit;
  let busy = false;
  const error = {textContent:'',classList:{remove() {}},style:{}};
  const values = {email:{value:fallback ? 'admin@showpay.com' : 'owner@example.test'},password:{value:fallback ? 'admin@0123' : 'example-test'},errorMsg:error};
  const form = {addEventListener:(_, handler) => {submit = handler;},querySelector:() => ({})};
  values.adminLoginForm = form;
  const context = {
    document:{addEventListener:(_, handler) => {ready = handler;},getElementById:id => values[id] || {}},
    window:{location:{href:''}},navigator:{userAgent:'Test device'},crypto:{randomUUID:() => 'test-session'},
    console:{log() {}},
    localStorage:{setItem:(key, value) => events.push(['session',key,value])},
    createLoginTransition:() => ({begin:() => {if(busy)return false;busy = true;events.push(['begin']);return true;},complete:async () => {events.push(['complete']);},reset:() => {busy = false;events.push(['reset']);}}),
    supabase:{from(table) {
      events.push(['table',table]);
      return {select(){return this;},eq(key,value){events.push(['eq',key,value]);return this;},
        limit:async () => ({data:valid ? [{}] : []}),
        insert:async data => {events.push(['insert',data.token]);if(failInsert)throw new Error('offline');return {};}};
    }},
  };
  const source = fs.readFileSync(new URL('../admin-app/js/login.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, context);
  ready();
  return {context,events,error,submit:() => submit({preventDefault(){}})};
}
test('database-authenticated login saves the original session before finishing animation and redirecting', async () => {
  const h = harness({valid:true}); await h.submit();
  assert(h.events.some(e => e[0] === 'insert' && e[1] === 'test-session'));
  assert(h.events.findIndex(e => e[0] === 'session') < h.events.findIndex(e => e[0] === 'complete'));
  assert.equal(h.context.window.location.href, '/admin-app/pages/dashboard.html');
  assert(!h.events.some(e => e[0] === 'reset'));
});
test('existing fallback login also completes animation after saving its session', async () => {
  const h = harness({fallback:true}); await h.submit();
  assert(h.events.some(e => e[0] === 'session'));
  assert(h.events.some(e => e[0] === 'complete'));
  assert.equal(h.context.window.location.href, '/admin-app/pages/dashboard.html');
});
test('invalid credentials dismiss the overlay and never complete or navigate', async () => {
  const h = harness(); await h.submit();
  assert.equal(h.error.textContent, 'Invalid credentials');
  assert(h.events.some(e => e[0] === 'reset'));
  assert(!h.events.some(e => e[0] === 'complete' || e[0] === 'session'));
  assert.equal(h.context.window.location.href, '');
});
test('network failure in fallback session creation releases the form for another attempt', async () => {
  const h = harness({fallback:true,failInsert:true}); await h.submit(); await h.submit();
  assert.equal(h.events.filter(e => e[0] === 'begin').length, 2);
  assert.equal(h.error.textContent, 'Unable to sign in. Please try again.');
  assert.equal(h.context.window.location.href, '');
});
test('a second submit while authentication is pending does not create a second session', async () => {
  const h = harness({valid:true}); await Promise.all([h.submit(),h.submit()]);
  assert.equal(h.events.filter(e => e[0] === 'insert').length, 1);
});
test('transition starts once, supports reduced motion and resets visible/busy states', async () => {
  const priorWindow = globalThis.window;
  globalThis.window = {matchMedia:() => ({matches:true})};
  try {
    const classes = new Set();
    const attrs = new Map();
    const overlay = {hidden:true,classList:{add:(...v) => v.forEach(s => classes.add(s)),remove:(...v) => v.forEach(s => classes.delete(s))}};
    const form = {setAttribute:(k,v) => attrs.set(k,v),removeAttribute:k => attrs.delete(k)};
    const button = {textContent:'Login',disabled:false};
    const status = {textContent:''};
    const transition = createLoginTransition({form,overlay,button,status});
    assert.equal(transition.begin(),true); assert.equal(transition.begin(),false);
    assert.equal(overlay.hidden,false); assert.equal(button.disabled,true);
    await transition.complete(); assert(classes.has('is-success'));
    transition.reset(); assert.equal(overlay.hidden,true); assert.equal(button.disabled,false);
    assert.equal(button.textContent,'Login'); assert.equal(attrs.has('aria-busy'),false);
    assert.equal(classes.size,0); assert.equal(transition.begin(),true); transition.reset();
  } finally {globalThis.window = priorWindow;}
});
