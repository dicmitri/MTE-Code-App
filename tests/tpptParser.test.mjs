import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTpptEligibility,
  classifySessionTitle,
  parseTpptSessions,
} from '../src/utils/tpptParser.js';

test('classifies representative TPPT session titles', () => {
  assert.equal(classifySessionTitle('Hands-on cadaver lab'), 'Hands-on');
  assert.equal(classifySessionTitle('Live surgery transmission'), 'Streaming');
  assert.equal(classifySessionTitle('Interactive case study'), 'Case Study');
  assert.equal(classifySessionTitle('Registration and welcome'), 'Other');
});

test('requires at least one third hands-on and more than half practical time', () => {
  const passing = calculateTpptEligibility([
    { durationMinutes: 60, type: 'Hands-on' },
    { durationMinutes: 40, type: 'Case Study' },
    { durationMinutes: 80, type: 'General Educational' },
  ]);
  assert.equal(passing.passesAgenda, true);

  const exactlyHalfPractical = calculateTpptEligibility([
    { durationMinutes: 60, type: 'Hands-on' },
    { durationMinutes: 30, type: 'Case Study' },
    { durationMinutes: 90, type: 'General Educational' },
  ]);
  assert.equal(exactlyHalfPractical.passesAgenda, false);
});

test('parses a simple timed agenda without adding unstable IDs', () => {
  const sessions = parseTpptSessions([
    '08:00 - 08:30 Registration and welcome',
    '08:30 - 10:00 Hands-on cadaver lab',
  ].join('\n'));

  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map(({ startTime, endTime, durationMinutes, type }) => ({
    startTime,
    endTime,
    durationMinutes,
    type,
  })), [
    { startTime: '08:00', endTime: '08:30', durationMinutes: 30, type: 'Other' },
    { startTime: '08:30', endTime: '10:00', durationMinutes: 90, type: 'Hands-on' },
  ]);
  assert.equal('id' in sessions[0], false);
});
