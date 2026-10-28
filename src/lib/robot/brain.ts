/**
 * The robot's state machine. It knows nothing of the DOM or timers, so it can be tested on its
 * own: `bus.ts` feeds it events stamped with the time, and the robot draws whatever face
 * `resolveFace` returns. Three layers decide that face, the last one winning:
 *
 * - base: what the chat is doing — idle, listening, thinking or speaking
 * - attention: how close the visitor's pointer is, or which part of the page they're on
 * - gesture: a short reaction — a wave, a nod, success, an error — played over both
 */

export type RobotBase = "idle" | "listening" | "thinking" | "speaking";

/** Where the pointer is relative to the robot. Keyboard focus on the robot counts as "over". */
export type RobotProximity = "far" | "near" | "over";

/** The page elements the robot reacts to, marked with `data-robot="<kind>"`. */
export const ROBOT_TARGET_KINDS = ["nav", "resume", "contact", "github", "live", "details", "social", "card"] as const;
export type RobotTargetKind = (typeof ROBOT_TARGET_KINDS)[number];

export type RobotGesture =
  | "error"
  | "success"
  | "excited"
  | "acknowledge"
  | "powerDown"
  | "wave"
  | "waveLeft"
  | "nod"
  | "perk"
  | "antenna"
  | "lean"
  | "blink";

type GestureSpec = {
  /** A gesture can't cut off a stronger one that's still playing. 1 is for reactions to the page. */
  priority: number;
  /** How long it holds the face, in ms. */
  duration: number;
  /** The least time between two of the same gesture, in ms. */
  cooldown: number;
  /** Whether it may play while the chat is open, when reactions to the page would distract. */
  whileOpen: boolean;
};

export const GESTURES: Record<RobotGesture, GestureSpec> = {
  error: { priority: 6, duration: 2500, cooldown: 0, whileOpen: true },
  success: { priority: 5, duration: 1100, cooldown: 0, whileOpen: true },
  excited: { priority: 4, duration: 700, cooldown: 400, whileOpen: true },
  acknowledge: { priority: 3, duration: 450, cooldown: 300, whileOpen: true },
  powerDown: { priority: 3, duration: 650, cooldown: 400, whileOpen: true },
  wave: { priority: 2, duration: 1600, cooldown: 4000, whileOpen: false },
  waveLeft: { priority: 1, duration: 900, cooldown: 0, whileOpen: false },
  nod: { priority: 1, duration: 500, cooldown: 0, whileOpen: false },
  perk: { priority: 1, duration: 800, cooldown: 0, whileOpen: false },
  antenna: { priority: 1, duration: 800, cooldown: 0, whileOpen: false },
  lean: { priority: 1, duration: 900, cooldown: 0, whileOpen: false },
  blink: { priority: 1, duration: 400, cooldown: 0, whileOpen: false },
};

/** Reactions to the page share one cooldown, so sweeping across a row of buttons isn't a flurry. */
export const REACTION_GAP = 1200;

/** The gesture each kind of page element prompts. `null`: the robot only looks. */
export const TARGET_REACTIONS: Record<RobotTargetKind, RobotGesture | null> = {
  nav: null,
  resume: "nod",
  contact: "waveLeft",
  github: "antenna",
  live: "perk",
  details: "lean",
  social: "blink",
  card: null,
};

export type RobotState = {
  base: RobotBase;
  proximity: RobotProximity;
  /** The kind of page element the visitor is pointing at or has focused, if any. */
  target: RobotTargetKind | null;
  open: boolean;
  /** The gesture playing; `id` tells two plays of the same gesture apart. */
  gesture: { name: RobotGesture; id: number; endsAt: number } | null;
  /** When each gesture last started, for its cooldown. */
  startedAt: Partial<Record<RobotGesture, number>>;
  /** When the last reaction to the page started, for `REACTION_GAP`. */
  reactedAt: number;
  nextId: number;
};

export const initialRobotState: RobotState = {
  base: "idle",
  proximity: "far",
  target: null,
  open: false,
  gesture: null,
  startedAt: {},
  reactedAt: Number.NEGATIVE_INFINITY,
  nextId: 1,
};

export type RobotEvent =
  | { type: "base"; base: RobotBase }
  | { type: "proximity"; proximity: RobotProximity }
  | { type: "target"; target: RobotTargetKind | null }
  | { type: "open"; open: boolean }
  | { type: "gesture"; gesture: RobotGesture }
  | { type: "expire" };

/** Applies one event at time `now` (ms). Returns the same object when nothing changes. */
export function reduce(state: RobotState, event: RobotEvent, now: number): RobotState {
  switch (event.type) {
    case "base":
      return event.base === state.base ? state : { ...state, base: event.base };
    case "proximity": {
      if (event.proximity === state.proximity) return state;
      const next = { ...state, proximity: event.proximity };
      // Greet the visitor when the pointer, or keyboard focus, lands on the robot.
      return event.proximity === "over" ? play(next, "wave", now) : next;
    }
    case "target": {
      // While the chat is open the page sits behind it, so its elements are ignored.
      const target = state.open ? null : event.target;
      if (target === state.target) return state;
      const reaction = target && TARGET_REACTIONS[target];
      return reaction ? play({ ...state, target }, reaction, now) : { ...state, target };
    }
    case "open":
      if (event.open === state.open) return state;
      return play({ ...state, open: event.open, target: null }, event.open ? "excited" : "powerDown", now);
    case "gesture":
      return play(state, event.gesture, now);
    case "expire":
      return state.gesture && now >= state.gesture.endsAt ? { ...state, gesture: null } : state;
  }
}

