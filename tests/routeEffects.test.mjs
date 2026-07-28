import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteEffectScheduler } from '../src/utils/routeEffects.js';

function createFakeTimers() {
  let nextId = 1;
  const timers = new Map();

  return {
    clearTimer(timerId) {
      timers.delete(timerId);
    },
    runNext() {
      const [timerId, callback] = timers.entries().next().value || [];
      if (!timerId) return false;
      timers.delete(timerId);
      callback();
      return true;
    },
    setTimer(callback) {
      const timerId = nextId;
      nextId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    size() {
      return timers.size;
    },
  };
}

function createFakeElement() {
  const classes = new Set();
  let scrollCount = 0;

  return {
    classList: {
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
    },
    classes,
    get scrollCount() {
      return scrollCount;
    },
    scrollIntoView() {
      scrollCount += 1;
    },
  };
}

test('only applies effects from the latest scheduled route', () => {
  const timers = createFakeTimers();
  const scheduler = createRouteEffectScheduler({
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  const element = createFakeElement();
  let topScrollCount = 0;

  scheduler.schedule({
    anchor: 'old-section',
    findAnchor: () => element,
  });
  scheduler.schedule({
    anchor: null,
    scrollToTop: () => {
      topScrollCount += 1;
    },
  });

  assert.equal(timers.size(), 1);
  assert.equal(timers.runNext(), true);
  assert.equal(element.scrollCount, 0);
  assert.equal(topScrollCount, 1);
});

test('cancels an active route highlight when a newer route wins', () => {
  const timers = createFakeTimers();
  const scheduler = createRouteEffectScheduler({
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
  });
  const element = createFakeElement();

  scheduler.schedule({
    anchor: 'first-section',
    findAnchor: () => element,
  });
  timers.runNext();

  assert.equal(element.scrollCount, 1);
  assert.equal(element.classes.has('bg-yellow-50'), true);

  scheduler.schedule({
    anchor: null,
    scrollToTop: () => {},
  });

  assert.equal(element.classes.size, 0);
  assert.equal(timers.size(), 1);
});
