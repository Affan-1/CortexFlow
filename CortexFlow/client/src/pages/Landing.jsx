import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

/* =====================================================================
   EDIT HERE: change routes if your login / signup paths are different
   ===================================================================== */
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/register";

/* The sample workflow shown in the hero. Edit titles / log text freely. */
const STEPS = [
  { kind: "Trigger", title: "Webhook", detail: "New lead form", src: "webhook", msg: "POST /hooks/lead-form received" },
  { kind: "AI step", title: "Qualify lead", detail: "Gemini reads the message", src: "ai", msg: "lead scored 82, marked hot" },
  { kind: "Action", title: "Add row", detail: "Google Sheets", src: "sheets", msg: "row added to Leads" },
  { kind: "Action", title: "Notify sales", detail: "Slack #sales", src: "slack", msg: "message posted to #sales" },
];
const STEP_MS = 900;

const HOW = [
  { title: "Pick a trigger", text: "Start a run from a webhook, on a schedule, or by hand." },
  { title: "Add the steps", text: "Chain app actions together. Drop in an AI step when a task needs reading or judgment." },
  { title: "Run and review", text: "Runs go through a background queue. Every run keeps its status and a step-by-step log." },
];

const FEATURES = [
  ["Visual workflow builder", "Place steps on a canvas and connect them. Build as many steps as the job needs."],
  ["AI agent step", "Let Gemini read, classify or draft inside a workflow, then pass the result to the next step."],
  ["Webhook and schedule triggers", "Run when an event arrives, or repeat on a schedule you set."],
  ["Connected apps", "Gmail, Slack, Discord, Google Sheets, Notion and HubSpot, all in one workflow."],
  ["Background runs", "A job queue runs your workflows, so a slow step never blocks the dashboard. Failed jobs can retry."],
  ["Execution history", "Open any past run to see what happened at each step."],
];

const APPS = ["Gmail", "Slack", "Discord", "Google Sheets", "Notion", "HubSpot"];

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx="2.5" stroke="#1b8cff" strokeWidth="2" />
      <rect x="15.5" y="15.5" width="9" height="9" rx="2.5" fill="#1b8cff" />
      <path d="M10.5 6h4a3 3 0 0 1 3 3v6.5" stroke="#1b8cff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WorkflowDemo() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [active, setActive] = useState(-1);
  const [log, setLog] = useState([]);
  const timers = useRef([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const run = () => {
    clear();
    setLog([]);
    setDone(0);
    setActive(0);
    setRunning(true);
    STEPS.forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          setDone(i + 1);
          setActive(i + 1 < STEPS.length ? i + 1 : -1);
          setLog((l) => [...l, { t: (((i + 1) * STEP_MS) / 1000).toFixed(1) + "s", s: s.src, m: s.msg }]);
        }, (i + 1) * STEP_MS)
      );
    });
    timers.current.push(
      setTimeout(() => {
        setLog((l) => [...l, { t: ((STEPS.length * STEP_MS) / 1000).toFixed(1) + "s", s: "run", m: `finished, ${STEPS.length} of ${STEPS.length} steps ok`, final: true }]);
        setRunning(false);
      }, STEPS.length * STEP_MS + 150)
    );
  };

  // play once on load so the page feels alive (skipped when the visitor prefers reduced motion)
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) timers.current.push(setTimeout(run, 900));
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="lp-demo">
        <div className="lp-demo-bar">
          <p className="lp-demo-title">
            Lead alert<span>4 steps</span>
          </p>
          <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={run} disabled={running}>
            {running ? "Running" : log.length ? "Run again" : "Run sample"}
          </button>
        </div>
        <div className="lp-demo-body">
          <div className="lp-canvas">
            <div className="lp-flow">
              {STEPS.map((s, i) => (
                <div key={s.title} style={{ display: "contents" }}>
                  <div className={"lp-node" + (i < done ? " is-done" : i === active ? " is-active" : "")}>
                    <div className="lp-node-top">
                      <span>{s.kind}</span>
                      <span className="lp-dot" />
                    </div>
                    <p className="lp-node-title">{s.title}</p>
                    <p className="lp-node-detail">{s.detail}</p>
                  </div>
                  {i < STEPS.length - 1 && <span className={"lp-link" + (done > i ? " is-on" : "")} />}
                </div>
              ))}
            </div>
          </div>
          <div className="lp-log">
            <p className="lp-log-head">Run log</p>
            <div className="lp-log-list" aria-live="polite">
              {log.length === 0 && <p className="lp-log-empty">Press Run sample to see each step report back here.</p>}
              {log.map((r, i) => (
                <div key={i} className={"lp-log-row" + (r.final ? " is-final" : "")}>
                  <span className="t">{r.t}</span>
                  <span className="s">{r.s}</span>
                  <span className="m">{r.m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="lp-note">Sample workflow for illustration. Your own runs appear in your dashboard.</p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <div className="lp-wrap">
        {/* ---------- top bar ---------- */}
        <header className="lp-nav">
          <Link to="/" className="lp-brand">
            <Logo /> CortexFlow
          </Link>
          <nav className="lp-nav-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#apps">Apps</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to={LOGIN_PATH} className="lp-btn lp-btn-ghost lp-btn-sm">Log in</Link>
            <Link to={SIGNUP_PATH} className="lp-btn lp-btn-primary lp-btn-sm">Sign up</Link>
          </div>
        </header>

        {/* ---------- hero ---------- */}
        <section className="lp-hero">
          <h1 className="lp-h1">Automate the busywork between your apps.</h1>
          <p className="lp-lead">
            CortexFlow connects Gmail, Slack, Google Sheets and more. Build a workflow on a canvas, add an AI step where a
            task needs judgment, and check every run in the log.
          </p>
          <div className="lp-cta">
            <Link to={SIGNUP_PATH} className="lp-btn lp-btn-primary">Create account</Link>
            <Link to={LOGIN_PATH} className="lp-btn lp-btn-ghost">Log in</Link>
          </div>
          <WorkflowDemo />
        </section>

        {/* ---------- how it works ---------- */}
        <section className="lp-section" id="how">
          <h2 className="lp-h2">From idea to running workflow in three steps</h2>
          <ol className="lp-steps">
            {HOW.map((s, i) => (
              <li className="lp-step" key={s.title}>
                <span className="lp-step-n">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- features ---------- */}
        <section className="lp-section" id="features">
          <h2 className="lp-h2">What you can build with it</h2>
          <dl className="lp-feats">
            {FEATURES.map(([t, d]) => (
              <div className="lp-feat" key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- apps ---------- */}
        <section className="lp-section" id="apps">
          <h2 className="lp-h2">Connect the tools your team already uses</h2>
          <ul className="lp-apps">
            {APPS.map((a) => (
              <li className="lp-app" key={a}>{a}</li>
            ))}
          </ul>
        </section>

        {/* ---------- final call ---------- */}
        <section className="lp-final">
          <div>
            <h2 className="lp-h2">Build your first workflow</h2>
            <p>Create an account and start automating in minutes.</p>
          </div>
          <div className="lp-cta" style={{ marginTop: 0 }}>
            <Link to={SIGNUP_PATH} className="lp-btn lp-btn-primary">Create account</Link>
            <Link to={LOGIN_PATH} className="lp-btn lp-btn-ghost">Log in</Link>
          </div>
        </section>

        <footer className="lp-footer">
          <span>© 2026 CortexFlow</span>
          <nav aria-label="Account">
            <Link to={LOGIN_PATH}>Log in</Link>
            <Link to={SIGNUP_PATH}>Sign up</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
