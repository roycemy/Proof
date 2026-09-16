const KEY = "proof-projects-v2";
const legacy = "proof-projects-v1";
const steps = [
  { title: "Say it roughly", short: "Rough idea", time: "20 sec" },
  { title: "Make it real", short: "Reality check", time: "30 sec" },
  { title: "Find the best version", short: "Pivot", time: "40 sec" },
  { title: "Get the call", short: "Decision", time: "20 sec" },
  { title: "Plan the kickoff", short: "Kickoff", time: "30 sec" },
  { title: "Choose your coach", short: "Coach", time: "20 sec" },
  { title: "Build with proof", short: "Build", time: "Ongoing" },
];
const coaches = [
  {
    id: "cuban",
    icon: "⚡",
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
    icon: "💡",
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
    icon: "🌐",
    name: "Reid Hoffman AI",
    tag: "Networks, distribution, and scaling",
    inspired:
      "An AI simulation inspired by Reid Hoffman's publicly associated ideas about networks, learning quickly, and scaling only after finding a strong wedge",
    hello:
      "Find the smallest network where this can spread. Prove one useful loop before you design for scale.",
    prompt: "Who can help the first ten users find one another?",
  },
];
let state = { screen: "landing", project: null, coachOpen: false };
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
function fresh(idea) {
  return {
    id: Date.now(),
    created: new Date().toISOString(),
    idea,
    name: nameIdea(idea),
    step: 0,
    customer: "",
    outcome: "",
    advantage: "",
    timing: "unknown",
    constraint: "",
    pivot: null,
    decisionSeen: false,
    coach: null,
    evidence: [],
    visitors: 0,
    signups: 0,
    mvp: false,
    pipeline: [],
    coachMessages: [],
  };
}
function hydrate(p) {
  return Object.assign(
    {
      customer: "",
      outcome: "",
      advantage: "",
      timing: "unknown",
      constraint: "",
      pivot: null,
      decisionSeen: false,
      coach: null,
      evidence: [],
      visitors: 0,
      signups: 0,
      mvp: false,
      pipeline: [],
      coachMessages: [],
    },
    p,
  );
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
  return [true, true, p.pivot !== null, p.decisionSeen, true, !!p.coach, true][
    i
  ];
}
function maxOpen(p) {
  for (let i = 0; i < 6; i++) if (!gate(p, i)) return i;
  return 6;
}
function render() {
  window.scrollTo(0, 0);
  $("#app").innerHTML = state.screen === "landing" ? landing() : workspace();
  bind();
}
function landing() {
  let xs = load();
  return `<div class="landing"><nav class="nav"><div class="brand"><span class="brand-mark">P</span> Proof</div><button class="ghost-btn" id="how">See how it works</button></nav><main class="hero"><span class="eyebrow"><i class="dot"></i> Rough idea welcome</span><h1>From “maybe” to a realistic <em>starting plan.</em></h1><p class="hero-sub">You do not need a pitch deck or perfect answers. In a few focused steps, Proof helps you reshape the idea, tells you whether to start, pivot, or park it, and gives you the first week.</p><div class="idea-box"><textarea id="idea" placeholder="Type the messy version. Example: an app that helps students waste less food..."></textarea><button class="start" id="start">Start shaping my idea →</button></div><p class="soft-note">No signup · “I don’t know” is a valid answer · Saves as you go</p></main><section class="preview" id="preview"><div class="preview-head"><div><span class="step-kicker">The sprint</span><h2>A decision and kickoff plan, not homework.</h2></div><p>A short path before you start testing.</p></div><div class="seven">${steps.map((s, i) => `<div class="mini-step"><div class="mini-num">0${i + 1} · ${s.time}</div><b>${s.title}</b></div>`).join("")}</div></section>${xs.length ? `<section class="projects-wrap"><span class="step-kicker">Your ideas</span><h2>Pick up where you left off</h2><div class="project-list">${xs.map((p) => `<button class="project-card resume" data-id="${p.id}"><small>${new Date(p.created).toLocaleDateString()}</small><h3>${esc(p.name)}</h3><p>${esc(p.idea)}</p><span class="score-sm">${readiness(p)}</span><small> readiness</small></button>`).join("")}</div></section>` : ""}</div>`;
}
function workspace() {
  let p = state.project,
    open = maxOpen(p),
    s = score(p);
  return `<div class="workspace"><aside class="sidebar"><div class="brand"><span class="brand-mark">P</span> Proof</div><div class="side-project"><small>ROUGH IDEA</small><h3>${esc(p.name)}</h3><p>${esc(p.idea)}</p></div><div class="track">${steps.map((x, i) => `<button class="track-step ${i === p.step ? "current" : ""} ${i <= open ? "open" : ""}" data-step="${i}" ${i > open ? "disabled" : ""}><i class="circle">${gate(p, i) && i < p.step ? "✓" : i + 1}</i><span><b>${x.short}</b><small>${i > open ? "Locked" : x.time}</small></span></button>`).join("")}</div></aside><main class="main"><header class="topbar"><div class="project-title"><div><h2>${esc(p.name)}</h2><p>Founder path</p></div><div class="score-box"><div class="score-line"><span>Build Readiness</span><b>${readiness(p)}</b></div><div class="bar"><i style="width:${s}%"></i></div></div></div></header><section class="content">${stepView(p, p.step)}</section>${p.coach ? `<button class="coach-button">${coachById(p.coach).icon} Ask ${coachById(p.coach).name}</button>` : ""}${state.coachOpen ? coachPanel() : ""}</main></div>`;
}
function frame(i, body, sub = "") {
  let p = state.project,
    done = gate(p, i);
  return `<div class="step-head"><span class="step-kicker">${steps[i].time} · Step ${i + 1} of 7</span><h1>${steps[i].title}</h1><p>${sub}</p></div>${body}<div class="gate"><div><b>${done ? "Ready to move on" : "One quick choice left"}</b><small>Saved automatically. You can revise this later.</small></div>${i < 6 ? `<button class="btn primary next" ${done ? "" : "disabled"}>${i === 5 ? "See my build plan" : "Continue"} →</button>` : '<button class="btn primary" id="home">Back to ideas</button>'}</div>`;
}
function stepView(p, i) {
  return [rough, reality, pivots, decision, kickoff, chooseCoach, build][i](p);
}
function rough(p) {
  return frame(
    0,
    `<div class="card easy-card"><h3>That is enough to begin.</h3><p class="big-idea">“${esc(p.idea)}”</p><p>Proof will make useful assumptions and label them. You are not being graded on knowing the market yet.</p></div><div class="card"><div class="section-title">Build this around you</div><p>Choose a realistic company model based on your skills, time, money, network, and risk.</p><div class="founder-import"><button class="btn linkedin-connect">Connect LinkedIn</button><button class="btn manual-profile">Enter manually</button></div><p class="import-note">LinkedIn import is a preview in this prototype. Nothing connects or imports yet. Manual profile works now.</p><div class="founder-fields"><input class="founder-input" data-field="skills" value="${esc(p.skills || "")}" placeholder="Skills or experience"><input class="founder-input" data-field="time" value="${esc(p.time || "")}" placeholder="Hours available each week"><input class="founder-input" data-field="budget" value="${esc(p.budget || "")}" placeholder="Starting budget"><input class="founder-input" data-field="network" value="${esc(p.network || "")}" placeholder="People or industries you can reach"><select class="founder-input" data-field="risk"><option value="">Risk tolerance</option><option ${p.risk === "low" ? "selected" : ""} value="low">Low - protect time and cash</option><option ${p.risk === "medium" ? "selected" : ""} value="medium">Medium - test before betting</option><option ${p.risk === "high" ? "selected" : ""} value="high">High - move fast</option></select></div></div><div class="card"><label class="field"><span>Who might want this first? <em>Optional</em></span><textarea id="customer" placeholder="A guess is fine. Or leave this blank.">${esc(p.customer)}</textarea></label><label class="field"><span>What gets better for them? <em>Optional</em></span><textarea id="outcome" placeholder="Less time, more money, fewer mistakes, less stress...">${esc(p.outcome)}</textarea></label></div>`,
    "Start with what you know. Missing answers become things to test, not reasons to stop.",
  );
}
function reality(p) {
  return frame(
    1,
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
      )}</div></label></div><div class="card assumption-card"><b>Proof’s working assumptions</b><ul><li>${p.customer ? `First user: ${esc(p.customer)}` : "First user is unknown. The kickoff will test three possible profiles."}</li><li>${p.outcome ? `Desired result: ${esc(p.outcome)}` : "The core result is unknown. The first interviews will look for the costly outcome."}</li><li>${p.advantage ? `Possible edge: ${esc(p.advantage)}` : "No founder edge claimed yet. That is fine for a one-week test."}</li></ul></div>`,
    "Quick signals only. Proof separates guesses from facts so you can keep moving.",
  );
}
function pivots(p) {
  let opts = pivotOptions(p);
  return frame(
    2,
    `<div class="card"><div class="section-title">Three realistic ways to start the same idea</div><p>Pick the version you would be willing to test next week. This is a starting shape, not a permanent identity.</p><div class="options">${opts.map((v, i) => `<button class="option version ${p.pivot === i ? "selected" : ""}" data-i="${i}"><span class="verdict">${v.fit}</span><h3>${v.name}</h3><p>${esc(v.desc)}</p><div class="details"><b>Question to prove:</b> ${esc(v.risk)}<br><b>First offer:</b> ${esc(v.offer)}</div></button>`).join("")}</div></div>`,
    "A good pivot keeps the insight and changes the risky way you planned to deliver it.",
  );
}
function decision(p) {
  let v = verdict(p),
    opt = pivotOptions(p)[p.pivot || 0];
  return frame(
    3,
    `<div class="decision-card ${v.tone}"><span class="step-kicker">PROOF’S CALL</span><h2>${v.word}</h2><p>${v.text}</p></div><div class="card"><h3>Why</h3><div class="signal-list"><div><b>${p.customer ? "Clear enough" : "Unknown"}</b><span>First customer</span></div><div><b>${p.outcome ? "Clear enough" : "Unknown"}</b><span>Desired result</span></div><div><b>${p.timing === "now" ? "Signal" : "Unproven"}</b><span>Why now</span></div><div><b>${p.constraint === "blocked" ? "Blocked" : "Testable"}</b><span>Feasibility</span></div></div><p><b>Recommended shape:</b> ${opt.name}. ${opt.desc}</p><button class="btn primary" id="acceptCall">I understand the call</button></div>`,
    "A useful answer is not always “yes.” It tells you what to do next without pretending guesses are facts.",
  );
}
function kickoff(p) {
  let o = pivotOptions(p)[p.pivot || 0],
    who = p.customer || "3 people who recently felt this problem";
  return frame(
    4,
    `<div class="card"><span class="verdict">YOUR FIRST 48 HOURS</span><h3>Make contact before making product</h3><ol class="plan"><li><b>Write a one-line offer.</b><span>${esc(o.offer)}</span></li><li><b>List five reachable people.</b><span>Start with ${esc(who)}, warm introductions, or a focused online group.</span></li><li><b>Ask about the last time.</b><span>“Tell me about the last time you tried to solve this. What did you do?”</span></li></ol></div><div class="card"><span class="verdict">7-DAY KICKOFF</span><div class="week-grid"><div><b>Days 1-2</b><p>Talk to 5 people. Look for repeated pain and existing workarounds.</p></div><div><b>Day 3</b><p>Choose one narrow customer and one result. Rewrite the offer.</p></div><div><b>Days 4-5</b><p>Deliver the result manually or show the tiniest working version.</p></div><div><b>Days 6-7</b><p>Ask for a commitment: payment, pilot, intro, or a dated next step.</p></div></div></div><div class="card warning"><b>Do not build yet if...</b><p>Nobody can describe a recent painful instance, nobody uses a workaround, or you cannot reach five plausible users. Pivot the customer or problem before adding features.</p></div>`,
    "A concrete first week beats a long roadmap. The goal is one strong signal, not a finished company.",
  );
}
function chooseCoach(p) {
  return frame(
    5,
    `<div class="card"><div class="section-title">Who should push you through the build?</div><p>The advice follows the same evidence rules. The personality changes how it is delivered.</p><div class="coach-grid">${coaches.map((c) => `<button class="coach-card ${p.coach === c.id ? "selected" : ""}" data-coach="${c.id}"><i>${c.icon}</i><h3>${c.name}</h3><b>${c.tag}</b><p>${c.inspired}.</p><blockquote>“${c.hello}”</blockquote></button>`).join("")}</div><p class="disclaimer">These are AI simulations inspired by ideas publicly associated with these entrepreneurs. They are not the actual people. Mark Cuban, Sara Blakely, and Reid Hoffman are not affiliated with, endorsing, or powering Proof.</p></div>`,
    "Pick the voice that will make you act. You can switch later.",
  );
}
function readiness(p) {
  if (p.pipeline.some((x) => x.stage === "Paying")) return "SELLING";
  if (p.mvp && p.evidence.length >= 5) return "TESTING";
  if (p.decisionSeen) return "READY TO START";
  return "SHAPING";
}

function companyPitch(p) {
  const o = pivotOptions(p)[p.pivot || 0];
  const buyer = p.customer || "a specific first customer";
  const pain = p.problem || p.idea;
  return `${p.name} helps ${buyer} solve ${pain} through ${o.name.toLowerCase()}. We start with the smallest paid result, learn directly from users, and only build what earns demand.`;
}

function frameworkFor(p) {
  const c = coachById(p.coach);
  if (c.id === "cuban") return { name: "Sell Before You Scale", steps: ["Name one buyer and one painful result", "Make a simple paid offer", "Deliver manually", "Build only the repeated work"] };
  if (c.id === "blakely") return { name: "Problem → Prototype → Feedback", steps: ["Observe the awkward workaround", "Make the cheapest useful prototype", "Put it in a customer's hands", "Turn objections into the next version"] };
  return { name: "Wedge → Loop → Network", steps: ["Win one narrow community", "Create one repeatable reason to return", "Make each user help attract or help another", "Scale only after the loop works"] };
}

function build(p) {
  let paid=p.pipeline.filter((x)=>x.stage==="Paying").length, c=coachById(p.coach), f=frameworkFor(p);
  return shell(p,
    `<div class="complete-banner"><span>YOUR FIRST-BUSINESS STARTER PLAN</span><h2>${verdict(p).word}: ${pivotOptions(p)[p.pivot || 0].name}</h2><p>You now have a company story, a way to design it, and the next actions to learn by building.</p></div>
    <div class="card"><div class="section-title">Your 15-second company pitch</div><p class="big-output">${esc(companyPitch(p))}</p><button class="btn copy-pitch">Copy pitch</button><button class="btn refine-pivot">Refine direction</button><p class="import-note">Refine keeps your evidence, then rewrites the pitch, framework, and next actions around a narrower customer or offer.</p></div>
    <div class="card"><div class="section-title">Your company-design framework</div><h3>${c.icon} ${esc(c.name)}: ${esc(f.name)}</h3><p>This is the framework that best matches the coach you chose.</p><div class="lesson-path">${f.steps.map((x,i)=>`<div><b>${i+1}</b><span>${esc(x)}</span></div>`).join("")}</div></div>
    <div class="card"><div class="section-title">Your next unlocks</div><div class="status-grid"><div class="status"><i class="green"></i><b>Idea clarity</b><small>Clear enough to test</small></div><div class="status"><i class="yellow"></i><b>Customer proof</b><small>Unlock: 3 real conversations</small></div><div class="status"><i class="red"></i><b>Build readiness</b><small>Unlock: 1 commitment</small></div></div></div><div class="card"><div class="section-title">Do this today</div><p class="big-output">Send your 15-second pitch to one reachable customer and ask: “When did you last deal with this, and what did you do?”</p></div><div class="card"><div class="section-title">What to do next</div><div class="lesson-path"><div><b>48h</b><span>Say the pitch to 3 reachable customers and write down their exact words.</span></div><div><b>Day 3</b><span>Offer the smallest useful result manually. Ask for a real commitment.</span></div><div><b>Day 7</b><span>Review what people did, not what they said. Continue, adjust, or stop.</span></div></div></div>
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
  return `<div class="coach"><div class="coach-head"><b>${c.icon} ${c.name}</b><button id="closeCoach">×</button></div><div class="messages"><div class="bubble">${esc(c.hello)}</div>${p.coachMessages.map((m) => `<div class="bubble ${m.role === "user" ? "user" : ""}">${esc(m.text)}</div>`).join("")}</div><form class="coach-form" id="coachForm"><input id="coachInput" placeholder="What are you stuck on?"><button>Send</button></form></div>`;
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
      if (!idea.value.trim())
        return toast("A messy sentence is enough. Type the idea first.");
      state.project = fresh(idea.value.trim());
      persist();
      state.screen = "work";
      render();
    };
    $("#how").onclick = () =>
      $("#preview").scrollIntoView({ behavior: "smooth" });
    $$(".resume").forEach(
      (b) =>
        (b.onclick = () => {
          state.project = hydrate(load().find((x) => x.id == b.dataset.id));
          state.screen = "work";
          render();
        }),
    );
    return;
  }
  $$(".track-step").forEach(
    (b) =>
      (b.onclick = () => {
        state.project.step = +b.dataset.step;
        persist();
        render();
      }),
  );
  const saveField = (id, key) => {
    if ($(id))
      $(id).onchange = (e) => {
        state.project[key] = e.target.value;
        persist();
        render();
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
  if ($(".refine-pivot")) $(".refine-pivot").onclick = () => { state.project.step = 2; persist(); render(); };
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
        render();
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
        render();
      }),
  );
  if ($(".copy-pitch")) $(".copy-pitch").onclick = () => navigator.clipboard?.writeText(companyPitch(state.project));
  if ($(".next"))
    $(".next").onclick = () => {
      if (gate(state.project, state.project.step)) {
        state.project.step = Math.min(6, state.project.step + 1);
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
}
render();