/** Starts a gesture, unless the chat being open, a cooldown or a stronger gesture rules it out. */
function play(state: RobotState, name: RobotGesture, now: number): RobotState {
  const spec = GESTURES[name];
  const reaction = spec.priority === 1;
  const current = state.gesture && now < state.gesture.endsAt ? state.gesture : null;
  if (
    (state.open && !spec.whileOpen) ||
    now - (state.startedAt[name] ?? Number.NEGATIVE_INFINITY) < spec.cooldown ||
    (reaction && now - state.reactedAt < REACTION_GAP) ||
    (current && GESTURES[current.name].priority > spec.priority)
  ) {
    return state;
  }
  return {
    ...state,
    gesture: { name, id: state.nextId, endsAt: now + spec.duration },
    startedAt: { ...state.startedAt, [name]: now },
    reactedAt: reaction ? now : state.reactedAt,
    nextId: state.nextId + 1,
  };
}

/** Everything the robot's face and body show; `robot.tsx` animates between faces. */
export type RobotFace = {
  eyes: "open" | "happy" | "wide" | "focus" | "sleepy" | "sad";
  /** How brightly the eyes glow, 0–1. */
  glow: number;
  mouth: "smile" | "grin" | "flat" | "frown" | "talk" | "dot" | "open";
  /** Blush, 0–1. */
  cheeks: number;
  antenna: "calm" | "bright" | "fast" | "flash";
  /** Lights in the ears, on while it listens. */
  ears: boolean;
  arms: "rest" | "still" | "wave" | "waveLeft" | "up";
  chest: "calm" | "pulse" | "flash" | "dim";
  /** Where the eyes settle whatever the pointer does (SVG units), e.g. up and aside while thinking. */
  gaze: { x: number; y: number } | null;
  /** A slightly lopsided, "hm?" look. */
  curious: boolean;
  /** A slow scan line across the visor while it thinks. */
  scan: boolean;
};

const IDLE_FACE: RobotFace = {
  eyes: "open",
  glow: 0.35,
  mouth: "smile",
  cheeks: 0.6,
  antenna: "calm",
  ears: false,
  arms: "rest",
  chest: "calm",
  gaze: null,
  curious: false,
  scan: false,
};

const BASE_FACES: Record<RobotBase, RobotFace> = {
  idle: IDLE_FACE,
  listening: { ...IDLE_FACE, glow: 0.55, ears: true, arms: "still" },
  thinking: {
    ...IDLE_FACE,
    eyes: "focus",
    glow: 0.5,
    mouth: "dot",
    antenna: "fast",
    arms: "still",
    gaze: { x: 3, y: -4 },
    scan: true,
  },
  speaking: { ...IDLE_FACE, glow: 0.6, mouth: "talk", chest: "pulse" },
};

const CURIOUS_FACE: RobotFace = { ...IDLE_FACE, glow: 0.5, curious: true };
const FOCUSED_FACE: RobotFace = { ...IDLE_FACE, glow: 0.6, antenna: "bright" };
const ATTENTIVE_FACE: RobotFace = { ...IDLE_FACE, glow: 0.85, mouth: "grin", cheeks: 0.85, antenna: "bright" };

const GESTURE_FACES: Record<RobotGesture, Partial<RobotFace>> = {
  error: {
    eyes: "sad",
    glow: 0.2,
    mouth: "frown",
    cheeks: 0.25,
    antenna: "calm",
    arms: "still",
    chest: "dim",
    gaze: { x: 0, y: 2 },
    curious: false,
    scan: false,
  },
  success: { eyes: "happy", glow: 1, mouth: "grin", cheeks: 1, antenna: "flash", arms: "up", chest: "flash" },
  excited: { eyes: "happy", glow: 1, mouth: "open", cheeks: 1, antenna: "flash", arms: "up" },
  acknowledge: { glow: 0.7 },
  powerDown: { eyes: "sleepy", glow: 0.2, mouth: "flat", antenna: "calm" },
  wave: { eyes: "happy", glow: 0.85, mouth: "grin", cheeks: 0.95, arms: "wave" },
  waveLeft: { mouth: "grin", arms: "waveLeft" },
  nod: { mouth: "grin" },
  perk: { eyes: "wide", glow: 1, antenna: "bright" },
  antenna: { antenna: "flash" },
  lean: { curious: true, glow: 0.65 },
  blink: {},
};

/** The chat's face if it's busy, otherwise the attention face; a gesture plays over either. */
export function resolveFace(state: RobotState): RobotFace {
  const face =
    state.base !== "idle"
      ? BASE_FACES[state.base]
      : state.proximity === "over"
        ? ATTENTIVE_FACE
        : state.target
          ? FOCUSED_FACE
          : state.proximity === "near"
            ? CURIOUS_FACE
            : IDLE_FACE;
  return state.gesture ? { ...face, ...GESTURE_FACES[state.gesture.name] } : face;
}
