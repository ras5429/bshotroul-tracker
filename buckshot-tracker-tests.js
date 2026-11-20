const fs = require('fs');
const vm = require('vm');

class El {
  constructor(tag){
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this._innerHTML = '';
    this.title = '';
    this.onclick = null;
    this.checked = false;
    this.value = '';
  }
  set innerHTML(value){ this._innerHTML = String(value); this.children = []; }
  get innerHTML(){ return this._innerHTML; }
  appendChild(el){ this.children.push(el); return el; }
  setAttribute(k,v){ this.attributes[k] = String(v); }
  getAttribute(k){ return this.attributes[k] || null; }
  addEventListener(){}
}

const ids = {};
function el(id){
  if(!ids[id]) ids[id] = new El('div');
  return ids[id];
}

const document = {
  getElementById: el,
  createElement: tag => new El(tag),
  createElementNS: (ns, tag) => new El(tag),
  querySelectorAll: () => [],
};

const context = {
  document,
  navigator: { clipboard: { writeText: async () => {} } },
  alert: msg => { throw new Error('Unexpected alert: ' + msg); },
  console,
  setTimeout,
  clearTimeout,
};
context.window = context;
context.globalThis = context;

const path = require('path');
// Usage: node buckshot-tracker-tests.js [path-to-html]  (defaults to the tracker next to this file)
const htmlPath = process.argv[2] || path.join(__dirname, 'buckshot-roulette-tracker.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1] + `
globalThis.__api = {
  setCounts(l,b){ chosenLive=l; chosenBlank=b; },
  startRound, render, tapOutcome, refreshKnownFromSources, undoFrom, closeModal,
  setShowLog(v){ showLog = v; },
  shells(){ return shells; },
  log(){ return log; },
  ids: globalThis.__ids
};`;
context.__ids = ids;
vm.createContext(context);
vm.runInContext(script, context);

function assert(name, condition){
  if(!condition) throw new Error(name);
  console.log('PASS', name);
}

function assertHtml(name, pattern){
  assert(name, pattern.test(html));
}

function deepText(node){
  if(!node) return '';
  return [node.textContent || '', node.innerHTML || '', ...(node.children || []).map(deepText)].join(' ');
}

function reset(l,b){
  context.__api.setCounts(l,b);
  context.__api.startRound();
}

function modalOptions(){
  const body = ids['modal-body'];
  const container = body.children.find(c => c.className === 'modal-opts');
  return container ? container.children : [];
}

function choose(type){
  const opts = modalOptions();
  const idx = type === 'live' ? 0 : 1;
  assert(`modal has ${type} option`, !!opts[idx]);
  assert(`${type} option is clickable`, typeof opts[idx].onclick === 'function');
  opts[idx].onclick();
}

// 1/2: two blanks are already out. Last shell with inverter armed must only allow blank output.
reset(1,2);
let shells = context.__api.shells();
shells[0].resolution = 'fire';
shells[0].knownType = 'blank';
shells[0].loadedType = 'blank';
shells[0].consumed = true;
shells[1].resolution = 'eject';
shells[1].knownType = 'blank';
shells[1].loadedType = 'blank';
shells[1].consumed = true;
shells[2].resolution = 'fire';
shells[2].polarity = true;
context.__api.render();
context.__api.tapOutcome(2);
let opts = modalOptions();
assert('inverted last shell disables live as impossible', !opts[0].onclick && opts[0].style.cursor === 'not-allowed');
assert('inverted last shell leaves blank clickable', typeof opts[1].onclick === 'function');
assert('impossible option does not close modal or update ejected', !shells[2].loadedType);
const modalBeforeImpossibleClick = ids['modal'].style.display;
if(opts[0].onclick) opts[0].onclick();
assert('clicking impossible option leaves modal open', ids['modal'].style.display === modalBeforeImpossibleClick && ids['modal'].style.display === 'flex');
assert('clicking impossible option still leaves ejected empty', !shells[2].loadedType);

// Armed inverter before action must not affect count-table inversion/tube values.
reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].polarity = true;
context.__api.render();
assert('unresolved inverter does not add live inversion loss', ids['t-live-lose'].textContent === '—');
assert('unresolved inverter does not add blank inversion gain', ids['t-blank-gain'].textContent === '—');
assert('unresolved inverter leaves live in-tube count alone', ids['t-live-tube'].textContent === 1 || ids['t-live-tube'].textContent === '1');
assert('unresolved inverter leaves blank in-tube count alone', ids['t-blank-tube'].textContent === 1 || ids['t-blank-tube'].textContent === '1');

// Mirror clear should clear Claimed if no phone remains.
reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'blank';
shells[0].knownType = 'blank';
context.__api.render();
ids['shell-row'].children[0].children[2].onclick();
assert('clearing mirror clears Claimed type', shells[0].knownType === null);
assert('clearing mirror restores next-shell probability to mixed odds', deepText(ids['prob-next']).includes('50%'));

// Ejected pill should stay unknown until the action is completed.
reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].polarity = true;
context.__api.render();
assert('ejected pill remains unknown before action', ids['shell-row'].children[0].children[9].className.includes('unknown'));

// Selected method can be cleared.
reset(1,1);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.render();
ids['shell-row'].children[0].children[6].onclick();
ids['modal-body'].children[2].onclick();
assert('selected fire/eject method can be cleared', shells[0].resolution === null);

reset(1,1);
shells = context.__api.shells();
shells[0].resolution = 'eject';
context.__api.render();
assert('beer emoji is used for eject action', ids['shell-row'].children[0].children[7].textContent === '🍺' && ids['shell-row'].children[0].children[7].textContent === '🍺');
assert('beer emoji is used in help text', html.includes('💥 / 🍺') && html.includes('beer eject shows 🍺'));

assertHtml('count table has merged Inversions header', /<th colspan="2" title="Completed inverter flips">Inversions<\/th>/);
assertHtml('Claimed header tooltip warns user values affect probability', /title="Claimed[^"]*You are responsible for these values; they affect probability/i);
assertHtml('Ejected header tooltip explains final values override Claimed', /title="Ejected[^"]*Once populated, these values affect probability and override incorrect Claimed entries/i);
assertHtml('help text documents completed inversion columns', /\['Inversions','Completed flips','The \+ and − columns show shells gained or lost by completed inverter actions/);

// Phone lifecycle: future phone affects probability, can clear, survives earlier shell resolution.
reset(2,2);
shells = context.__api.shells();
shells[3].hasPhone = true;
shells[3].phoneType = 'blank';
shells[3].knownType = 'blank';
context.__api.render();
assert('future phone prediction affects probability immediately', deepText(ids['prob-next']).includes('67%') && deepText(ids['prob-next']).includes('33%'));
shells[3].hasPhone = false;
shells[3].phoneType = null;
context.__api.refreshKnownFromSources(shells[3]);
context.__api.render();
assert('clearing future phone restores probability', deepText(ids['prob-next']).includes('50%'));
shells[3].hasPhone = true;
shells[3].phoneType = 'blank';
shells[3].knownType = 'blank';
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('live');
assert('future phone prediction survives resolving earlier shell', shells[3].hasPhone && shells[3].knownType === 'blank');

// Phone mismatch: outcome wins, Claimed remains flagged, no auto-invert.
reset(2,2);
shells = context.__api.shells();
shells[1].hasPhone = true;
shells[1].phoneType = 'blank';
shells[1].knownType = 'blank';
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].resolution = 'fire';
context.__api.tapOutcome(1);
choose('live');
assert('phone mismatch accepts ejected as truth', shells[1].loadedType === 'live');
assert('phone mismatch keeps Claimed value and marks mismatch', shells[1].knownType === 'blank' && shells[1].knownMismatch);
assert('phone mismatch does not auto-invert', shells[1].polarity === false);

// Mirror lifecycle: phone fallback, direct fire without extra prompt, mismatch flagging.
reset(2,2);
shells = context.__api.shells();
shells[0].hasPhone = true;
shells[0].phoneType = 'live';
shells[0].hasMirror = true;
shells[0].mirrorType = 'blank';
shells[0].knownType = 'blank';
context.__api.render();
ids['shell-row'].children[0].children[2].onclick();
assert('clearing mirror falls back to phone Claimed value', shells[0].knownType === 'live');

reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('live');
assert('mirror fire asks for outcome and resolves with choice', shells[0].consumed && shells[0].loadedType === 'live');

reset(2,2);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'blank';
shells[0].knownType = 'blank';
shells[0].resolution = 'eject';
context.__api.tapOutcome(0);
choose('live');
assert('mirror mismatch via beer keeps Claimed and flags mismatch', shells[0].loadedType === 'live' && shells[0].knownType === 'blank' && shells[0].knownMismatch);

// Dealer flows: hides dependent controls, no manual inverter, asks when possible, auto-inverts only when impossible.
reset(1,1);
shells = context.__api.shells();
shells[0].isDealer = true;
context.__api.render();
assert('dealer hides phone mirror and method cells', ids['shell-row'].children[0].children[1].textContent === '' && ids['shell-row'].children[0].children[2].textContent === '' && ids['shell-row'].children[0].children[6].textContent === '');
assert('dealer does not allow manual inverter', ids['shell-row'].children[0].children[4].className.includes('hidden'));
context.__api.tapOutcome(0);
choose('live');
assert('possible dealer outcome asks whether dealer used the inverter', ids['modal-title'].textContent === 'Did the dealer use the inverter?');
assert('dealer inverter prompt uses Yes/No only', modalOptions()[0].textContent === 'Yes' && modalOptions()[1].textContent === 'No');
modalOptions()[1].onclick();
assert('dealer no-inverter path records normal ejection', shells[0].consumed && shells[0].loadedType === 'live' && !shells[0].polarity);

reset(1,2);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].resolution = 'eject';
context.__api.tapOutcome(1);
choose('blank');
shells[2].isDealer = true;
context.__api.render();
context.__api.tapOutcome(2);
choose('blank');
assert('dealer impossible count auto-inverts', shells[2].consumed && shells[2].loadedType === 'blank' && shells[2].knownType === 'live' && shells[2].polarity);

// Undo: clears resolved values at and after rewind point, preserves future phone peeks, restores counts.
reset(2,2);
shells = context.__api.shells();
shells[3].hasPhone = true;
shells[3].phoneType = 'live';
shells[3].knownType = 'live';
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].resolution = 'eject';
context.__api.tapOutcome(1);
choose('live');
context.__api.undoFrom(0);
assert('undo clears rewind shell consumed state', !shells[0].consumed && !shells[0].loadedType);
assert('undo clears later resolved shell state', !shells[1].consumed && !shells[1].loadedType);
assert('undo preserves future phone peek', shells[3].hasPhone && shells[3].knownType === 'live');
assert('undo restores ejected counts', String(ids['t-live-eject'].textContent) === '0' && String(ids['t-blank-eject'].textContent) === '0');
assert('undo keeps prior log history and appends undo', context.__api.log().some(e=>e.msg.includes('Blind fire')) && context.__api.log().some(e=>e.msg.includes('Undo')));

// Count-table invariants through a completed inverter.
reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].polarity = true;
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
assert('completed inverter records flipped output', shells[0].loadedType === 'blank' && shells[0].knownType === 'live');
assert('completed inverter updates inversion columns', String(ids['t-live-lose'].textContent) === '1' && String(ids['t-blank-gain'].textContent) === '1');
assert('valid flow keeps tube counts non-negative', Number(ids['t-live-tube'].textContent) >= 0 && Number(ids['t-blank-tube'].textContent) >= 0);

// Last-shell math without inverter.
reset(1,2);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].resolution = 'eject';
context.__api.tapOutcome(1);
choose('blank');
shells[2].resolution = 'fire';
context.__api.tapOutcome(2);
opts = modalOptions();
assert('last shell without inverter only allows live', typeof opts[0].onclick === 'function' && !opts[1].onclick);

// Last shell with wrong phone prediction is not overwritten by auto-fill.
reset(1,1);
shells = context.__api.shells();
shells[1].hasPhone = true;
shells[1].phoneType = 'blank';
shells[1].knownType = 'blank';
shells[0].resolution = 'fire';
shells[0].knownType = 'blank';
shells[0].loadedType = 'blank';
shells[0].consumed = true;
context.__api.render();
assert('last shell phone prediction is not auto-overwritten', shells[1].knownType === 'blank');

// Event log shape.
reset(1,1);
shells = context.__api.shells();
shells[1].hasPhone = true;
shells[1].phoneType = 'live';
shells[1].knownType = 'live';
context.__api.log().push({ shellIdx: 1, msg: '☎️ Phone: live' });
context.__api.setShowLog(true);
context.__api.render();
assert('event log shell numbers are one-based', deepText(ids['log-list']).includes('Shell 2'));
assert('event log message does not duplicate shell number', !deepText(ids['log-list']).includes('shell 2'));

// Future phone claim should not block current shell options (bug fix from chat)
reset(1,1);
shells = context.__api.shells();
shells[1].hasPhone = true;
shells[1].phoneType = 'blank';
shells[1].knownType = 'blank';
shells[0].hasMirror = true;
shells[0].mirrorType = 'blank';
shells[0].knownType = 'blank';
shells[0].resolution = 'fire';
context.__api.render();
context.__api.tapOutcome(0);
const opts1 = modalOptions();
assert('future phone claim does not disable current shell blank option', typeof opts1[1].onclick === 'function');
assert('future phone claim does not disable current shell live option', typeof opts1[0].onclick === 'function');
choose('blank');

// Undo shows correct shell number not "Shell 0" (bug fix from chat)
reset(2,2);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('live');
shells[1].resolution = 'fire';
context.__api.tapOutcome(1);
choose('blank');
context.__api.undoFrom(1);
const undoLog = context.__api.log().find(e => e.msg.includes('Undo'));
assert('undo log uses correct shell index not -1', undoLog.shellIdx === 1);
assert('undo log renders with correct shell number', deepText(ids['log-list']).includes('Shell 2') && deepText(ids['log-list']).includes('Undo'));

// Armed inverter flips probability display (bug fix from chat)
reset(3,4);
shells = context.__api.shells();
shells[0].resolution = 'fire';
shells[0].loadedType = 'live';
shells[0].consumed = true;
shells[1].resolution = 'fire';
shells[1].loadedType = 'blank';
shells[1].consumed = true;
shells[2].resolution = 'fire';
shells[2].loadedType = 'live';
shells[2].consumed = true;
shells[3].resolution = 'fire';
shells[3].polarity = true;
shells[3].loadedType = 'live';
shells[3].consumed = true;
shells[4].hasPhone = true;
shells[4].phoneType = 'blank';
shells[4].knownType = 'blank';
shells[6].hasPhone = true;
shells[6].phoneType = 'blank';
shells[6].knownType = 'blank';
context.__api.render();
assert('claimed blank shows 100% blank probability', deepText(ids['prob-next']).includes('100') && deepText(ids['prob-next']).includes('blank'));
shells[4].polarity = true;
context.__api.render();
assert('armed inverter on claimed blank flips to 100% live', deepText(ids['prob-next']).includes('100') && deepText(ids['prob-next']).includes('live'));

// Inverter mismatch detection for fire (bug fix from chat)
reset(1,1);
shells = context.__api.shells();
shells[0].hasPhone = true;
shells[0].phoneType = 'blank';
shells[0].knownType = 'blank';
shells[0].polarity = true;
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
assert('inverter fire mismatch keeps claimed prediction', shells[0].knownType === 'blank'); // keeps original phone prediction
assert('inverter fire mismatch sets knownMismatch flag', shells[0].knownMismatch === true);
assert('inverter fire mismatch log mentions expected value', context.__api.log().some(e => e.msg.includes('Expected') && e.msg.includes('live')));

// Inverter mismatch detection for beer (bug fix from chat)
reset(1,1);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].polarity = true;
shells[0].resolution = 'eject';
context.__api.tapOutcome(0);
choose('live');
assert('inverter beer mismatch keeps claimed prediction', shells[0].knownType === 'live'); // keeps original mirror prediction
assert('inverter beer mismatch sets knownMismatch flag', shells[0].knownMismatch === true);
assert('inverter beer mismatch log mentions expected value', context.__api.log().some(e => e.msg.includes('Expected') && e.msg.includes('blank')));

// Comprehensive inverter mismatch scenario: 3/4 game with multiple shells and mismatch affecting counts
reset(3,4);
shells = context.__api.shells();
// Shell 1: fire live
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('live');
// Shell 2: fire blank
shells[1].resolution = 'fire';
context.__api.tapOutcome(1);
choose('blank');
// Shell 3: fire live
shells[2].resolution = 'fire';
context.__api.tapOutcome(2);
choose('live');
// Shell 4: phone blank, invert, fire -> comes out live (successful inversion)
shells[3].hasPhone = true;
shells[3].phoneType = 'blank';
shells[3].knownType = 'blank';
shells[3].polarity = true;
shells[3].resolution = 'fire';
context.__api.render();
context.__api.tapOutcome(3);
choose('live');
assert('shell 4 successful inversion records correctly', shells[3].loadedType === 'live' && shells[3].knownType === 'blank' && !shells[3].knownMismatch);
// After shell 4: should be 1 live, 2 blank remaining (3-2=1 live, 4-1-1=2 blank after inversion)
// Shell 5: phone blank, invert, fire -> comes out blank (MISMATCH - expected live)
shells[4].hasPhone = true;
shells[4].phoneType = 'blank';
shells[4].knownType = 'blank';
shells[4].polarity = true;
shells[4].resolution = 'fire';
context.__api.render();
context.__api.tapOutcome(4);
choose('blank');
assert('shell 5 mismatch keeps claimed prediction', shells[4].knownType === 'blank'); // keeps original phone prediction
assert('shell 5 mismatch sets flag', shells[4].knownMismatch === true);
assert('shell 5 mismatch records actual ejected', shells[4].loadedType === 'blank');
// Verify count table after mismatch
context.__api.render();
const liveStart = Number(ids['t-live-start'].textContent);
const blankStart = Number(ids['t-blank-start'].textContent);
const liveGain = ids['t-live-gain'].textContent === '—' ? 0 : Number(ids['t-live-gain'].textContent);
const liveLose = ids['t-live-lose'].textContent === '—' ? 0 : Number(ids['t-live-lose'].textContent);
const blankGain = ids['t-blank-gain'].textContent === '—' ? 0 : Number(ids['t-blank-gain'].textContent);
const blankLose = ids['t-blank-lose'].textContent === '—' ? 0 : Number(ids['t-blank-lose'].textContent);
const liveActual = Number(ids['t-live-actual'].textContent);
const blankActual = Number(ids['t-blank-actual'].textContent);
const liveTube = Number(ids['t-live-tube'].textContent);
const blankTube = Number(ids['t-blank-tube'].textContent);
const liveEject = Number(ids['t-live-eject'].textContent);
const blankEject = Number(ids['t-blank-eject'].textContent);
assert('count table shows correct start totals', liveStart === 3 && blankStart === 4);
assert('count table shows all inversions including mismatches', liveGain === 1 && liveLose === 1 && blankGain === 1 && blankLose === 1);
assert('count table shows correct actual after inversions', liveActual === 3 && blankActual === 4); // inversions cancel each other out
assert('count table shows correct ejected counts', liveEject === 3 && blankEject === 2);
assert('count table shows correct in-tube counts', liveTube === 0 && blankTube === 2); // 0 live, 2 blank remaining
assert('probability does not show impossible percentages after mismatch', !deepText(ids['prob-next']).includes('200') && !deepText(ids['prob-next']).includes('-100'));

// ── Added in v1.1.0 ──────────────────────────────────────────────

// Dealer endgame: only live left in the tube. Dealer ejects live -> no inverter prompt, no negative counts.
reset(1,1);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].isDealer = true;
context.__api.render();
context.__api.tapOutcome(1);
choose('live');
assert('dealer endgame with one possible answer skips the inverter prompt', ids['modal'].style.display !== 'flex' && ids['modal-title'].textContent !== 'Did the dealer use the inverter?');
assert('dealer endgame records no inverter', shells[1].consumed && shells[1].loadedType === 'live' && !shells[1].polarity);
assert('dealer endgame keeps tube counts at zero, never negative', String(ids['t-live-tube'].textContent) === '0' && String(ids['t-blank-tube'].textContent) === '0');

// Dealer endgame: only live left, dealer ejects blank -> inverter must have been used.
reset(1,1);
shells = context.__api.shells();
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('blank');
shells[1].isDealer = true;
context.__api.render();
context.__api.tapOutcome(1);
choose('blank');
assert('dealer endgame impossible outcome auto-records inverter', shells[1].consumed && shells[1].polarity && shells[1].loadedType === 'blank' && shells[1].knownType === 'live');
assert('dealer endgame inverter keeps tube counts non-negative', Number(ids['t-live-tube'].textContent) >= 0 && Number(ids['t-blank-tube'].textContent) >= 0);

// The reported 4/4 case: last shell, only live left, dealer ejects live -> resolves without asking.
reset(4,4);
shells = context.__api.shells();
['blank','live','blank','live','blank','live','blank'].forEach((t,i)=>{
  shells[i].resolution = 'eject';
  context.__api.render();
  context.__api.tapOutcome(i);
  choose(t);
});
shells[7].isDealer = true;
context.__api.render();
context.__api.tapOutcome(7);
choose('live');
assert('4/4 last-shell dealer live resolves without inverter prompt', shells[7].consumed && !shells[7].polarity && ids['modal'].style.display !== 'flex');
assert('4/4 last-shell counts end at zero in tube', String(ids['t-live-tube'].textContent) === '0' && String(ids['t-blank-tube'].textContent) === '0');

// Phone and mirror selections stay set after the shell is resolved.
reset(2,2);
shells = context.__api.shells();
shells[1].hasPhone = true;
shells[1].phoneType = 'blank';
shells[1].knownType = 'blank';
shells[0].resolution = 'fire';
context.__api.tapOutcome(0);
choose('live');
shells[1].resolution = 'fire';
context.__api.render();
context.__api.tapOutcome(1);
choose('blank');
assert('phone stays selected after firing', shells[1].consumed && shells[1].hasPhone && shells[1].phoneType === 'blank');

reset(2,2);
shells = context.__api.shells();
shells[0].hasMirror = true;
shells[0].mirrorType = 'live';
shells[0].knownType = 'live';
shells[0].resolution = 'eject';
context.__api.render();
context.__api.tapOutcome(0);
choose('live');
assert('mirror stays selected after beer eject', shells[0].consumed && shells[0].hasMirror && shells[0].mirrorType === 'live');

// Layout: row labels in the current order, help lists rows in the same order, separators fit the table.
const labelOrder = [...html.matchAll(/class="row-label"[^>]*>([A-Za-z\/]+)</g)].map(m=>m[1]);
assert('row labels are in the current order', labelOrder.join(',') === 'Dealer,Phone,Mirror,Claimed,Invert,Fire/Eject,Action,Ejected');
assert('help lists Claimed before Invert', html.indexOf("['Claimed','Mini shells'") < html.indexOf("['🔄','Invert'"));
assert('two group separators exist', (html.match(/class="row-sep"/g) || []).length === 2);
assert('separators are not hardcoded to 8 shells', !html.includes('8 * 36px'));

console.log('All tracker tests passed');



