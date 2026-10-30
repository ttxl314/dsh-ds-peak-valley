/**
 * Self-test for @ttxl314/dsh-ds-peak-valley.
 *
 * The client bundle is plain ESM-free browser code: it registers itself on
 * window.__ModuleLoader__ and asks for the platform "react" seed module. This
 * harness loads it with stub window/react objects, so the schedule math and the
 * badge render can be exercised in plain Node — no DSH, no browser, no network.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : " — " + detail}`);
}

/* ------------------------------------------------------------------ *
 * Load the bundle exactly the way the client runtime does.
 * ------------------------------------------------------------------ */

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const code = readFileSync(join(root, "lib/client.js"), "utf8");

let captured = null;
const fakeWindow = { __ModuleLoader__: { load: (reg) => { captured = reg; } } };
new Function("window", code)(fakeWindow);
check("client bundle registers via __ModuleLoader__.load", captured !== null);
check(
  "bundle registers under the package name",
  captured !== null && captured.id === pkg.name,
  `registered as ${captured?.id}, package is ${pkg.name}`
);

const noop = () => {};
const react = {
  useState: (init) => [typeof init === "function" ? init() : init, noop],
  useEffect: noop,
  createElement: (type, props, ...children) => ({ type, props, children })
};

const client = captured.factory((spec) => {
  if (spec === "react") return react;
  throw new Error("unexpected seed module: " + spec);
});

for (const name of ["apply", "computeStatus", "nextTransition", "formatCountdown", "PeakValleyBadge"]) {
  check(`bundle exports ${name}`, typeof client[name] === "function");
}
check("bundle declares the slots injection", Array.isArray(client.inject) && client.inject.includes("slots"));
check("host entry stays a no-op loader entry", typeof (await import("file://" + join(root, "lib/index.js").replace(/\\/g, "/"))).apply === "function");

/* ------------------------------------------------------------------ *
 * Asia/Shanghai is UTC+8 all year (no DST), so Beijing HH:mm == UTC (HH-8):mm.
 * ------------------------------------------------------------------ */

function utc(y, m, d, hh, mm) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

/* ------------------------------------------------------------------ *
 * computeStatus: peak vs valley.
 * 2026-02-23 is a Monday; 2026-02-21 Saturday; 2026-02-22 Sunday.
 * ------------------------------------------------------------------ */

const statusCases = [
  ["Mon 08:59 valley (before peak)", utc(2026, 2, 23, 0, 59), "valley"],
  ["Mon 09:00 peak (start)", utc(2026, 2, 23, 1, 0), "peak"],
  ["Mon 09:30 peak", utc(2026, 2, 23, 1, 30), "peak"],
  ["Mon 11:59 peak (last minute)", utc(2026, 2, 23, 3, 59), "peak"],
  ["Mon 12:00 valley (lunch starts)", utc(2026, 2, 23, 4, 0), "valley"],
  ["Mon 13:59 valley (lunch ends)", utc(2026, 2, 23, 5, 59), "valley"],
  ["Mon 14:00 peak (afternoon starts)", utc(2026, 2, 23, 6, 0), "peak"],
  ["Mon 17:59 peak (last minute)", utc(2026, 2, 23, 9, 59), "peak"],
  ["Mon 18:00 valley (evening)", utc(2026, 2, 23, 10, 0), "valley"],
  ["Fri 11:00 peak", utc(2026, 2, 27, 3, 0), "peak"],
  ["Fri 18:00 valley (weekend starts)", utc(2026, 2, 27, 10, 0), "valley"],
  ["Sat 10:00 valley (weekend)", utc(2026, 2, 21, 2, 0), "valley"],
  ["Sun 17:00 valley (weekend)", utc(2026, 2, 22, 9, 0), "valley"],
  ["Sat 00:00 valley (weekend night)", utc(2026, 2, 21, 0, 0), "valley"]
];

for (const [label, date, expected] of statusCases) {
  const got = client.computeStatus(date);
  check(label, got === expected, `got ${got}, expected ${expected}`);
}

/* ------------------------------------------------------------------ *
 * nextTransition: the next 峰↔谷 boundary, in Beijing minutes.
 * ------------------------------------------------------------------ */

