const KEY = "proof-projects-v2";
const legacy = "proof-projects-v1";
const ACC = "proof-accounts-v1";
const SES = "proof-session-v1";
const AUTH_STEP = 3; // steps 0-2 shape the idea for free; steps 3-5 are the personalized result behind the local account
const steps = [
  { title: "Say it roughly", short: "Rough idea", time: "20 sec" },
  { title: "Make it yours", short: "Founder fit", time: "40 sec" },
  { title: "Make it real", short: "Reality check", time: "30 sec" },
  { title: "Find the best version", short: "Shape", time: "40 sec" },
  { title: "Get the call", short: "The plan", time: "30 sec" },
  { title: "Build with proof", short: "Build", time: "Ongoing" },
];
const coaches = [
  {
    id: "cuban",
    icon: "MC",
    name: "Mark Cuban AI",
    tag: "Sales, speed, and execution",
    inspired:
      "An AI simulation inspired by Mark Cuban's publicly associated execution-first, sales-focused business ideas",
    hello:
      "Cut the pitch down. Who is the buyer, what painful result do they need, and what can you sell before you build more?",
    prompt: "What did you ship, test, or sell today?",
  },
  {
    id: "blakely",
    icon: "SB",
    name: "Sara Blakely AI",
    tag: "Creativity, customer insight, and resilience",
    inspired:
      "An AI simulation inspired by Sara Blakely's publicly associated ideas about resourceful invention, learning from failure, and staying close to customers",
    hello:
      "Start with the awkward customer problem. Your constraints can force the simplest, most inventive first version.",
    prompt: "What customer frustration can you turn into a simple test?",
  },
  {
    id: "hoffman",
    icon: "RH",
    name: "Reid Hoffman AI",
    tag: "Networks, distribution, and scaling",
    inspired:
      "An AI simulation inspired by Reid Hoffman's publicly associated ideas about networks, learning quickly, and scaling only after finding a strong wedge",
    hello:
      "Find the smallest network where this can spread. Prove one useful loop before you design for scale.",
    prompt: "Who can help the first ten users find one another?",
  },
];
let state = { screen: "landing", project: null, coachOpen: false, ideation: null, account: null, gateReturn: AUTH_STEP, authMode: "create", linkedinNote: false };
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  (s || "").replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function saveAll(x) {
  localStorage.setItem(KEY, JSON.stringify(x));
}
function persist() {
  let xs = load(),
    i = xs.findIndex((x) => x.id === state.project.id);
  i < 0 ? xs.push(state.project) : (xs[i] = state.project);
  saveAll(xs);
}
function toast(t) {
  let x = $("#toast");
  x.textContent = t;
  x.classList.add("show");
  setTimeout(() => x.classList.remove("show"), 1700);
}

