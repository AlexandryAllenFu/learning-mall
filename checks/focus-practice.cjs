// Run with node --test checks/focus-practice.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function learner(course) {
  let now = new Date(2026, 10, 21, 23, 55).getTime();
  class Clock extends Date {
    static now() { return now; }
  }
  const calculus = course === 'MTH026';
  const state = {attempts: [], read: {}, study: {}};
  const context = vm.createContext({
    state, study: () => state.study, Date: Clock, location: {hash: '#focus'},
    document: {body: {dataset: {course}}, querySelector: () => null},
    save() {}, render() {}, toast() {}, esc: String
  });
  const run = js => vm.runInContext(js, context);
  const load = file => run(fs.readFileSync(path.join(root, file), 'utf8'));
  if (calculus) {
    run('const MATERIALS = []');
    load('calculus-lessons.js');
  }
  const dir = calculus ? '' : 'algebra/';
  load(dir + 'content.js');
  load(dir + 'engine.js');
  run('const get = id => TOPICS.find(t => t.id === id)');
  load('algebra/focus-questions.js');
  load('algebra/focus-practice.js');

  const focus = run('FocusPractice'), bank = run('FocusQuestions');
  const session = () => state.study.focus.session;
  function question(item = session().items.find(i => !i.submitted)) {
    return bank.make(item.key, item.seed, session().mode === 'mixed');
  }
  function submit(value, consulted = false) {
    const s = session(), i = s.items.findIndex(item => !item.submitted);
    focus.submit({preventDefault() {}, currentTarget: {
      dataset: {started: s.started, index: i},
      elements: {answer: {value: String(value)}, consulted: {checked: consulted}}
    }});
  }
  return {
    state, focus, bank, session, question, submit,
    first: calculus ? 't35.inner' : 'rowops.rhs',
    nextDay: new Date(2026, 10, 22).getTime(),
    setTime(t) { now = t; }
  };
}

for (const course of ['MTH026', 'MTH028']) {
  test(course + ' requires a fresh, unassisted answer to schedule a mixed review', () => {
    const {state, focus, first, session, question, submit, nextDay} = learner(course);
    // A pre-existing full-course record belongs to the original assessment system.
    const history = [{id:'previous', topic:first.split('.')[0], grade:{passed:true}}];
    state.attempts.push(...structuredClone(history));
    focus.diagnose();
    const diagnostic = question();
    submit('99999');
    assert.equal(Object.keys(state.study.focus.plans).length, 0);

    focus.pick(first);
    assert.notEqual(question().prompt, diagnostic.prompt);
    focus.markHelp();
    submit(question().expected);
    assert.equal(state.study.focus.plans[first].stage, 'practice');
    focus.pick(first);
    submit(question().expected, true);
    assert.equal(state.study.focus.plans[first].stage, 'practice');
    focus.pick(first);
    submit(question().expected);
    assert.equal(state.study.focus.plans[first].stage, 'review');
    assert.equal(state.study.focus.plans[first].due, nextDay);
    focus.mixed(); // Still the evening of the original attempt.
    assert.equal(session().mode, 'target');
    assert.deepEqual(state.attempts, history);
  });

  test(course + ' resumes a mixed review and grades only after both answers', () => {
    const {focus, bank, first, state, session, question, submit, nextDay, setTime} = learner(course);
    const second = bank.options(course === 'MTH026' ? 't33' : 'systems')[0].id;
    for (const key of [first, second]) {
      focus.pick(key);
      submit(question().expected);
    }
    setTime(nextDay);
    focus.mixed();
    assert.equal(session().mode, 'mixed');
    assert.equal(new Set(session().items.map(i => bank.topic(i.key))).size, 2);
    const originalQuestions = session().items.map(i => question(i).prompt);
    submit(question().expected);
    for (const key of [first, second]) assert.equal(state.study.focus.plans[key].stage, 'review');
    assert.doesNotMatch(focus.page(''), /id="focus-feedback"|参考答案|混合复测结果/);
    focus.draft('17');
    const saved = JSON.parse(JSON.stringify(state.study.focus));
    state.study.focus = focus.merge(undefined, saved);
    assert.equal(session().items[0].submitted, true);
    assert.equal(session().items[1].answer, '17');
    assert.deepEqual(Array.from(session().items, i => question(i).prompt), Array.from(originalQuestions));
    assert.match(focus.page(''), /第 2 \/ 2 题/);
    submit(question().expected);
    assert.match(focus.page(''), /混合复测结果/);
    for (const key of [first, second]) assert.equal(state.study.focus.plans[key].stage, 'passed');
  });
}