const transitionCases = [
  ["Mon 09:30 → Mon 12:00 valley", utc(2026, 2, 23, 1, 30), "valley", 150],
  ["Mon 12:30 → Mon 14:00 peak", utc(2026, 2, 23, 4, 30), "peak", 90],
  ["Mon 17:00 → Mon 18:00 valley", utc(2026, 2, 23, 9, 0), "valley", 60],
  ["Mon 08:00 → Mon 09:00 peak", utc(2026, 2, 23, 0, 0), "peak", 60],
  ["Mon 09:00 exactly → Mon 12:00 valley", utc(2026, 2, 23, 1, 0), "valley", 180],
  ["Mon 12:00 exactly → Mon 14:00 peak", utc(2026, 2, 23, 4, 0), "peak", 120],
  ["Fri 17:00 → Fri 18:00 valley", utc(2026, 2, 27, 9, 0), "valley", 60],
  ["Fri 18:00 → Mon 09:00 peak", utc(2026, 2, 27, 10, 0), "peak", 3780],
  ["Sat 00:00 → Mon 09:00 peak", utc(2026, 2, 20, 16, 0), "peak", 3420],
  ["Sun 23:59 → Mon 09:00 peak", utc(2026, 2, 22, 15, 59), "peak", 541],
  ["Thu 22:40 → Fri 09:00 peak", utc(2026, 2, 26, 14, 40), "peak", 620]
];

for (const [label, date, expectedKind, expectedMinutes] of transitionCases) {
  const got = client.nextTransition(date);
  check(
    label,
    got.kind === expectedKind && got.minutes === expectedMinutes,
    `got ${got.kind} ${got.minutes}, expected ${expectedKind} ${expectedMinutes}`
  );
}

/* ------------------------------------------------------------------ *
 * formatCountdown: compact "h小时m分" form.
 * ------------------------------------------------------------------ */

const countdownCases = [
  [0, "0分"],
  [45, "45分"],
  [60, "1小时"],
  [90, "1小时30分"],
  [150, "2小时30分"],
  [2820, "47小时"],
  [3780, "63小时"]
];

for (const [minutes, expected] of countdownCases) {
  const got = client.formatCountdown(minutes);
  check(`formatCountdown(${minutes})`, got === expected, `got ${got}, expected ${expected}`);
}

/* ------------------------------------------------------------------ *
 * Render smoke test: freeze the clock, render both states, read the text.
 * ------------------------------------------------------------------ */

function textOf(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.children);
}

function renderAt(date) {
  const realNow = Date.now;
  Date.now = () => date.getTime();
  try {
    return client.PeakValleyBadge();
  } finally {
    Date.now = realNow;
  }
}

const peakView = renderAt(utc(2026, 2, 23, 1, 30)); // Mon 09:30 Beijing
check("peak badge text", textOf(peakView) === "文峰 09:30 · 距下谷 2小时30分", textOf(peakView));
check("peak badge is red", peakView.props.style.color === "#e5484d", peakView.props.style.color);
check(
  "peak badge tooltip",
  peakView.props.title.includes("高峰时段") && peakView.props.title.includes("Asia/Shanghai"),
  peakView.props.title
);

const valleyView = renderAt(utc(2026, 2, 23, 4, 30)); // Mon 12:30 Beijing
check("valley badge text", textOf(valleyView) === "文谷 12:30 · 距下峰 1小时30分", textOf(valleyView));
check("valley badge is blue", valleyView.props.style.color === "#0091ff", valleyView.props.style.color);
check(
  "valley badge tooltip",
  valleyView.props.title.includes("空闲时段") && valleyView.props.style.background.includes("0, 145, 255"),
  valleyView.props.title
);

/* ------------------------------------------------------------------ *
 * Packaging consistency: the bundle patch must name the package exactly.
 * ------------------------------------------------------------------ */

const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
const patchName = /name:\s*'([^']+)'/.exec(patch)?.[1];

check("package.json declares the dsh client face", pkg.dsh?.client?.platform === "web");
check("package.json points at the bundle patch", pkg.dsh?.bundle?.patch === "./cordis.patch.yml");
check("bundle patch names the package", patchName === pkg.name, `patch=${patchName}, package=${pkg.name}`);

/* ------------------------------------------------------------------ */

const total = statusCases.length + transitionCases.length + countdownCases.length;
console.log(`\n${failures === 0 ? "OK" : "FAILED"} — ${total} schedule cases + render/packaging checks`);
process.exitCode = failures === 0 ? 0 : 1;
