import { useSyncExternalStore } from "react";
import {
  ROBOT_TARGET_KINDS,
  initialRobotState,
  reduce,
  type RobotBase,
  type RobotEvent,
  type RobotGesture,
  type RobotProximity,
  type RobotState,
  type RobotTargetKind,
} from "@/lib/robot/brain";
import { playCue, type Cue } from "@/lib/robot/sound";

/**
 * The robot's shared state, kept outside React so any part of the site can signal it: the
 * chat widget says what the chat is doing, the contact form reports a real success or
 * failure, and the launcher reports the pointer. Both robots — the launcher and the chat
 * header's avatar — read the same state, so they always agree. Continuous input (where the
 * pointer is, what to look at) never touches React state; the robots read it each frame.
 */

let state: RobotState = initialRobotState;
const stateListeners = new Set<() => void>();
let expiryTimer = 0;

/** The sound for each gesture. Reactions to the page share the quiet hover chirp. */
const GESTURE_CUES: Partial<Record<RobotGesture, Cue>> = {
  excited: "activate",
  powerDown: "close",
  acknowledge: "acknowledge",
  success: "success",
  error: "error",
  wave: "hover",
  waveLeft: "hover",
  nod: "hover",
  perk: "hover",
  antenna: "hover",
  lean: "hover",
  blink: "hover",
};

function dispatch(event: RobotEvent) {
  const previous = state;
  state = reduce(state, event, performance.now());
  if (state === previous) return;
  if (state.gesture && state.gesture.id !== previous.gesture?.id) {
    const cue = GESTURE_CUES[state.gesture.name];
    if (cue) playCue(cue);
    scheduleExpiry();
  }
  stateListeners.forEach((listener) => listener());
}

/** Ends the playing gesture on time. A timer can fire a hair early, so it checks again until it has. */
function scheduleExpiry() {
  window.clearTimeout(expiryTimer);
  if (!state.gesture) return;
  expiryTimer = window.setTimeout(
    () => {
      dispatch({ type: "expire" });
      scheduleExpiry();
    },
    Math.max(0, state.gesture.endsAt - performance.now()) + 5
  );
}

function subscribeState(listener: () => void) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function useRobotState() {
  return useSyncExternalStore(subscribeState, () => state, () => initialRobotState);
}

export const setRobotBase = (base: RobotBase) => dispatch({ type: "base", base });
export const setRobotProximity = (proximity: RobotProximity) => dispatch({ type: "proximity", proximity });

export function setRobotOpen(open: boolean) {
  if (open) gazeTarget = null;
  dispatch({ type: "open", open });
}

/**
 * Plays a gesture. Only signal real outcomes: `success` once something has actually
 * succeeded, `error` once a request has actually failed.
 */
export const signalRobot = (gesture: RobotGesture) => dispatch({ type: "gesture", gesture });

// What the robots look at, besides the pointer: a page element the visitor is on (`gazeTarget`),
// or the chat input while they type (`gazeAnchor`).
let gazeTarget: Element | null = null;
let gazeAnchor: Element | null = null;
let pointer: { x: number; y: number; at: number; touch: boolean } | null = null;
let activeAt = 0;
const lookListeners = new Set<() => void>();
const activityListeners = new Set<() => void>();
const mouthListeners = new Set<() => void>();

export const getRobotPointer = () => pointer;
export const getRobotGaze = () => gazeTarget ?? gazeAnchor;
/** When the visitor last moved, scrolled, typed or touched — `performance.now()` time. */
export const getRobotActivity = () => activeAt;

const notifyLook = () => lookListeners.forEach((listener) => listener());

export function setRobotAnchor(element: Element | null) {
  if (element === gazeAnchor) return;
  gazeAnchor = element;
  notifyLook();
}

function noteActivity() {
  activeAt = performance.now();
  activityListeners.forEach((listener) => listener());
}

function onPointer(event: PointerEvent) {
  // A finger moving is a scroll; only where it taps says where the visitor is looking.
  if (event.type === "pointermove" && event.pointerType === "touch") return;
  pointer = { x: event.clientX, y: event.clientY, at: performance.now(), touch: event.pointerType === "touch" };
  noteActivity();
  notifyLook();
}

function onScroll() {
  noteActivity();
  notifyLook(); // the element being looked at has moved
}

let detachWindow: (() => void) | null = null;

