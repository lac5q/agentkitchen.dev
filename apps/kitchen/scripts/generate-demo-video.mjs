import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const width = 1280;
const height = 720;
const fps = 12;
const duration = 56;
const frameCount = duration * fps;
const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "demo");
const frameDir = path.join(tmpdir(), `memroos-demo-frames-${Date.now()}`);
const audioPath = path.join(frameDir, "memroos-demo.wav");
const outputPath = path.join(outDir, "memroos-demo.mp4");
const posterPath = path.join(outDir, "memroos-demo-poster.jpg");

mkdirSync(outDir, { recursive: true });
mkdirSync(frameDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} failed with status ${result.status}`);
  }
}

function writeSynthAudio(filePath) {
  const sampleRate = 44100;
  const channels = 2;
  const totalSamples = sampleRate * duration;
  const data = Buffer.alloc(totalSamples * channels * 2);
  const bpm = 126;
  const beat = 60 / bpm;
  const chords = [
    [261.63, 329.63, 392.0],
    [220.0, 261.63, 329.63],
    [293.66, 349.23, 440.0],
    [196.0, 246.94, 293.66],
  ];
  const bass = [65.41, 55.0, 73.42, 49.0];
  const lead = [523.25, 659.25, 783.99, 587.33, 698.46, 880.0, 783.99, 659.25];

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const bar = Math.floor(t / (beat * 4));
    const beatPhase = (t % beat) / beat;
    const barPhase = (t % (beat * 4)) / (beat * 4);
    const chord = chords[bar % chords.length];
    const bassFreq = bass[bar % bass.length];
    const sidechain = 0.62 + 0.38 * Math.min(1, beatPhase * 2.7);
    let sample = 0;

    for (const freq of chord) {
      sample += Math.sin(2 * Math.PI * freq * t) * 0.045;
      sample += Math.sin(2 * Math.PI * freq * 2.005 * t) * 0.012;
    }

    const padEnv = 0.45 + 0.55 * Math.sin(Math.PI * barPhase);
    sample *= padEnv * sidechain;
    sample += Math.sin(2 * Math.PI * bassFreq * t) * 0.11 * sidechain;

    const kickPhase = t % beat;
    if (kickPhase < 0.12) {
      const env = Math.exp(-kickPhase * 36);
      const sweep = 74 - kickPhase * 230;
      sample += Math.sin(2 * Math.PI * sweep * t) * env * 0.42;
    }

    const clapPhase = (t + beat * 2) % (beat * 4);
    if (clapPhase < 0.055 && Math.floor(t / beat) % 4 === 2) {
      const env = Math.exp(-clapPhase * 45);
      const noise = Math.sin(i * 12.9898) * Math.sin(i * 78.233);
      sample += noise * env * 0.19;
    }

    const hatPhase = (t + beat / 2) % (beat / 2);
    if (hatPhase < 0.025) {
      const env = Math.exp(-hatPhase * 120);
      const noise = Math.sin(i * 33.31) * Math.sin(i * 7.71);
      sample += noise * env * 0.055;
    }

    if (t > 8) {
      const phrase = Math.floor((t - 8) / (beat / 2));
      const leadFreq = lead[phrase % lead.length];
      const phrasePhase = ((t - 8) % (beat / 2)) / (beat / 2);
      const env = Math.sin(Math.PI * phrasePhase);
      sample += Math.sin(2 * Math.PI * leadFreq * t) * env * 0.045;
      sample += Math.sin(2 * Math.PI * leadFreq * 1.5 * t) * env * 0.018;
    }

    const intro = Math.min(1, t / 5);
    const outro = Math.min(1, (duration - t) / 5);
    sample *= Math.min(intro, outro);
    sample = Math.max(-0.92, Math.min(0.92, sample));

    const pan = Math.sin(t * 0.37) * 0.12;
    const left = sample * (1 - pan);
    const right = sample * (1 + pan);
    data.writeInt16LE(Math.round(left * 32767), i * 4);
    data.writeInt16LE(Math.round(right * 32767), i * 4 + 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(filePath, Buffer.concat([header, data]));
}

const html = String.raw`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: #0f0f0e; }
      canvas { width: 1280px; height: 720px; display: block; }
    </style>
  </head>
  <body>
    <canvas id="c" width="1280" height="720"></canvas>
    <script>
      const canvas = document.getElementById("c");
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      const colors = {
        paper: "#fafaf7",
        ink: "#0f0f0e",
        muted: "#4a4a45",
        line: "#d8d4cb",
        red: "#a8392c",
        redSoft: "#f2e2dc",
        blush: "#e7b6a8",
        green: "#33c481",
        dark: "#171715"
      };

      const scenes = [
        { start: 0, end: 7, eyebrow: "MEMORY IS FEATURE ONE", title: "Stop making every agent start from zero.", body: "MemroOS gives product, sales, and engineering agents a shared company memory before they act.", mode: "intro" },
        { start: 7, end: 15, eyebrow: "RETAIN", title: "Capture what happened.", body: "Files, calls, commits, chats, decisions, customer notes, and agent outcomes become durable memory.", mode: "memory" },
        { start: 15, end: 23, eyebrow: "RETRIEVE", title: "Pull the right context at runtime.", body: "Before dispatch, MemroOS assembles source-backed memories, knowledge files, and relevant skills.", mode: "pack" },
        { start: 23, end: 31, eyebrow: "PRODUCT + SALES + ENGINEERING", title: "Every team starts sharper.", body: "PRDs, account briefs, follow-ups, debug plans, code reviews, migrations, and runbooks stay connected.", mode: "teams" },
        { start: 31, end: 39, eyebrow: "REINFORCE", title: "Completed work improves the next run.", body: "Successful workflows feed back into memory and become durable skills your agents can reuse.", mode: "loop" },
        { start: 39, end: 48, eyebrow: "FULL FEATURE MAP", title: "Memory, context, engagement, skills, trust, evals, runtime, and caching.", body: "A practical operating system for AI-native small businesses running real agent work.", mode: "features" },
        { start: 48, end: 56, eyebrow: "MEMROOS.COM", title: "Give every agent the team's lived context before it starts.", body: "Shared memory for agent workflows.", mode: "final" }
      ];

      function ease(x) {
        x = Math.max(0, Math.min(1, x));
        return 1 - Math.pow(1 - x, 3);
      }
      function pulse(t, speed = 1) {
        return 0.5 + 0.5 * Math.sin(t * speed);
      }
      function lerp(a, b, n) {
        return a + (b - a) * n;
      }
      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
      function text(str, x, y, opts = {}) {
        const {
          size = 36, weight = 600, color = colors.ink, align = "left",
          max = 700, line = size * 1.14, alpha = 1
        } = opts;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.font = weight + " " + size + "px Inter, Arial, sans-serif";
        const words = str.split(" ");
        const lines = [];
        let current = "";
        for (const word of words) {
          const test = current ? current + " " + word : word;
          if (ctx.measureText(test).width > max && current) {
            lines.push(current);
            current = word;
          } else {
            current = test;
          }
        }
        if (current) lines.push(current);
        lines.forEach((lineText, index) => ctx.fillText(lineText, x, y + index * line));
        ctx.restore();
        return lines.length * line;
      }
      function pill(label, x, y, color = colors.red) {
        ctx.save();
        ctx.fillStyle = color;
        roundRect(x, y, 178, 42, 0);
        ctx.fill();
        text(label, x + 18, y + 27, { size: 13, weight: 800, color: "#fff", max: 150 });
        ctx.restore();
      }
      function drawBrand(t, dark = false) {
        ctx.save();
        ctx.fillStyle = dark ? "#fff" : colors.paper;
        roundRect(54, 42, 54, 54, 12);
        ctx.fill();
        ctx.strokeStyle = dark ? "#3a3a34" : colors.line;
        ctx.stroke();
        text("M", 74, 77, { size: 28, weight: 900, color: colors.red, max: 40 });
        text("MemroOS", 122, 64, { size: 24, weight: 800, color: dark ? "#fff" : colors.ink, max: 260 });
        text("Memory OS for agent workflows", 123, 90, { size: 14, weight: 600, color: dark ? "#d8d4cb" : colors.muted, max: 300 });
        ctx.restore();
      }
      function drawNodes(t, cx, cy, scale = 1, dark = false) {
        const nodes = [
          [-210, -70, "PRD"], [-110, -128, "call"], [10, -96, "repo"], [132, -124, "CRM"],
          [220, -54, "chat"], [-172, 56, "beta"], [-34, 102, "notes"], [118, 72, "skills"],
          [0, 0, "MEMORY"]
        ];
        ctx.save();
        ctx.lineWidth = 2;
        for (let i = 0; i < nodes.length - 1; i += 1) {
          const [x, y] = nodes[i];
          const p = ease(Math.min(1, Math.max(0, t * 1.5 - i * 0.08)));
          ctx.strokeStyle = dark ? "rgba(231,182,168,0.42)" : "rgba(168,57,44,0.28)";
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + x * scale * p, cy + y * scale * p);
          ctx.stroke();
        }
        nodes.forEach(([x, y, label], i) => {
          const p = ease(Math.min(1, Math.max(0, t * 1.7 - i * 0.07)));
          const xx = cx + x * scale * p;
          const yy = cy + y * scale * p;
          const main = label === "MEMORY";
          ctx.fillStyle = main ? colors.red : dark ? colors.dark : "#fff";
          ctx.strokeStyle = dark ? "#4a4a45" : colors.line;
          roundRect(xx - (main ? 58 : 42), yy - 24, main ? 116 : 84, 48, 10);
          ctx.fill();
          ctx.stroke();
          text(label, xx, yy + 5, { size: main ? 14 : 12, weight: 800, color: main ? "#fff" : dark ? "#fff" : colors.ink, align: "center", max: 100 });
        });
        ctx.restore();
      }
      function drawContextPack(t) {
        ctx.save();
        ctx.translate(725, 142);
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = colors.ink;
        roundRect(0, 0, 455, 405, 0);
        ctx.fill();
        ctx.stroke();
        text("Runtime Context Pack", 34, 48, { size: 22, weight: 800, max: 360 });
        text("Generated before agent dispatch", 34, 76, { size: 15, weight: 600, color: colors.muted, max: 360 });
        pill("READY", 348, 28, colors.redSoft);
        text("READY", 374, 55, { size: 12, weight: 900, color: colors.red, max: 80 });
        const stats = [["97", "memories"], ["5,854", "files"], ["96", "skills"]];
        stats.forEach(([n, l], i) => {
          const x = 34 + i * 132;
          ctx.fillStyle = colors.paper;
          ctx.fillRect(x, 108, 116, 78);
          text(n, x + 14, 146, { size: 30, weight: 900, max: 90, alpha: ease(t - i * 0.1) });
          text(l, x + 16, 170, { size: 13, weight: 700, color: colors.muted, max: 90 });
        });
        const rows = [
          ["Product", "PRDs, beta feedback, release notes"],
          ["Sales", "Account brief, talk track, follow-up"],
          ["Engineering", "Debug plan, code review, runbook"]
        ];
        rows.forEach(([label, detail], i) => {
          const y = 222 + i * 56;
          const p = ease(t - 0.25 - i * 0.12);
          ctx.globalAlpha = p;
          ctx.fillStyle = i === 1 ? colors.redSoft : "#fff";
          ctx.fillRect(34, y - 24, 386, 44);
          text(label, 54, y + 4, { size: 16, weight: 800, max: 110 });
          text(detail, 170, y + 4, { size: 14, weight: 600, color: colors.muted, max: 250 });
          ctx.globalAlpha = 1;
        });
        ctx.restore();
      }
      function drawTeamCards(t) {
        const cards = [
          ["Product", "Prioritize roadmap", "PRDs + release notes + beta feedback"],
          ["Sales", "Prep the follow-up", "CRM notes + objections + expansion plan"],
          ["Engineering", "Debug faster", "Incident notes + code review + runbook"]
        ];
        cards.forEach(([title, action, detail], i) => {
          const p = ease(t - i * 0.13);
          const x = lerp(1400, 640 + i * 190, p);
          const y = 230 + Math.sin(t * 2 + i) * 9;
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = colors.line;
          roundRect(x, y, 170, 214, 0);
          ctx.fill();
          ctx.stroke();
          text("0" + (i + 1), x + 18, y + 34, { size: 14, weight: 900, color: colors.red, max: 50 });
          text(title, x + 18, y + 78, { size: 22, weight: 900, max: 135 });
          text(action, x + 18, y + 118, { size: 15, weight: 800, max: 135 });
          text(detail, x + 18, y + 154, { size: 13, weight: 600, color: colors.muted, max: 132, line: 18 });
        });
      }
      function drawLoop(t) {
        const labels = ["Capture", "Consolidate", "Retrieve", "Act", "Improve"];
        const cx = 860;
        const cy = 350;
        labels.forEach((label, i) => {
          const angle = -Math.PI / 2 + (i / labels.length) * Math.PI * 2 + t * 0.35;
          const x = cx + Math.cos(angle) * 210;
          const y = cy + Math.sin(angle) * 150;
          ctx.strokeStyle = colors.redSoft;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.fillStyle = "#fff";
          roundRect(x - 75, y - 34, 150, 68, 10);
          ctx.fill();
          ctx.strokeStyle = colors.line;
          ctx.stroke();
          text(label, x, y + 6, { size: 17, weight: 900, align: "center", max: 130 });
        });
        ctx.fillStyle = colors.red;
        roundRect(cx - 90, cy - 44, 180, 88, 12);
        ctx.fill();
        text("MEMORY LOOP", cx, cy + 4, { size: 18, weight: 900, color: "#fff", align: "center", max: 160 });
      }
      function drawFeatures(t) {
        const features = ["Memory", "Knowledge", "Agents", "Trust", "Optimization", "Runtime", "Performance"];
        features.forEach((feature, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const p = ease(t - i * 0.08);
          const x = 660 + col * 230;
          const y = 146 + row * 104;
          ctx.globalAlpha = p;
          ctx.fillStyle = "#fff";
          roundRect(x, y, 200, 78, 0);
          ctx.fill();
          ctx.strokeStyle = colors.line;
          ctx.stroke();
          text(feature, x + 22, y + 34, { size: 20, weight: 900, max: 160 });
          text(i === 0 ? "feature one" : "supporting layer", x + 22, y + 58, { size: 12, weight: 800, color: i === 0 ? colors.red : colors.muted, max: 150 });
          ctx.globalAlpha = 1;
        });
      }
      function drawBackground(t, sceneIndex, dark = false) {
        ctx.fillStyle = dark ? colors.ink : colors.paper;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = dark ? 0.22 : 0.14;
        ctx.strokeStyle = dark ? colors.blush : colors.red;
        for (let i = 0; i < 11; i += 1) {
          const y = 120 + i * 50 + Math.sin(t * 1.4 + i) * 12;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(260, y - 50, 520, y + 70, 780, y);
          ctx.bezierCurveTo(980, y - 42, 1110, y + 34, 1280, y - 12);
          ctx.stroke();
        }
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = dark ? 0.11 : 0.08;
        for (let i = 0; i < 18; i += 1) {
          const x = (i * 143 + t * 52) % 1390 - 70;
          const y = 90 + ((i * 97) % 540);
          ctx.fillStyle = i % 3 === 0 ? colors.red : dark ? "#fff" : colors.ink;
          ctx.beginPath();
          ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      window.renderFrame = (time) => {
        const sceneIndex = scenes.findIndex((scene) => time >= scene.start && time < scene.end);
        const scene = scenes[Math.max(0, sceneIndex)];
        const local = time - scene.start;
        const span = scene.end - scene.start;
        const p = ease(local / 1.1);
        const fadeOut = ease((scene.end - time) / 0.8);
        const alpha = Math.min(p, fadeOut);
        const dark = scene.mode === "memory" || scene.mode === "final";
        drawBackground(time, sceneIndex, dark);
        drawBrand(time, dark);

        ctx.save();
        ctx.globalAlpha = alpha;
        text(scene.eyebrow, 86, 168, { size: 14, weight: 900, color: dark ? colors.blush : colors.red, max: 520 });
        text(scene.title, 86, 236, { size: scene.mode === "features" ? 52 : 62, weight: 900, color: dark ? "#fff" : colors.ink, max: 560, line: scene.mode === "features" ? 58 : 66 });
        text(scene.body, 90, scene.mode === "features" ? 405 : 450, { size: 22, weight: 600, color: dark ? colors.line : colors.muted, max: 520, line: 34 });
        ctx.restore();

        if (scene.mode === "intro") {
          drawContextPack(Math.min(1, local / 2.4));
          drawNodes(local / 5, 965, 500, 0.5, false);
        } else if (scene.mode === "memory") {
          drawNodes(local / 3.2, 910, 356, 1.08, true);
        } else if (scene.mode === "pack") {
          drawContextPack(Math.min(1, local / 2.8));
          const scan = 165 + (local * 78) % 330;
          ctx.save();
          ctx.globalAlpha = 0.36;
          ctx.fillStyle = colors.red;
          ctx.fillRect(724, scan, 456, 4);
          ctx.restore();
        } else if (scene.mode === "teams") {
          drawTeamCards(local / 2);
        } else if (scene.mode === "loop") {
          drawLoop(local);
        } else if (scene.mode === "features") {
          drawFeatures(local / 1.8);
        } else if (scene.mode === "final") {
          drawNodes(1, 890, 360, 0.9, true);
          pill("SEE THE LOOP", 90, 565, colors.red);
        }

        ctx.save();
        ctx.fillStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(15,15,14,0.12)";
        ctx.fillRect(86, 650, 1090, 2);
        ctx.fillStyle = colors.red;
        ctx.fillRect(86, 650, 1090 * (time / 56), 2);
        ctx.restore();
      };
    </script>
  </body>
</html>`;

writeSynthAudio(audioPath);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });

for (let frame = 0; frame < frameCount; frame += 1) {
  const time = frame / fps;
  await page.evaluate((value) => window.renderFrame(value), time);
  await page.screenshot({
    path: path.join(frameDir, `frame-${String(frame).padStart(5, "0")}.png`),
    clip: { x: 0, y: 0, width, height },
  });
  if (frame % 60 === 0) {
    console.log(`rendered ${frame}/${frameCount} frames`);
  }
}

await browser.close();

run("ffmpeg", [
  "-y",
  "-framerate", String(fps),
  "-i", path.join(frameDir, "frame-%05d.png"),
  "-i", audioPath,
  "-shortest",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-profile:v", "high",
  "-crf", "23",
  "-preset", "medium",
  "-movflags", "+faststart",
  "-c:a", "aac",
  "-b:a", "128k",
  outputPath,
]);

run("ffmpeg", [
  "-y",
  "-ss", "00:00:02",
  "-i", outputPath,
  "-vframes", "1",
  "-update", "1",
  "-q:v", "2",
  posterPath,
]);

rmSync(frameDir, { recursive: true, force: true });
console.log(`wrote ${outputPath}`);
console.log(`wrote ${posterPath}`);