/* ---------- local accounts (honest, this-browser-only) ---------- */
function accounts() {
  try {
    return JSON.parse(localStorage.getItem(ACC)) || [];
  } catch {
    return [];
  }
}
function saveAccounts(x) {
  localStorage.setItem(ACC, JSON.stringify(x));
}
function currentAccount() {
  const e = localStorage.getItem(SES);
  return accounts().find((a) => a.email === e) || null;
}
async function hashPass(salt, pass) {
  const data = salt + "::" + pass;
  try {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {}
  // demo-grade fallback when WebCrypto is unavailable (local-only prototype)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}
function accountChip(cls = "") {
  const a = state.account;
  if (!a) return "";
  return `<span class="account-chip ${cls}" title="Local account - stored only in this browser"><i>${esc(a.name.trim()[0].toUpperCase())}</i><span>${esc(a.name.split(" ")[0])}<small>Local account</small></span></span><button class="ghost-btn" id="logout">Log out</button>`;
}

function nameIdea(idea) {
  let w =
    idea
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .split(" ")
      .find(
        (x) => x.length > 5 && !["people", "something", "business"].includes(x),
      ) || "Venture";
  return w[0].toUpperCase() + w.slice(1) + " Project";
}
function fresh(idea, seed = {}) {
  return Object.assign({
    id: Date.now(),
    created: new Date().toISOString(),
    idea,
    name: nameIdea(idea),
    v3: true,
    step: 0,
    customer: "",
    outcome: "",
    advantage: "",
    timing: "unknown",
    constraint: "",
    skills: "",
    experience: "",
    time: "",
    budget: "",
    network: "",
    risk: "",
    pivot: null,
    decisionSeen: false,
    coach: null,
    evidence: [],
    visitors: 0,
    signups: 0,
    mvp: false,
    pipeline: [],
    coachMessages: [],
    origin: "direct",
    ideationTranscript: [],
  }, seed);
}
function hydrate(p) {
  const stepMap = { 0: 0, 1: 2, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5 };
  const q = Object.assign(
    {
      customer: "",
      outcome: "",
      advantage: "",
      timing: "unknown",
      constraint: "",
      skills: "",
      experience: "",
      time: "",
      budget: "",
      network: "",
      risk: "",
      pivot: null,
      decisionSeen: false,
      coach: null,
      evidence: [],
      visitors: 0,
      signups: 0,
      mvp: false,
      pipeline: [],
      coachMessages: [],
      origin: "direct",
      ideationTranscript: [],
      step: 0,
    },
    p,
  );
  if (q.v3 !== true) {
    q.step = stepMap[q.step] ?? 0;
    q.v3 = true;
  }
  return q;
}
function pivotOptions(p) {
  let who = p.customer.trim() || "one narrow group with this problem";
  let result = p.outcome.trim() || "the core result";
  return [
    {
      name: "Concierge first",
      fit: "Best for learning fast",
      desc: `Deliver ${result} manually for ${who}. Charge early, watch the work, and only automate what repeats.`,
      risk: "Can you reach 5 possible buyers this week?",
      offer:
        "I will personally help you get the result this week. Pay only if it works.",
    },
    {
      name: "Tiny self-serve tool",
      fit: "Best if the job repeats often",
      desc: `Build one small tool for ${who} that handles the hardest recurring step, not the whole vision.`,
      risk: "Will people return without hand-holding?",
      offer: "Try the smallest working version on one real task.",
    },
    {
      name: "Service with software later",
      fit: "Best if trust matters",
      desc: `Start as a focused service for ${who}, learn the workflow, then turn the repeatable parts into software.`,
      risk: "Can delivery produce a healthy margin?",
      offer: "A done-with-you pilot with a clear outcome and fixed scope.",
    },
  ];
}
function recPivot(p) {
  if (p.pivot !== null && p.pivot !== undefined) return p.pivot;
  const tight = !p.budget || p.budget === "$0" || p.budget === "<$500";
  if (tight || p.risk === "low") return 0;
  if (p.risk === "high" && (p.time === "10-20" || p.time === "20+")) return 1;
  return 0;
}
function score(p) {
  let thinking =
    (p.customer ? 4 : 0) +
    (p.outcome ? 4 : 0) +
    (p.pivot !== null ? 4 : 0) +
    (p.decisionSeen ? 3 : 0);
  let conv = Math.min(25, p.evidence.length * 2.5);
  let commits = Math.min(10, p.evidence.filter((e) => e.commit).length * 2);
  let conversion = p.visitors ? Math.min(10, (p.signups / p.visitors) * 50) : 0;
  let mvp = p.mvp ? 10 : 0;
  let paid = Math.min(
    30,
    p.pipeline.filter((x) => x.stage === "Paying").length * 10,
  );
  return Math.round(thinking + conv + commits + conversion + mvp + paid);
}
function verdict(p) {
  let grounded = !!(p.customer && p.outcome),
    now = p.timing === "now",
    hard = p.constraint === "blocked";
  if (hard)
    return {
      word: "PARK IT",
      tone: "park",
      text: "A real blocker makes this the wrong time. Keep the insight, remove the blocker, then rerun the sprint.",
    };
  if (!grounded)
    return {
      word: "PIVOT FIRST",
      tone: "pivot",
      text: "There is something here, but the first customer or result is still fuzzy. Start with the concierge version and let five conversations shape it.",
    };
  if (now)
    return {
      word: "START SMALL",
      tone: "go",
      text: "The idea is clear enough and the timing signal is real. Do not build the whole thing. Start the seven-day test below.",
    };
  return {
    word: "TEST NOW",
    tone: "go",
    text: "You do not need to know if this is a great company yet. It is good enough for a cheap, one-week test.",
  };
}
function gate(p, i) {
  const authed = !!state.account;
  return [true, true, true, authed && p.pivot !== null, authed && p.decisionSeen, authed][i];
}
function maxOpen(p) {
  for (let i = 0; i < 6; i++) if (!gate(p, i)) return i;
  return 5;
}
function render() {
  if (state.screen === "work" && state.project && !state.account && state.project.step >= AUTH_STEP) {
    state.gateReturn = Math.min(state.project.step, 5);
    state.screen = "gate";
  }
  window.scrollTo(0, 0);
  $("#app").innerHTML =
    state.screen === "landing" ? landing() :
    state.screen === "ideate" ? ideateView() :
    state.screen === "gate" ? gateView() : workspace();
  bind();
  enhance();
}
function landing() {
  let xs = load();
  return `<div class="landing"><nav class="nav"><div class="brand"><span class="brand-mark">P</span> Proof</div><div class="nav-right">${state.account ? accountChip() : '<button class="ghost-btn" id="how">See how it works</button>'}</div></nav><main class="hero entry-hero"><span class="eyebrow"><i class="dot"></i> Evidence Lab for first founders</span><h1>Type one messy sentence.<br><em>Leave with a founder plan.</em></h1><p class="hero-sub">Proof shapes your idea, matches you and your idea with the right entrepreneurship framework, and turns it into a tailored first-week plan.</p><div class="idea-box hero-idea"><textarea id="idea" placeholder="Example: a tool that helps independent gyms keep members from quitting..." aria-label="Type your idea"></textarea><button class="start" id="start">Shape this idea →</button></div><div class="alt-route"><span>Not sure what your idea is yet?</span><button class="alt-link" id="ideate"><span class="bot-avatar">P</span> Ideate with me instead →</button></div><p class="soft-note">Free to shape · Create a free account to unlock your plan · Everything stays on this device</p></main><section class="preview" id="preview"><div class="preview-head"><div><span class="step-kicker">The path</span><h2>Six steps from sentence to first test.</h2></div><p>Steps 01-03 shape the idea, free. Steps 04-06 are your personalized result - unlocked with a free account.</p></div><div class="seven">${steps.map((s, i) => `<div class="mini-step ${i >= AUTH_STEP ? "locked" : ""}"><div class="mini-num">0${i + 1} · ${i >= AUTH_STEP ? "🔒 " : ""}${s.time}</div><b>${s.title}</b></div>`).join("")}</div></section>${xs.length ? `<section class="projects-wrap"><span class="step-kicker">Your ideas</span><h2>Pick up where you left off</h2><div class="project-list">${xs.map((p) => `<button class="project-card resume" data-id="${p.id}"><small>${new Date(p.created).toLocaleDateString()} · ${p.origin === "ideation" ? "Guided conversation" : "Direct idea"}</small><h3>${esc(p.name)}</h3><p>${esc(p.idea)}</p><span class="score-sm">${readiness(hydrate(p))}</span><small> readiness</small></button>`).join("")}</div></section>` : ""}</div>`;
}
const ideaStages = [
  { key: "spark", label: "Problem" },
  { key: "moment", label: "Real moment" },
  { key: "customer", label: "First people" },
  { key: "outcome", label: "Better result" },
  { key: "skills", label: "Founder fit" },
  { key: "constraint", label: "First version" },
];
function usefulIdeaAnswer(v) { return v && v !== "I don't know yet"; }
function ideaReply(d) {
  const a = d.answers, last = d.messages.filter(m => m.role === "user").at(-1)?.text || "";
  if (!usefulIdeaAnswer(a.spark)) return { key: "spark", text: "What problem, group, or change keeps pulling your attention?", hint: "Start anywhere. A frustration, a type of person, or a change you keep noticing is enough." };
  if (!usefulIdeaAnswer(a.moment)) return { key: "moment", text: `You said “${a.spark}.” What is one real moment when you saw or felt that problem?`, hint: "A specific story helps me ask a better next question than a broad market description." };
  if (!usefulIdeaAnswer(a.customer)) {
    const personal = /\b(i|my|me|we|our)\b/i.test(a.moment || "");
    return { key: "customer", text: personal ? "It sounds like you know this problem firsthand. Who else has the same problem often enough to try an early solution?" : `In that moment - “${a.moment}” - who felt the pain most directly?`, hint: "Choose the first reachable person, not the whole eventual market." };
  }
  if (!usefulIdeaAnswer(a.outcome)) return { key: "outcome", text: `If this worked for ${a.customer}, what would be meaningfully different by the end of a week?`, hint: "Describe the result they would notice, not the feature you would build." };
  if (!usefulIdeaAnswer(a.skills)) {
    const signal = /build|code|design|sell|know|worked|experience|access/i.test(last);
    return { key: "skills", text: signal ? "There may already be an edge in what you just said. What skills, access, experience, or unusual curiosity can you bring?" : `Why might you be a good person to test this with ${a.customer}?`, hint: "Curiosity and access count. You do not need to claim expertise." };
  }
  if (!usefulIdeaAnswer(a.constraint)) return { key: "constraint", text: `Given your advantage - “${a.skills}” - what is the smallest version you could test without overbuilding?`, hint: "Name the limit: time, cash, rules, technical ability, or access." };
  return null;
}
function ideaStageIndex(d) { return Math.min(ideaStages.length, Object.values(d.answers).filter(usefulIdeaAnswer).length); }
function ideaReady(d) { return Object.values(d.answers).filter(usefulIdeaAnswer).length >= 4; }
function startIdeation() {
  const d = { answers: {}, messages: [] };
  const q = ideaReply(d);
  d.currentKey = q.key;
  d.messages.push({ role: "proof", text: q.text });
  state.ideation = d;
  state.screen = "ideate";
  render();
}
function ideaDirection(a) {
  const spark = usefulIdeaAnswer(a.spark) ? a.spark : (usefulIdeaAnswer(a.moment) ? a.moment : "a problem worth exploring");
  const who = usefulIdeaAnswer(a.customer) ? a.customer : "a reachable first group";
  const outcome = usefulIdeaAnswer(a.outcome) ? a.outcome : "a clearer, easier result";
  return `Help ${who} achieve ${outcome} by starting with ${spark}`;
}
function ideateView() {
  const d = state.ideation, q = ideaReply(d), done = !!d.done, ready = ideaReady(d), count = ideaStageIndex(d), a = d.answers;
  const progress = Math.round((count / ideaStages.length) * 100);
  return `<div class="ideation-page"><nav class="nav"><button class="brand brand-button" id="backLanding"><span class="brand-mark">P</span> Proof</button><span class="local-badge"><i class="dot"></i> Live local conversation</span></nav><main class="ideation-shell"><aside class="ideation-brief"><span class="step-kicker">IDEA LAB · ${done ? "RESULT READY" : ready ? "ENOUGH TO BUILD" : "LISTENING"}</span><h1>${done ? "Your idea has a shape." : "Talk it through. Watch the idea take shape."}</h1><p>${done ? "This working direction came from the conversation. You can carry it into the founder path or keep refining it." : "Proof reacts to what you say, follows useful details, and turns the conversation into a founder plan."}</p><div class="idea-progress" aria-label="Idea progress ${progress}%"><i style="width:${progress}%"></i></div><div class="idea-stage-list">${ideaStages.map((x,i) => `<div class="idea-stage ${i < count ? "complete" : i === count ? "current" : ""}"><span>${i < count ? "✓" : String(i+1).padStart(2,"0")}</span><b>${x.label}</b></div>`).join("")}</div><small>${ready && !done ? "There is enough signal for a first result. Keep talking, or see it now." : "Your conversation stays in this browser and becomes editable fields in the plan."}</small></aside><section class="ideation-chat"><div class="chat-thread" aria-live="polite">${d.messages.map(m => `<div class="chat-message ${m.role}">${m.role === "proof" ? '<span class="bot-avatar">P</span>' : ""}<div>${esc(m.text)}</div></div>`).join("")}${done ? `<div class="synthesis-card"><span class="path-number">YOUR WORKING DIRECTION</span><h2>${esc(ideaDirection(a))}</h2><dl><div><dt>First user</dt><dd>${esc(a.customer || "Open question")}</dd></div><div><dt>Desired result</dt><dd>${esc(a.outcome || "Open question")}</dd></div><div><dt>Founder fit</dt><dd>${esc(a.skills || "No advantage claimed yet")}</dd></div><div><dt>Small first version</dt><dd>${esc(a.constraint || "Keep it deliberately small")}</dd></div></dl><p class="import-note">A working hypothesis from your conversation, not market validation.</p><button class="start" id="useDirection">Use these results →</button><button class="btn" id="keepTalking">Keep talking</button><button class="btn" id="restartIdeation">Start over</button></div>` : ""}</div>${!done ? `<form class="ideation-composer" id="ideationForm"><div class="live-prompt"><span class="bot-avatar">P</span><div><label for="ideationAnswer">${esc(q.text)}</label><small>${esc(q.hint)}</small></div></div><textarea id="ideationAnswer" placeholder="Reply naturally... You can write a sentence or think out loud." autofocus></textarea><div class="composer-actions"><button type="button" class="ghost-btn" id="notSure">I’m not sure</button><div class="composer-right">${ready ? '<button type="button" class="btn see-results" id="seeResults">See results</button>' : ""}<button class="start" type="submit">Send ↑</button></div></div></form>` : ""}</section></main></div>`;
}
function acceptIdeationAnswer(value) {
  const d = state.ideation, clean = value.trim();
  if (!clean) return toast("Say it however it comes out.");
  if (/^(see|show)( me)? (the )?results?[.!]?$/i.test(clean)) return finishIdeation();
  const q = ideaReply(d);
  d.answers[q.key] = clean;
  d.messages.push({ role: "user", text: clean });
  const next = ideaReply(d);
  if (next) {
    d.currentKey = next.key;
    const acknowledgment = q.key === "spark" ? "That gives us a thread to follow." : q.key === "moment" ? "Good - a real moment is more useful than a polished pitch." : q.key === "customer" ? `That narrows the first audience to ${clean}.` : q.key === "outcome" ? "Now we have a result to test for." : q.key === "skills" ? "That changes what the first version should ask you to do." : "That is enough to keep the first test honest.";
    d.messages.push({ role: "proof", text: `${acknowledgment} ${next.text}` });
  } else finishIdeation(false);
  render();
}
function finishIdeation(shouldRender = true) {
  const d = state.ideation;
  if (!ideaReady(d)) return toast("A little more context first - four signals is enough.");
  d.done = true;
  d.messages.push({ role: "proof", text: "I have enough to turn this into a useful first direction. Here is what I heard." });
  if (shouldRender) render();
}
function projectFromIdeation() {
  const d = state.ideation, a = d.answers, idea = ideaDirection(a);
  const constraint = /blocked|regulation|legal|cannot|can't|no access/i.test(a.constraint || "") ? "blocked" : (a.constraint ? "none" : "unknown");
  return fresh(idea, { origin: "ideation", customer: usefulIdeaAnswer(a.customer) ? a.customer : "", outcome: usefulIdeaAnswer(a.outcome) ? a.outcome : "", skills: usefulIdeaAnswer(a.skills) ? a.skills : "", advantage: usefulIdeaAnswer(a.skills) ? a.skills : "", constraint, timing: "unknown", ideationTranscript: d.messages.slice(), ideationAnswers: a });
}
/* ---------- account gate ---------- */
function gateView() {
  const p = state.project;
  const v = p ? verdict(p) : { word: "YOUR CALL" };
  const shape = p ? pivotOptions(p)[recPivot(p)].name : "Your shape";
  const fw = p ? chooseFramework(p).name : "Your framework";
  const create = state.authMode === "create";
  return `<div class="gate-page"><nav class="nav"><button class="brand brand-button" id="gateBack"><span class="brand-mark">P</span> Proof</button><span class="local-badge"><i class="dot"></i> Local prototype · nothing leaves this device</span></nav><main class="gate-shell"><section class="gate-info"><span class="step-kicker">SHAPING DONE · RESULT READY</span><h1>Your founder plan is built.<br><em>Create a free account to see it.</em></h1><p>Steps 04-06 are personalized to your founder profile and your idea: Proof's call, your best first shape, and a framework-matched week plan.</p><div class="locked-preview"><div class="locked-blur"><div class="lp-row"><small>PROOF'S CALL</small><b>${v.word}</b></div><div class="lp-row"><small>RECOMMENDED SHAPE</small><b>${esc(shape)}</b></div><div class="lp-row"><small>YOUR FRAMEWORK</small><b>${esc(fw)}</b></div></div><div class="locked-stamp">🔒 Unlocks with your free account</div></div><p class="import-note">Why the wall: your plan saves to your account so you can leave and pick it back up. In this prototype the account lives only in this browser.</p></section><section class="auth-card"><div class="auth-tabs"><button class="auth-tab ${create ? "selected" : ""}" data-mode="create">Create account</button><button class="auth-tab ${!create ? "selected" : ""}" data-mode="login">Log in</button></div>${create ? `<label class="field"><span>Name</span><input id="accName" placeholder="What should Proof call you?" autocomplete="name"></label><label class="field"><span>Email</span><input id="accEmail" type="email" placeholder="you@example.com" autocomplete="email"></label><label class="field"><span>Password</span><input id="accPass" type="password" placeholder="At least 4 characters" autocomplete="new-password"></label><button class="start" id="createAccount">Create free account →</button>` : `<label class="field"><span>Email</span><input id="loginEmail" type="email" placeholder="you@example.com" autocomplete="email"></label><label class="field"><span>Password</span><input id="loginPass" type="password" placeholder="Your password" autocomplete="current-password"></label><button class="start" id="doLogin">Log in →</button><p class="import-note">Only accounts created on this device can log in here.</p>`}<div class="auth-divider"><span>or</span></div><button class="linkedin-btn" id="linkedinGate"><b>in</b> Continue with LinkedIn</button><p class="linkedin-value">Tailor your plan to your experience, skills, network, and business style.</p><p class="linkedin-status">Coming soon · not connected in this prototype</p>${state.linkedinNote ? `<p class="linkedin-note">LinkedIn connection needs a server, so it is not active yet. Create a local account to continue now.</p>` : ""}<p class="auth-disclosure">Local account: stored only in this browser, password hashed, nothing sent to any server. Clearing site data deletes the account.</p></section></main></div>`;
}

function workspace() {
  let p = state.project,
    open = maxOpen(p),
    s = score(p);
  if (p.step > open) p.step = open;
  return `<div class="workspace"><aside class="sidebar"><div class="brand"><span class="brand-mark">P</span> Proof</div><div class="side-project"><small>ROUGH IDEA</small><h3>${esc(p.name)}</h3><p>${esc(p.idea)}</p></div><div class="track">${steps.map((x, i) => { const locked = !state.account && i >= AUTH_STEP; return `<button class="track-step ${i === p.step ? "current" : ""} ${i <= open && !locked ? "open" : ""} ${locked ? "locked" : ""}" data-step="${i}" ${i > open || locked ? "disabled" : ""}><i class="circle">${gate(p, i) && i < p.step ? "✓" : locked ? "🔒" : i + 1}</i><span><b>${x.short}</b><small>${locked ? "Account needed" : i > open ? "Locked" : x.time}</small></span></button>`; }).join("")}</div><div class="side-account">${state.account ? accountChip() : '<button class="ghost-btn" id="unlockBtn">🔒 Unlock your plan</button>'}</div></aside><main class="main"><header class="topbar"><div class="project-title"><div><h2>${esc(p.name)}</h2><p>Founder path</p></div><div class="score-box"><div class="score-line"><span>Build Readiness</span><b>${readiness(p)}</b></div><div class="bar"><i style="width:${s}%"></i></div></div></div></header><section class="content">${stepView(p, p.step)}</section>${p.coach ? `<button class="coach-button">${coachById(p.coach).icon} Ask ${coachById(p.coach).name}</button>` : ""}${state.coachOpen ? coachPanel() : ""}</main></div>`;
}
function frame(i, body, sub = "") {
  let p = state.project,
    done = gate(p, i);
  const last = i === 5;
  const nextLabel = i === 2 ? (state.account ? "See my result" : "Unlock my result") : i === 4 ? "See my build plan" : "Continue";
  return `<div class="step-head"><span class="step-kicker">${steps[i].time} · Step ${i + 1} of 6</span><h1>${steps[i].title}</h1><p>${sub}</p></div>${body}<div class="gate"><div><b>${done ? "Ready to move on" : "One quick choice left"}</b><small>Saved automatically. You can revise this later.</small></div>${!last ? `<button class="btn primary next" ${done ? "" : "disabled"}>${nextLabel} →</button>` : '<button class="btn primary" id="home">Back to ideas</button>'}</div>`;
}
function shell(p, body, sub = "", label = "Finish") {
  return `<div class="step-head"><span class="step-kicker">Step 6 of 6 · ${steps[5].time}</span><h1>${steps[5].title}</h1><p>${sub}</p></div>${body}<div class="gate"><div><b>${label}</b><small>Your plan, coach, and evidence are saved to your local account on this device.</small></div><button class="btn primary" id="home">Back to ideas</button></div>`;
}
function stepView(p, i) {
  return [rough, founderFit, reality, pivots, callPlan, build][i](p);
}
function rough(p) {
  return frame(
    0,
    `<div class="card easy-card"><h3>That is enough to begin.</h3><p class="big-idea">“${esc(p.idea)}”</p><p>Proof will make useful assumptions and label them. You are not being graded on knowing the market yet.</p></div><div class="card"><label class="field"><span>Who might want this first? <em>Optional</em></span><textarea id="customer" placeholder="A guess is fine. Or leave this blank.">${esc(p.customer)}</textarea></label><label class="field"><span>What gets better for them? <em>Optional</em></span><textarea id="outcome" placeholder="Less time, more money, fewer mistakes, less stress...">${esc(p.outcome)}</textarea></label></div>`,
    "Start with what you know. Missing answers become things to test, not reasons to stop.",
  );
}
function founderFit(p) {
  return frame(
    1,
    `<div class="card"><div class="section-title">Build this around you</div><p>Proof picks your framework and tailors every next step to your reality - skills, experience, time, money, network, and risk. Not a generic checklist.</p><div class="founder-import"><button class="btn linkedin-connect">Personalize with LinkedIn</button><button class="btn manual-profile">Enter manually</button></div><p class="linkedin-value founder-linkedin-value">Use your experience, skills, network, and business style to shape a plan that fits you.</p><p class="linkedin-status">Coming soon · LinkedIn is not connected in this prototype. Enter manually for now.</p><div class="founder-fields"><input class="founder-input" data-field="skills" value="${esc(p.skills || "")}" placeholder="Skills (design, sales, coding...)"><select class="founder-input" data-field="experience"><option value="">Experience level</option><option ${p.experience === "first" ? "selected" : ""} value="first">First venture</option><option ${p.experience === "projects" ? "selected" : ""} value="projects">Built side projects</option><option ${p.experience === "business" ? "selected" : ""} value="business">Ran a business before</option></select><select class="founder-input" data-field="time"><option value="">Hours per week</option><option ${p.time === "<5" ? "selected" : ""} value="<5">Under 5 hours</option><option ${p.time === "5-10" ? "selected" : ""} value="5-10">5-10 hours</option><option ${p.time === "10-20" ? "selected" : ""} value="10-20">10-20 hours</option><option ${p.time === "20+" ? "selected" : ""} value="20+">20+ hours</option></select><select class="founder-input" data-field="budget"><option value="">Starting budget</option><option ${p.budget === "$0" ? "selected" : ""} value="$0">$0 - sweat only</option><option ${p.budget === "<$500" ? "selected" : ""} value="<$500">Under $500</option><option ${p.budget === "<$5k" ? "selected" : ""} value="<$5k">Under $5,000</option><option ${p.budget === "$5k+" ? "selected" : ""} value="$5k+">$5,000+</option></select><input class="founder-input" data-field="network" value="${esc(p.network || "")}" placeholder="People or communities you can reach"><select class="founder-input" data-field="risk"><option value="">Risk tolerance</option><option ${p.risk === "low" ? "selected" : ""} value="low">Low - protect time and cash</option><option ${p.risk === "medium" ? "selected" : ""} value="medium">Medium - test before betting</option><option ${p.risk === "high" ? "selected" : ""} value="high">High - move fast</option></select></div></div>`,
    "Six honest answers about you. They decide which framework fits and how big your first steps should be.",
  );
}
function reality(p) {
  return frame(
    1 + 1,
    `<div class="card"><div class="section-title">Three quick signals</div><label class="field"><span>Why might you have an edge? <em>Optional</em></span><input id="advantage" value="${esc(p.advantage)}" placeholder="You lived it, know buyers, have data, or just noticed it"></label><label class="field"><span>Is there a reason to start now?</span><div class="choice-row">${[
      ["now", "Yes, something changed"],
      ["unknown", "Not sure"],
      ["later", "No clear reason"],
    ]
      .map(
        (x) =>
          `<button class="choice timing ${p.timing === x[0] ? "selected" : ""}" data-v="${x[0]}">${x[1]}</button>`,
      )
      .join(
        "",
      )}</div></label><label class="field"><span>What is the biggest constraint?</span><div class="choice-row">${[
      ["none", "Nothing fatal"],
      ["unknown", "I don’t know yet"],
      ["blocked", "Money, rules, or access blocks it"],
    ]
      .map(
        (x) =>
          `<button class="choice constraint ${p.constraint === x[0] ? "selected" : ""}" data-v="${x[0]}">${x[1]}</button>`,
      )
      .join(
        "",
      )}</div></label></div><div class="card assumption-card"><b>Proof’s working assumptions</b><ul><li>${p.customer ? `First user: ${esc(p.customer)}` : "First user is unknown. The plan will test three possible profiles."}</li><li>${p.outcome ? `Desired result: ${esc(p.outcome)}` : "The core result is unknown. The first interviews will look for the costly outcome."}</li><li>${p.advantage ? `Possible edge: ${esc(p.advantage)}` : "No founder edge claimed yet. That is fine for a one-week test."}</li></ul></div>`,
    "Quick signals only. Proof separates guesses from facts so you can keep moving.",
  );
}
function pivots(p) {
  let opts = pivotOptions(p), rec = recPivot(p);
  return frame(
    3,
    `<div class="card"><div class="section-title">Three realistic ways to start the same idea</div><p>Pick the version you would be willing to test next week. Proof flags the one that fits your time, budget, and risk - but the call is yours.</p><div class="options">${opts.map((v, i) => `<button class="option version ${p.pivot === i ? "selected" : ""}" data-i="${i}"><span class="verdict">${i === rec ? "★ Recommended for you" : v.fit}</span><h3>${v.name}</h3><p>${esc(v.desc)}</p><div class="details"><b>Question to prove:</b> ${esc(v.risk)}<br><b>First offer:</b> ${esc(v.offer)}</div></button>`).join("")}</div></div>`,
    "A good pivot keeps the insight and changes the risky way you planned to deliver it.",
  );
}
function callPlan(p) {
  let v = verdict(p),
    opt = pivotOptions(p)[p.pivot ?? recPivot(p)],
    o = opt,
    who = p.customer || "3 people who recently felt this problem";
  return frame(
    4,
    `<div class="decision-card ${v.tone}"><span class="step-kicker">PROOF’S CALL</span><h2>${v.word}</h2><p>${v.text}</p></div><div class="card"><h3>Why</h3><div class="signal-list"><div><b>${p.customer ? "Clear enough" : "Unknown"}</b><span>First customer</span></div><div><b>${p.outcome ? "Clear enough" : "Unknown"}</b><span>Desired result</span></div><div><b>${p.timing === "now" ? "Signal" : "Unproven"}</b><span>Why now</span></div><div><b>${p.constraint === "blocked" ? "Blocked" : "Testable"}</b><span>Feasibility</span></div></div><p><b>Recommended shape:</b> ${opt.name}. ${opt.desc}</p>${!p.decisionSeen ? `<button class="btn primary" id="acceptCall">I understand the call</button>` : `<p class="accepted-note">✓ Call accepted. Your kickoff is below.</p>`}</div><div class="card"><span class="verdict">YOUR FIRST 48 HOURS</span><h3>Make contact before making product</h3><ol class="plan"><li><b>Write a one-line offer.</b><span>${esc(o.offer)}</span></li><li><b>List five reachable people.</b><span>Start with ${esc(who)}, warm introductions, or a focused online group.</span></li><li><b>Ask about the last time.</b><span>“Tell me about the last time you tried to solve this. What did you do?”</span></li></ol></div><div class="card"><span class="verdict">7-DAY KICKOFF</span><div class="week-grid"><div><b>Days 1-2</b><p>Talk to 5 people. Look for repeated pain and existing workarounds.</p></div><div><b>Day 3</b><p>Choose one narrow customer and one result. Rewrite the offer.</p></div><div><b>Days 4-5</b><p>Deliver the result manually or show the tiniest working version.</p></div><div><b>Days 6-7</b><p>Ask for a commitment: payment, pilot, intro, or a dated next step.</p></div></div></div><div class="card warning"><b>Do not build yet if...</b><p>Nobody can describe a recent painful instance, nobody uses a workaround, or you cannot reach five plausible users. Pivot the customer or problem before adding features.</p></div>`,
    "A useful answer is not always “yes.” It tells you what to do next without pretending guesses are facts.",
  );
}
function readiness(p) {
  if (p.pipeline.some((x) => x.stage === "Paying")) return "SELLING";
  if (p.mvp && p.evidence.length >= 5) return "TESTING";
  if (p.decisionSeen) return "READY TO START";
  return "SHAPING";
}

function companyPitch(p) {
  const o = pivotOptions(p)[p.pivot ?? recPivot(p)];
  const buyer = p.customer || "a specific first customer";
  const pain = p.problem || p.idea;
  return `${p.name} helps ${buyer} solve ${pain} through ${o.name.toLowerCase()}. We start with the smallest paid result, learn directly from users, and only build what earns demand.`;
}

/* ---------- framework engine ---------- */
function chooseFramework(p) {
  const unknownCustomer = !p.customer.trim();
  const unknownOutcome = !p.outcome.trim();
  const firstTimer = !p.experience || p.experience === "first";
  const tightBudget = !p.budget || p.budget === "$0" || p.budget === "<$500";
  const careful = p.risk === "low";
  const softwareShape = (p.pivot ?? recPivot(p)) === 1;
  const who = p.customer.trim() || "your first reachable customer";
  const result = p.outcome.trim() || "the core result";
  if (unknownCustomer || unknownOutcome)
    return {
      id: "custdev", name: "Customer Development", by: "Steve Blank",
      why: `${unknownCustomer ? "Your first customer" : "The result you want to deliver"}${unknownCustomer && unknownOutcome ? " and the result they want are" : " is"} still a guess, so building anything now would mostly burn time. This framework turns guesses into facts through direct customer contact before you design the product.`,
      steps: [
        `Write down your guesses: who ${who} is and what “${result}” really means to them`,
        "Get out of the building: 5 conversations about the last time they faced this - not opinions about your idea",
        "Separate facts from guesses: keep only what at least 3 people confirmed",
        "Re-aim the idea at the confirmed customer and result, then rerun Proof's call",
      ],
    };
  if (firstTimer && (tightBudget || careful))
    return {
      id: "effectuation", name: "Effectuation", by: "Saras Sarasvathy",
      why: `you are working from limited means - ${p.budget === "$0" ? "no budget" : "a small budget"}${careful ? " and a low risk tolerance" : ""} - so instead of predicting a big market, you start from who you are, what you know, and whom you know, and only risk what you can afford to lose.`,
      steps: [
        `List your means: your skills (${esc(p.skills) || "add yours"}), your network (${esc(p.network) || "add yours"}), and your weekly hours`,
        "Set an affordable loss: the most time and money this test may cost you",
        `Offer ${result} to ${who} using only the means you already have`,
        "Bring the first believers in as partners and let their commitments reshape the offer",
      ],
    };
  if (softwareShape)
    return {
      id: "lean", name: "The Lean Startup", by: "Eric Ries",
      why: "your chosen shape is a tiny self-serve tool, so the open question is whether people use it without hand-holding. Build-measure-learn gets that answer with the smallest working version instead of the full product.",
      steps: [
        `Define the one metric that proves ${who} got ${result}`,
        "Build the smallest version that can move that metric - days, not months",
        "Put it in front of 5-10 real users and measure what they do, not what they say",
        "Decide with evidence: persevere on the loop, or pivot the customer or offer",
      ],
    };
  if (firstTimer)
    return {
      id: "disciplined", name: "Disciplined Entrepreneurship", by: "Bill Aulet, MIT",
      why: "this is your first venture and your inputs are unusually clear - a defined customer and result - so a rigorous end-to-end sequence keeps you from skipping the unglamorous steps that kill first companies.",
      steps: [
        `Lock the beachhead: one narrow segment of ${who}, described by one real person`,
        `Build that persona's full profile: what “${result}” is worth and how they decide`,
        "Map how they hear, try, and buy, then estimate what one customer is worth",
        "Design the first paid pilot around that math, then test it",
      ],
    };
  return {
    id: "lean-canvas", name: "Lean Canvas", by: "Ash Maurya",
    why: "you have real operating experience and a clear customer and result, so the fastest rigorous move is mapping the whole model on one page and attacking its riskiest box first.",
    steps: [
      `Fill the canvas: problem, ${who}, your unique promise of ${result}, channels, revenue`,
      "Mark the riskiest assumption - the one that kills the business if it is wrong",
      "Design one cheap experiment for that assumption this week",
      "Update the canvas weekly. The learning, not the first idea, is the product",
    ],
  };
}
function tailoredPlan(p) {
  const hours = p.time || "";
  const convos = hours === "<5" ? 2 : hours === "5-10" ? 3 : hours === "10-20" ? 4 : 5;
  const budgetNote = !p.budget
    ? "Keep spend near zero until the first commitment."
    : p.budget === "$0"
      ? "No-spend rule: conversations, manual delivery, and free tools only."
      : p.budget === "<$500"
        ? "Cap test spend at $50 - enough for a domain or one small test, nothing more."
        : p.budget === "<$5k"
          ? "You can fund small tests, but cap this week at $200 until a commitment exists."
          : "Budget is not your constraint - speed of learning is. Buy nothing until a commitment exists.";
  const riskNote =
    p.risk === "low"
      ? "Protect your downside: no spending, quitting, or public promises until one real commitment exists."
      : p.risk === "high"
        ? "Use your appetite: make a paid offer by day 3, not day 7."
        : "Test before betting: one manual delivery before any spend.";
  const netNote = p.network.trim()
    ? `Start outreach from your own network: ${p.network.trim()}.`
    : "Start outreach with 5 people you can already reach this week - classmates, coworkers, or one online group.";
  const timeNote = hours
    ? `Sized for your ${hours === "<5" ? "under-5" : hours} hours per week.`
    : "Sized small: it works even with a few hours per week.";
  return [
    { when: "Next 48 hours", what: `Talk to ${convos} reachable people about the last time they hit this problem. ${netNote}` },
    { when: "Day 3", what: `Rewrite your one-line offer in their exact words. ${budgetNote}` },
    { when: "Day 7", what: `Ask for one real commitment - payment, pilot, intro, or a dated next step. ${riskNote} ${timeNote}` },
  ];
}

function build(p) {
  let paid=p.pipeline.filter((x)=>x.stage==="Paying").length, f=chooseFramework(p), plan=tailoredPlan(p);
  return shell(p,
    `<div class="complete-banner"><span>YOUR FIRST-BUSINESS STARTER PLAN</span><h2>${verdict(p).word}: ${pivotOptions(p)[p.pivot ?? recPivot(p)].name}</h2><p>You now have a company story, the right framework for you, and the next actions to learn by building.</p></div>
    <div class="card"><div class="section-title">Your 15-second company pitch</div><p class="big-output">${esc(companyPitch(p))}</p><button class="btn copy-pitch">Copy pitch</button><button class="btn refine-pivot">Refine direction</button><p class="import-note">Refine keeps your evidence, then rewrites the pitch, framework, and next actions around a narrower customer or offer.</p></div>
    <div class="card framework-card"><div class="section-title">Your entrepreneurship framework</div><h3>${esc(f.name)} <small>· ${esc(f.by)}</small></h3><p class="framework-why"><b>Why this one for you:</b> ${f.why}</p><div class="lesson-path">${f.steps.map((x,i)=>`<div><b>${i+1}</b><span>${x}</span></div>`).join("")}</div></div>
    <div class="card"><div class="section-title">Your tailored next steps</div><p>Built around your ${p.time ? `${p.time === "<5" ? "under-5" : p.time} hours a week` : "available time"}, ${p.budget ? `${p.budget} budget` : "budget"}, ${p.risk ? `${p.risk} risk tolerance` : "risk tolerance"}${p.network ? ", and your network" : ""}.</p><div class="lesson-path">${plan.map((x)=>`<div><b>${x.when}</b><span>${esc(x.what)}</span></div>`).join("")}</div></div>
    <div class="card"><div class="section-title">Your next unlocks</div><div class="status-grid"><div class="status"><i class="green"></i><b>Idea clarity</b><small>Clear enough to test</small></div><div class="status"><i class="yellow"></i><b>Customer proof</b><small>Unlock: 3 real conversations</small></div><div class="status"><i class="red"></i><b>Build readiness</b><small>Unlock: 1 commitment</small></div></div></div>
    <div class="card"><div class="section-title">Who should push you through the build?</div><p>The advice follows the same evidence rules. The personality changes how it is delivered.</p><div class="coach-grid">${coaches.map((c) => `<button class="coach-card ${p.coach === c.id ? "selected" : ""}" data-coach="${c.id}"><i>${c.icon}</i><h3>${c.name}</h3><b>${c.tag}</b><p>${c.inspired}.</p><blockquote>“${c.hello}”</blockquote></button>`).join("")}</div><p class="disclaimer">These are AI simulations inspired by ideas publicly associated with these entrepreneurs. They are not the actual people. Mark Cuban, Sara Blakely, and Reid Hoffman are not affiliated with, endorsing, or powering Proof.</p></div>
    <div class="card mission-card"><div class="section-title">This week’s mission <span class="streak">🔥 1 week streak</span></div><h3>Talk to 3 real customers</h3><p>Log what they actually did and unlock the next mission: make one small paid offer.</p></div><div class="card"><div class="section-title">Learn by doing</div><p>Each lesson unlocks through action. The app tracks milestones, not a fake score.</p><div class="stat-cards"><div class="stat"><b>${p.evidence.length}</b><small>Customer lessons</small></div><div class="stat"><b>${p.evidence.filter((x)=>x.commit).length}</b><small>Commitments</small></div><div class="stat"><b>${p.mvp?"Live":"Next"}</b><small>Testable offer</small></div><div class="stat"><b>${paid}</b><small>Paying customers</small></div></div><div class="quick-actions"><button class="btn" id="addConversation">+ Log customer lesson</button><button class="btn" id="toggleMvp">${p.mvp?"✓ Offer is testable":"Mark offer testable"}</button><button class="btn" id="addCustomer">+ Add customer</button></div>${p.evidence.map((e,i)=>`<div class="proof-row"><input class="e-name" data-i="${i}" value="${esc(e.name)}" placeholder="Who did you learn from?"><label><input class="e-commit" data-i="${i}" type="checkbox" ${e.commit?"checked":""}> made a commitment</label></div>`).join("")}${p.pipeline.map((x,i)=>`<div class="proof-row"><input class="p-name" data-i="${i}" value="${esc(x.name)}" placeholder="Customer"><select class="p-stage" data-i="${i}">${["Reached out","Talking","Pilot","Paying"].map((v)=>`<option ${x.stage===v?"selected":""}>${v}</option>`).join("")}</select></div>`).join("")}</div>`,
    "Your plan is a starting point. Your customer evidence decides what the company becomes.",
    "Finish"
  );
}

function coachById(id) {
  return coaches.find((c) => c.id === id) || coaches[0];
}
function coachPanel() {
  let p = state.project,
    c = coachById(p.coach);
  return `<div class="coach"><div class="coach-head"><b>${c.icon} ${c.name}</b><button id="closeCoach">×</button></div><div class="messages"><div class="bubble">${esc(c.hello)}</div>${p.coachMessages.map((m) => `<div class="bubble ${m.role === "user" ? "user" : ""}">${esc(m.text)}</div></div>`)}</div><form class="coach-form" id="coachForm"><input id="coachInput" placeholder="What are you stuck on?"><button>Send</button></form></div>`;
}
function reply(text) {
  let p = state.project,
    c = coachById(p.coach),
    t = text.toLowerCase(),
    next =
      p.evidence.length < 5
        ? "talk to one reachable customer about their last real attempt"
        : !p.mvp
          ? "deliver the core result manually once"
          : !p.pipeline.some((x) => x.stage === "Paying")
            ? "make a small paid offer"
            : "ask why the customer paid and whether they will repeat";
  let core = t.includes("build")
    ? "Do not build the full vision yet. Test the narrow result manually, then automate the part that repeats."
    : t.includes("customer")
      ? "Start with people you can reach this week. A narrow reachable customer beats a perfect market slide."
      : `Your next move is to ${next}.`;
  return c.id === "cuban"
    ? `Straight answer: ${core} Come back with a number or a customer quote.`
    : c.id === "blakely"
      ? `${core} Before deciding, ask what happened last time and listen for the workaround.`
      : `${core} Treat it as a one-week bet with a clear pass/fail rule.`;
}
function bind() {
  if (state.screen === "landing") {
    let idea = $("#idea");
    $("#start").onclick = () => {
      if (!idea.value.trim()) return toast("A messy sentence is enough. Type the idea first.");
      state.project = fresh(idea.value.trim(), { origin: "direct" });
      persist(); state.screen = "work"; render();
    };
    $("#ideate").onclick = startIdeation;
    if ($("#how")) $("#how").onclick = () => $("#preview").scrollIntoView({ behavior: "smooth" });
    $$(".resume").forEach((b) => (b.onclick = () => { state.project = hydrate(load().find((x) => x.id == b.dataset.id)); state.screen = "work"; render(); }));
    bindLogout();
    return;
  }
  if (state.screen === "ideate") {
    if ($("#backLanding")) $("#backLanding").onclick = () => { state.screen = "landing"; render(); };
    if ($("#ideationForm")) $("#ideationForm").onsubmit = e => { e.preventDefault(); acceptIdeationAnswer($("#ideationAnswer").value); };
    if ($("#notSure")) $("#notSure").onclick = () => acceptIdeationAnswer("I don't know yet");
    if ($("#seeResults")) $("#seeResults").onclick = () => finishIdeation();
    if ($("#keepTalking")) $("#keepTalking").onclick = () => { state.ideation.done = false; render(); };
    if ($("#restartIdeation")) $("#restartIdeation").onclick = startIdeation;
    if ($("#useDirection")) $("#useDirection").onclick = () => { state.project = projectFromIdeation(); persist(); state.screen = "work"; render(); };
    return;
  }
  if (state.screen === "gate") {
    if ($("#gateBack")) $("#gateBack").onclick = () => { state.screen = state.project ? "work" : "landing"; if (state.project && state.project.step >= AUTH_STEP && !state.account) state.project.step = AUTH_STEP - 1; render(); };
    $$(".auth-tab").forEach((b) => (b.onclick = () => { state.authMode = b.dataset.mode; state.linkedinNote = false; render(); }));
    if ($("#linkedinGate")) $("#linkedinGate").onclick = () => { state.linkedinNote = true; render(); setTimeout(() => $(".linkedin-note")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30); };
    if ($("#createAccount"))
      $("#createAccount").onclick = async () => {
        const name = $("#accName").value.trim(), email = $("#accEmail").value.trim().toLowerCase(), pass = $("#accPass").value;
        if (!name) return toast("Your name, please.");
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast("A valid email lets you log back in on this device.");
        if (pass.length < 4) return toast("Use at least 4 characters.");
        let xs = accounts();
        if (xs.some((a) => a.email === email)) return toast("That email already has an account here. Log in instead.");
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const hash = await hashPass(salt, pass);
        const acc = { name, email, salt, hash, created: new Date().toISOString() };
        xs.push(acc); saveAccounts(xs);
        localStorage.setItem(SES, email); state.account = acc;
        unlockAfterAuth("Account created. Your plan is unlocked.");
      };
    if ($("#doLogin"))
      $("#doLogin").onclick = async () => {
        const email = $("#loginEmail").value.trim().toLowerCase(), pass = $("#loginPass").value;
        const acc = accounts().find((a) => a.email === email);
        if (!acc) return toast("No account with that email on this device.");
        const hash = await hashPass(acc.salt, pass);
        if (hash !== acc.hash) return toast("That password does not match this device’s account.");
        localStorage.setItem(SES, email); state.account = acc;
        unlockAfterAuth("Welcome back. Your plan is unlocked.");
      };
    return;
  }
  $$(".track-step").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.step;
        if (!state.account && i >= AUTH_STEP) { state.gateReturn = i; state.screen = "gate"; render(); return; }
        state.project.step = i;
        persist();
        render();
      }),
  );
  const saveField = (id, key) => {
    if ($(id))
      $(id).onchange = (e) => {
        state.project[key] = e.target.value;
        persist();
      };
  };
  saveField("#customer", "customer");
  saveField("#outcome", "outcome");
  saveField("#advantage", "advantage");
  $$(".timing").forEach(
    (b) =>
      (b.onclick = () => {
        state.project.timing = b.dataset.v;
        persist();
        render();
      }),
  );
  $$(".constraint").forEach(
    (b) =>
      (b.onclick = () => {
        state.project.constraint = b.dataset.v;
        persist();
        render();
      }),
  );
  $$(".version").forEach(
    (b) =>
      (b.onclick = () => {
        state.project.pivot = +b.dataset.i;
        persist();
        render();
      }),
  );
  if ($("#acceptCall"))
    $("#acceptCall").onclick = () => {
      state.project.decisionSeen = true;
      persist();
      render();
      toast("Call accepted. Your kickoff plan is ready.");
    };
  $$(".founder-input").forEach((x) => { x.oninput = x.onchange = () => { state.project[x.dataset.field] = x.value; persist(); }; });
  if ($(".linkedin-connect")) $(".linkedin-connect").onclick = () => toast("LinkedIn import is not connected in this prototype. Use the manual profile for now.");
  if ($(".manual-profile")) $(".manual-profile").onclick = () => $(".founder-input")?.focus();
  if ($("#unlockBtn")) $("#unlockBtn").onclick = () => { state.gateReturn = AUTH_STEP; state.screen = "gate"; render(); };
  if ($(".refine-pivot")) $(".refine-pivot").onclick = () => { state.project.step = 3; persist(); render(); };
  $$(".coach-card").forEach(
    (b) =>
      (b.onclick = () => {
        state.project.coach = b.dataset.coach;
        state.project.coachMessages = [];
        persist();
        render();
      }),
  );
  if ($("#addConversation"))
    $("#addConversation").onclick = () => {
      state.project.evidence.push({ name: "", commit: false });
      persist();
      render();
    };
  if ($("#toggleMvp"))
    $("#toggleMvp").onclick = () => {
      state.project.mvp = !state.project.mvp;
      persist();
      render();
    };
  if ($("#addCustomer"))
    $("#addCustomer").onclick = () => {
      state.project.pipeline.push({ name: "", stage: "Reached out" });
      persist();
      render();
    };
  $$(".e-name").forEach(
    (x) =>
      (x.onchange = () => {
        state.project.evidence[+x.dataset.i].name = x.value;
        persist();
      }),
  );
  $$(".e-commit").forEach(
    (x) =>
      (x.onchange = () => {
        state.project.evidence[+x.dataset.i].commit = x.checked;
        persist();
      }),
  );
  $$(".p-name").forEach(
    (x) =>
      (x.onchange = () => {
        state.project.pipeline[+x.dataset.i].name = x.value;
        persist();
      }),
  );
  $$(".p-stage").forEach(
    (x) =>
      (x.onchange = () => {
        state.project.pipeline[+x.dataset.i].stage = x.value;
        persist();
      }),
  );
  if ($(".copy-pitch")) $(".copy-pitch").onclick = () => navigator.clipboard?.writeText(companyPitch(state.project));
  if ($(".next"))
    $(".next").onclick = () => {
      if (gate(state.project, state.project.step)) {
        const nxt = state.project.step + 1;
        if (nxt >= AUTH_STEP && !state.account) {
          state.gateReturn = nxt;
          state.screen = "gate";
          render();
          return;
        }
        state.project.step = Math.min(5, nxt);
        persist();
        render();
      }
    };
  if ($(".coach-button"))
    $(".coach-button").onclick = () => {
      state.coachOpen = true;
      render();
    };
  if ($("#closeCoach"))
    $("#closeCoach").onclick = () => {
      state.coachOpen = false;
      render();
    };
  if ($("#coachForm"))
    $("#coachForm").onsubmit = (e) => {
      e.preventDefault();
      let x = $("#coachInput");
      if (!x.value.trim()) return;
      state.project.coachMessages.push(
        { role: "user", text: x.value.trim() },
        { role: "coach", text: reply(x.value) },
      );
      persist();
      render();
    };
  if ($("#home"))
    $("#home").onclick = () => {
      state.screen = "landing";
      state.project = null;
      render();
    };
  bindLogout();
}
function bindLogout() {
  if ($("#logout"))
    $("#logout").onclick = () => {
      localStorage.removeItem(SES);
      state.account = null;
      toast("Logged out. Your ideas stay on this device.");
      render();
    };
}
function unlockAfterAuth(msg) {
  toast(msg);
  if (state.project) {
    state.screen = "work";
    state.project.step = Math.max(0, Math.min(state.gateReturn ?? AUTH_STEP, 5));
    persist();
  } else {
    state.screen = "landing";
  }
  render();
}
// ---------- ambient effects + reveal ----------
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reducedMotion) {
  addEventListener(
    "pointermove",
    (e) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    },
    { passive: true },
  );
}
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        revealIO.unobserve(en.target);
      }
    }
  },
  { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
);
function enhance() {
  if (!reducedMotion) {
    $$(".card, .mini-step, .decision-card, .complete-banner, .coach-card, .project-card, .stat, .status, .step-head, .gate, .auth-card, .locked-preview").forEach(
      (el, i) => {
        if (el.classList.contains("in")) return;
        el.style.transitionDelay = Math.min(i % 8, 5) * 45 + "ms";
        revealIO.observe(el);
      },
    );
  } else {
    $$(".card, .mini-step, .decision-card, .complete-banner, .coach-card, .project-card, .stat, .status, .step-head, .gate, .auth-card, .locked-preview").forEach((el) =>
      el.classList.add("in"),
    );
  }
  let msgs = $(".messages");
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
state.account = currentAccount();
render();