/** The window listeners run only while something is subscribed. */
function listen() {
  if (detachWindow) return;
  activeAt = performance.now();
  const options = { capture: true, passive: true } as const;
  window.addEventListener("pointermove", onPointer, options);
  window.addEventListener("pointerdown", onPointer, options);
  window.addEventListener("scroll", onScroll, options);
  window.addEventListener("keydown", noteActivity, options);
  detachWindow = () => {
    window.removeEventListener("pointermove", onPointer, options);
    window.removeEventListener("pointerdown", onPointer, options);
    window.removeEventListener("scroll", onScroll, options);
    window.removeEventListener("keydown", noteActivity, options);
  };
}

function subscribe(set: Set<() => void>, listener: () => void) {
  set.add(listener);
  listen();
  return () => {
    set.delete(listener);
    if (lookListeners.size || activityListeners.size) return;
    detachWindow?.();
    detachWindow = null;
  };
}

/** Called when the robots should re-aim: the pointer moved, the page scrolled, or the gaze target changed. */
export const subscribeRobotLook = (listener: () => void) => subscribe(lookListeners, listener);
/** Called on any visitor activity. */
export const onRobotActivity = (listener: () => void) => subscribe(activityListeners, listener);

/** Moves the robots' mouths once: for each piece of an answer as it streams, or each word read aloud. */
export const pulseRobotMouth = () => mouthListeners.forEach((listener) => listener());

export function onRobotMouth(listener: () => void) {
  mouthListeners.add(listener);
  return () => {
    mouthListeners.delete(listener);
  };
}

/** How long the pointer must rest on an element before the robot reacts, so sweeping past doesn't count. */
const HOVER_INTENT_MS = 120;
/** How long the robot keeps looking after the pointer leaves, so moving between neighbours doesn't flicker. */
const LEAVE_GRACE_MS = 250;
/** How long a tap holds the robot's glance on a touch screen. */
const TAP_GLANCE_MS = 1200;

function targetOf(node: EventTarget | null) {
  return node instanceof Element ? node.closest<HTMLElement>("[data-robot]") : null;
}

function kindOf(element: HTMLElement | null): RobotTargetKind | null {
  const kind = element?.dataset.robot;
  return ROBOT_TARGET_KINDS.find((known) => known === kind) ?? null;
}

/**
 * Watches the page for elements marked with `data-robot`, so the robot can look at and react
 * to the one the visitor is on. The listeners only observe — they never prevent or delay a
 * click, a link or a focus change. Returns a cleanup.
 */
export function watchRobotTargets() {
  let candidate: HTMLElement | null = null;
  let timer = 0;

  const show = (element: HTMLElement | null) => {
    const next = state.open ? null : element;
    if (next === gazeTarget) return;
    gazeTarget = next;
    dispatch({ type: "target", target: kindOf(next) });
    notifyLook();
  };
  const aim = (element: HTMLElement | null, delay: number) => {
    candidate = element;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => show(element), delay);
  };

  const onOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const element = targetOf(event.target);
    if (element !== candidate) aim(element, element ? HOVER_INTENT_MS : LEAVE_GRACE_MS);
  };
  const onOut = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && !event.relatedTarget) aim(null, LEAVE_GRACE_MS); // left the window
  };
  // On a touch screen a tap is the click itself, so the robot only glances: no reaction, no sound.
  const onTap = (event: PointerEvent) => {
    const element = targetOf(event.target);
    if (event.pointerType !== "touch" || !element || state.open) return;
    gazeTarget = element;
    notifyLook();
    window.setTimeout(() => {
      if (gazeTarget !== element) return;
      gazeTarget = null;
      notifyLook();
    }, TAP_GLANCE_MS);
  };
  const onFocusIn = (event: FocusEvent) => {
    const element = targetOf(event.target);
    if (!element?.matches(":focus-visible")) return;
    candidate = element;
    window.clearTimeout(timer);
    show(element);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (targetOf(event.target) === candidate && targetOf(event.relatedTarget) !== candidate) aim(null, LEAVE_GRACE_MS);
  };

  const options = { capture: true, passive: true } as const;
  document.addEventListener("pointerover", onOver, options);
  document.addEventListener("pointerout", onOut, options);
  document.addEventListener("pointerdown", onTap, options);
  document.addEventListener("focusin", onFocusIn, options);
  document.addEventListener("focusout", onFocusOut, options);
  return () => {
    document.removeEventListener("pointerover", onOver, options);
    document.removeEventListener("pointerout", onOut, options);
    document.removeEventListener("pointerdown", onTap, options);
    document.removeEventListener("focusin", onFocusIn, options);
    document.removeEventListener("focusout", onFocusOut, options);
    window.clearTimeout(timer);
    show(null);
  };
}
