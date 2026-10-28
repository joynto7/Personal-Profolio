import { strict as assert } from "node:assert";
import test from "node:test";
import {
  GESTURES,
  REACTION_GAP,
  initialRobotState,
  reduce,
  resolveFace,
  type RobotEvent,
  type RobotState,
} from "../src/lib/robot/brain.ts";

// The robot's state machine is pure, so these run without a browser or a server.

/** Applies events in order, each at its own time in ms. */
function run(steps: [number, RobotEvent][], from: RobotState = initialRobotState): RobotState {
  return steps.reduce((state, [now, event]) => reduce(state, event, now), from);
}

test("the robot starts idle, with its relaxed face", () => {
  const face = resolveFace(initialRobotState);
  assert.equal(face.eyes, "open");
  assert.equal(face.mouth, "smile");
  assert.equal(initialRobotState.gesture, null);
});

test("it turns curious as the pointer nears, then attentive and waving when it lands on it", () => {
  const near = run([[0, { type: "proximity", proximity: "near" }]]);
  assert.equal(resolveFace(near).curious, true);
  assert.equal(near.gesture, null);

  const over = run([[100, { type: "proximity", proximity: "over" }]], near);
  assert.equal(over.gesture?.name, "wave");
  assert.equal(resolveFace(over).arms, "wave");
});

test("it doesn't wave again every time the pointer comes back", () => {
  const state = run([
    [0, { type: "proximity", proximity: "over" }],
    [2000, { type: "expire" }],
    [2100, { type: "proximity", proximity: "far" }],
    [2500, { type: "proximity", proximity: "over" }],
  ]);
  assert.equal(state.gesture, null);

  const later = run(
    [
      [3000, { type: "proximity", proximity: "far" }],
      [GESTURES.wave.cooldown + 1, { type: "proximity", proximity: "over" }],
    ],
    state
  );
  assert.equal(later.gesture?.name, "wave");
});

test("opening the chat makes it excited, and closing it powers it down", () => {
  const opened = run([[0, { type: "open", open: true }]]);
  assert.equal(opened.gesture?.name, "excited");
  assert.equal(resolveFace(opened).eyes, "happy");

  const closed = run([[5000, { type: "open", open: false }]], opened);
  assert.equal(closed.gesture?.name, "powerDown");
});

test("while the chat is open, the page's buttons and greetings leave it alone", () => {
  const state = run([
    [0, { type: "open", open: true }],
    [1000, { type: "expire" }],
    [1100, { type: "target", target: "live" }],
    [1200, { type: "proximity", proximity: "over" }],
  ]);
  assert.equal(state.target, null);
  assert.equal(state.gesture, null);
});

test("hovering a page element makes it look and react, but only once per gap", () => {
  const first = run([[0, { type: "target", target: "github" }]]);
  assert.equal(first.target, "github");
  assert.equal(first.gesture?.name, "antenna");

  const sweep = run([[300, { type: "target", target: "resume" }]], first);
  assert.equal(sweep.target, "resume");
  assert.equal(sweep.gesture?.name, "antenna", "a second reaction inside the gap is skipped");

  const later = run([[REACTION_GAP + 1, { type: "target", target: "live" }]], sweep);
  assert.equal(later.gesture?.name, "perk");
});

test("elements that only draw its eyes don't start a gesture", () => {
  const state = run([[0, { type: "target", target: "nav" }]]);
  assert.equal(state.target, "nav");
  assert.equal(state.gesture, null);
  assert.equal(resolveFace(state).antenna, "bright");
});

test("a gesture can't cut off a stronger one, but a stronger one cuts in", () => {
  const error = run([[0, { type: "gesture", gesture: "error" }]]);
  const blocked = run([[100, { type: "gesture", gesture: "acknowledge" }]], error);
  assert.equal(blocked.gesture?.name, "error");

  const acknowledged = run([[0, { type: "gesture", gesture: "acknowledge" }]]);
  const interrupted = run([[100, { type: "gesture", gesture: "error" }]], acknowledged);
  assert.equal(interrupted.gesture?.name, "error");
});

test("an error passes after a moment, so the robot doesn't stay sad", () => {
  const error = run([[0, { type: "gesture", gesture: "error" }]]);
  assert.equal(resolveFace(error).eyes, "sad");

  const early = run([[GESTURES.error.duration - 1, { type: "expire" }]], error);
  assert.equal(early.gesture?.name, "error");

  const after = run([[GESTURES.error.duration, { type: "expire" }]], error);
  assert.equal(after.gesture, null);
  assert.equal(resolveFace(after).eyes, "open");
});

test("what the chat is doing outranks where the pointer is", () => {
  const state = run([
    [0, { type: "proximity", proximity: "near" }],
    [10, { type: "base", base: "thinking" }],
  ]);
  const face = resolveFace(state);
  assert.equal(face.mouth, "dot");
  assert.equal(face.scan, true);
  assert.equal(face.curious, false);
});

test("success only comes from an explicit signal", () => {
  const state = run([
    [0, { type: "open", open: true }],
    [100, { type: "base", base: "speaking" }],
    [900, { type: "base", base: "idle" }],
    [1000, { type: "expire" }],
  ]);
  assert.notEqual(state.gesture?.name, "success");
  assert.equal(run([[2000, { type: "gesture", gesture: "success" }]], state).gesture?.name, "success");
});

test("repeating an event keeps the same state object", () => {
  const state = run([[0, { type: "base", base: "listening" }]]);
  assert.equal(reduce(state, { type: "base", base: "listening" }, 10), state);
  assert.equal(reduce(state, { type: "proximity", proximity: "far" }, 10), state);
  assert.equal(reduce(state, { type: "expire" }, 10), state);
});
