import test from 'tape';
import SES from '../src/index';
import whitelist from '../src/bundle/whitelist';

// The Node.js root environment (the repl you get when running /usr/bin/node)
// has extra (non-JS) properties like 'console', 'vm', 'crypto', and
// 'process'. The new contexts we build by evaluating `(0, eval)("'use
// strict'; this")` with vm.runInNewContext() have a smaller set of extra
// properties, which (in my quick check) are just 'console' and
// 'WebAssembly'. There are also JS-specified properties that we don't want
// in SES, like 'Atomics' and 'SharedArrayBuffer'. These should all be
// removed in SES environments.
//
// 'escape' and 'unescape' are appendix B (defacto) items, but they're safe,
// so we leave them in.

// "console" qualifies, but we'll be adding it back in

// the Realms shim only populates a new Realm with certain globals, so our
// whitelist might not actually cause anything to be removed
test('indirect eval is possible', t => {
  try {
    const s = SES.makeSESRootRealm();
    t.equal(s.evaluate(`(1,eval)('123')`), 123, 'indirect eval succeeds');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('SharedArrayBuffer should be removed because it is not on the whitelist', t => {
  const s = SES.makeSESRootRealm();
  // we seem to manage both of these for properties that never existed
  // in the first place
  t.throws(() => s.evaluate('XYZ'), ReferenceError);
  t.equal(s.evaluate('typeof XYZ'), 'undefined');
  const have = typeof SharedArrayBuffer !== 'undefined';
  if (have) {
    // we ideally want both of these, but the realms magic can only
    // manage one at a time (for properties that previously existed but
    // which were removed by the whitelist check)
    // t.throws(() => s.evaluate('SharedArrayBuffer'), ReferenceError);
    t.equal(s.evaluate('typeof SharedArrayBuffer'), 'undefined');
  }
  t.end();
});

// We can automatically test removing Promise from options.whitelist causes
// this to behave as expected.  Promise is
// something that 1: Realms allows through, 2: our taming shims don't remove,
// and 3: our options.whitelist removes.
test('break something', t => {
  const noPromiseWhitelist = JSON.parse(JSON.stringify(whitelist));
  delete noPromiseWhitelist.namedIntrinsics.Promise;
  const s = SES.makeSESRootRealm({ whitelist: noPromiseWhitelist });
  t.equal(typeof Promise, 'function');
  t.equal(s.evaluate('typeof Promise'), 'undefined');
  t.equal(s.evaluate('typeof Object'), 'function');
  t.end();
});

// the Realms shim allows regexps to have a 'compile' method, but SES removes
// it. This gets removed twice: once in tame-regexp, and again by the
// whitelist.

test('remove RegExp.prototype.compile', t => {
  const s = SES.makeSESRootRealm();
  t.equal(s.evaluate('const r = /./; typeof r.compile'), 'undefined');
  t.end();
});
