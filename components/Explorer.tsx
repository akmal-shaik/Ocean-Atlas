"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  species,
  evidenceFor,
  sourcesFor,
  type SpeciesId,
} from "../lib/corpus";
import type { AnswerResponse } from "../lib/contracts";
const Scene = dynamic(() => import("./OceanScene"), {
  ssr: false,
  loading: () => (
    <p className="scene-fallback" role="status">
      Preparing the ocean…
    </p>
  ),
});
const Preview = dynamic(() => import("./SpeciesPreview"), {
  ssr: false,
  loading: () => <div className="comparison-preview loading" />,
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="scene-fallback">
        3D could not load. The collection and source notes are still available.
      </p>
    ) : (
      this.props.children
    );
  }
}
function subscribeMotion(callback: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function motionSnapshot() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function Guide({
  id,
  available,
  endpoint = "/api/ask",
  hostedDemo = false,
}: {
  id: SpeciesId;
  available: boolean;
  endpoint?: string;
  hostedDemo?: boolean;
}) {
  const [other, setOther] = useState<SpeciesId | "">("");
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [asked, setAsked] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !question.trim()) return;
    setPending(true);
    setError("");
    setAnswer(null);
    setAsked(question);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesIds: other ? [id, other] : [id],
          question,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The guide could not respond.");
      setAnswer(data);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "The guide took too long. Please try again."
          : err instanceof Error
            ? err.message
            : "The guide could not respond.",
      );
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
  }
  return (
    <section className="guide">
      <div className="section-heading">
        <h3>Ask the atlas</h3>
        <span className={`status ${available ? "ready" : ""}`}>
          {available ? "Available" : "Offline"}
        </span>
      </div>
      <p className="muted">
        Answers use this collection’s source notes. Each question starts fresh,
        with no memory of previous questions.
      </p>
      {!available && (
        <p className="notice">
          {hostedDemo
            ? "AI is unavailable in this hosted static demo. Run Ocean Atlas locally with explicit AI configuration to use the guide."
            : "AI is unavailable in this build. You can still read every source note below."}
        </p>
      )}
      <form onSubmit={submit}>
        <label htmlFor="compare-species">
          Compare with <span className="muted">(optional)</span>
        </label>
        <select
          id="compare-species"
          value={other}
          onChange={(e) => {
            setOther(e.target.value as SpeciesId | "");
            setAnswer(null);
          }}
          disabled={pending}
        >
          <option value="">Selected species only</option>
          {species
            .filter((s) => s.id !== id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <label htmlFor="question">Your question</label>
        <textarea
          id="question"
          maxLength={800}
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!available || pending}
          placeholder="What does it eat?"
        />
        <button
          className="ask-button"
          disabled={!available || pending || !question.trim()}
        >
          {pending ? "Reading the evidence…" : "Ask a question ↗"}
        </button>
      </form>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {answer && (
          <div className="answer">
            <strong>{asked}</strong>
            <p>{answer.answer}</p>
            {answer.insufficientEvidence && (
              <span className="status">Evidence is incomplete</span>
            )}
            {answer.citations.map((c) => (
              <details key={c.evidenceId}>
                <summary>{c.evidenceId}</summary>
                <p>{c.text}</p>
                {c.sources.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                    {s.publisher}: {s.title} ↗
                  </a>
                ))}
              </details>
            ))}
            <p className="muted">
              References are checked against the collection. They do not
              guarantee that every claim is correct.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

const unavailable = "Not available in this collection";
function CompareSpecies() {
  const [leftId, setLeftId] = useState<SpeciesId>(species[0].id);
  const [rightId, setRightId] = useState<SpeciesId>(species[1].id);
  const left = species.find((item) => item.id === leftId)!;
  const right = species.find((item) => item.id === rightId)!;
  const valuesFor = (id: SpeciesId) => {
    const evidence = evidenceFor(id);
    const item = species.find((candidate) => candidate.id === id)!;
    const sourceIds = [
      ...new Set(evidence.flatMap((entry) => entry.sourceIds)),
    ];
    return {
      size: (
        <>
          <strong className="comparison-size">
            {item.size.metres.toFixed(2)} m
          </strong>
          <span className="comparison-qualifier">{item.size.basis}</span>
          <p>{item.size.definition}</p>
        </>
      ),
      habitat:
        evidence.find((entry) => entry.topic === "habitat")?.text ??
        unavailable,
      depth: item.depthMetres ? (
        <>
          <strong>
            {item.depthMetres[0].toLocaleString()}–
            {item.depthMetres[1].toLocaleString()} m
          </strong>
          <p>{item.depthNote}</p>
        </>
      ) : (
        unavailable
      ),
      diet:
        evidence.find((entry) => entry.topic === "diet")?.text ?? unavailable,
      taxonomy: unavailable,
      fact:
        evidence.find((entry) => entry.topic === "fact")?.text ?? unavailable,
      sources: sourcesFor(sourceIds),
    };
  };
  const leftValues = valuesFor(leftId);
  const rightValues = valuesFor(rightId);
  const rows: { label: string; left: ReactNode; right: ReactNode }[] = [
    { label: "Recorded size", left: leftValues.size, right: rightValues.size },
    { label: "Habitat", left: leftValues.habitat, right: rightValues.habitat },
    { label: "Depth range", left: leftValues.depth, right: rightValues.depth },
    { label: "Diet", left: leftValues.diet, right: rightValues.diet },
    {
      label: "Taxonomic group",
      left: leftValues.taxonomy,
      right: rightValues.taxonomy,
    },
    { label: "Notable fact", left: leftValues.fact, right: rightValues.fact },
    {
      label: "Sources",
      left: leftValues.sources.map((source) => (
        <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
          {source.publisher}: {source.title} ↗
        </a>
      )),
      right: rightValues.sources.map((source) => (
        <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
          {source.publisher}: {source.title} ↗
        </a>
      )),
    },
  ];
  return (
    <section className="compare-page" aria-labelledby="compare-heading">
      <div className="compare-intro">
        <span className="eyebrow">SPECIES, SIDE BY SIDE</span>
        <h1 id="compare-heading">Compare the collection.</h1>
        <p>
          Read each measurement with its definition. Different measurement types
          are shown together for reference, not treated as direct equivalents.
        </p>
      </div>
      <table className="compare-table">
        <caption>
          Side-by-side comparison of two selected Ocean Atlas species
        </caption>
        <colgroup>
          <col className="compare-label-column" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {[
              { item: left, other: rightId, set: setLeftId, side: "left" },
              { item: right, other: leftId, set: setRightId, side: "right" },
            ].map(({ item, other, set, side }) => (
              <th scope="col" key={side}>
                <label htmlFor={`compare-${side}`}>
                  {side === "left" ? "First species" : "Second species"}
                </label>
                <select
                  id={`compare-${side}`}
                  value={item.id}
                  onChange={(event) => set(event.target.value as SpeciesId)}
                >
                  {species.map((option) => (
                    <option
                      key={option.id}
                      value={option.id}
                      disabled={option.id === other}
                    >
                      {option.name}
                    </option>
                  ))}
                </select>
                <h2>{item.name}</h2>
                <p className="scientific">{item.scientificName}</p>
                <Preview id={item.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.left}</td>
              <td>{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
export default function Explorer({
  aiEnabled,
  staticDemo = false,
}: {
  aiEnabled: boolean;
  staticDemo?: boolean;
}) {
  const [selected, setSelected] = useState<SpeciesId | null>(null);
  const [compare, setCompare] = useState(false);
  const [focusedSpecies, setFocusedSpecies] = useState<SpeciesId | null>(null);
  const [reset, setReset] = useState(0);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const motion = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => false,
  );
  const current = species.find((s) => s.id === selected);
  const evidence = selected ? evidenceFor(selected) : [];
  function resetView() {
    setSelected(null);
    setReset((r) => r + 1);
  }
  return (
    <main className="atlas">
      <Measurement />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Ocean Atlas home">
          <span className="brand-icon">◒</span>
          <span>
            OCEAN <b>ATLAS</b>
            <small>A MARINE FIELD GUIDE</small>
            {staticDemo && (
              <small className="hosted-demo-status">
                HOSTED DEMO · AI UNAVAILABLE
              </small>
            )}
          </span>
        </Link>
        <nav className="mode-switch" aria-label="Viewing mode">
          <button
            aria-pressed={!compare}
            onClick={() => {
              setCompare(false);
              setReset((r) => r + 1);
            }}
          >
            Explore
          </button>
          <button
            aria-pressed={compare}
            onClick={() => {
              setCompare(true);
              setReset((r) => r + 1);
            }}
          >
            Compare
          </button>
        </nav>
        <span className="edition">
          COLLECTION 001 <span> / </span> {species.length} SPECIES
        </span>
      </header>
      <div className={`workspace ${!compare && current ? "panel-open" : ""}`}>
        {compare ? (
          <CompareSpecies />
        ) : (
          <>
            <section className="ocean" aria-label="Interactive marine exhibit">
              <div className="water-rays" />
              <div className="scene-title">
                <span className="eyebrow">BENEATH THE SURFACE</span>
                <h1>An ocean of discovery.</h1>
                <p>
                  {`Meet ${species.length} remarkable animals. Select one to look closer.`}
                </p>
              </div>
              <div className="canvas-wrap">
                <SceneBoundary>
                  {failed ? (
                    <p className="scene-fallback">
                      The 3D view is unavailable. Choose a species below to read
                      its field notes.
                    </p>
                  ) : (
                    <Scene
                      selected={selected}
                      focused={focusedSpecies}
                      reset={reset}
                      reduced={motion || paused}
                      onSelect={setSelected}
                      onError={() => setFailed(true)}
                    />
                  )}
                </SceneBoundary>
              </div>
              <div className="scene-tools">
                <button onClick={resetView}>↺ Reset view</button>
                <button
                  aria-pressed={paused || motion}
                  disabled={motion}
                  onClick={() => setPaused(!paused)}
                >
                  {paused || motion ? "Motion paused" : "Ⅱ Pause motion"}
                </button>
                <span>Drag to orbit · scroll or pinch to zoom</span>
              </div>
              <nav className="species-dock" aria-label="Select a species">
                {species.map((s, i) => (
                  <button
                    key={s.id}
                    aria-pressed={selected === s.id}
                    onClick={() => setSelected(s.id)}
                    onFocus={() => setFocusedSpecies(s.id)}
                    onBlur={() => setFocusedSpecies(null)}
                  >
                    <span className="species-number">0{i + 1}</span>
                    <span className="dock-fish" style={{ color: s.colour }}>
                      {s.id === "squid"
                        ? "≋"
                        : s.id === "green-turtle"
                          ? "◒"
                          : s.id === "moon-jelly"
                            ? "⌒"
                            : "⋊"}
                    </span>
                    <span>
                      {s.name}
                      <small>{s.scientificName}</small>
                    </span>
                    <span className="dock-arrow">↗</span>
                  </button>
                ))}
              </nav>
              <footer className="scene-footer">
                <span>
                  Educational collection · not a shared habitat or ecosystem
                  simulation.
                </span>
                <span>DISPLAY SCALE · STYLISED MODELS</span>
              </footer>
            </section>
            {current && (
              <aside
                className="info-panel"
                aria-label={`${current.name} information`}
              >
                <div className="panel-top">
                  <span className="eyebrow">
                    FIELD NOTES / 0{species.indexOf(current) + 1}
                  </span>
                  <button
                    aria-label="Close information panel"
                    onClick={resetView}
                  >
                    ×
                  </button>
                </div>
                <h2>{current.name}</h2>
                <p className="scientific">{current.scientificName}</p>
                <p className="overview">
                  {evidence.find((e) => e.topic === "overview")?.text}
                </p>
                <div className="size-stat">
                  <strong>
                    {current.size.metres.toFixed(2)}
                    <span> m</span>
                  </strong>
                  <div>
                    {current.size.basis === "reported maximum"
                      ? "Reported maximum"
                      : "Adult upper bound"}
                    <small>
                      {current.id === "squid"
                        ? "Total length with tentacles"
                        : current.id === "moon-jelly"
                          ? "Bell diameter"
                          : current.id === "green-turtle"
                            ? "Adult length"
                            : "Fish length"}
                    </small>
                  </div>
                </div>
                <p className="muted">{current.size.definition}</p>
                {["habitat", "diet"].map((topic) => (
                  <section className="fact-section" key={topic}>
                    <h3>
                      {topic === "habitat" ? "Where it lives" : "On the menu"}
                    </h3>
                    <p>{evidence.find((e) => e.topic === topic)?.text}</p>
                  </section>
                ))}
                <p className="muted">{current.depthNote}</p>
                <section className="fact-section">
                  <h3>A closer look</h3>
                  {evidence
                    .filter((e) => e.topic === "fact")
                    .map((e) => (
                      <p key={e.id}>• {e.text}</p>
                    ))}
                </section>
                <Guide
                  key={current.id}
                  id={current.id}
                  available={aiEnabled}
                  hostedDemo={staticDemo}
                />
                <section className="source-notes">
                  <h3>Evidence &amp; sources</h3>
                  <p className="muted">
                    Local collection checked 12 September 2026.
                  </p>
                  {evidence.map((e) => (
                    <details key={e.id}>
                      <summary>
                        {e.topic} <span>{e.id}</span>
                      </summary>
                      <p>{e.text}</p>
                      {sourcesFor(e.sourceIds).map((s) => (
                        <a
                          href={s.url}
                          key={s.id}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.publisher} · {s.title} ↗
                        </a>
                      ))}
                    </details>
                  ))}
                </section>
              </aside>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Measurement() {
  const [report, setReport] = useState("");
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("measure")) return;
    const start = setTimeout(() => {
      window.__oceanFrames = {
        remaining: 10,
        values: [],
        renderer: navigator.userAgent,
        triangles: 0,
        calls: 0,
      };
    }, 5000);
    const end = setTimeout(() => {
      const sample = window.__oceanFrames;
      if (!sample?.values.length) {
        setReport("No WebGL frame samples collected.");
        return;
      }
      const values = [...sample.values].sort((a, b) => a - b);
      setReport(
        JSON.stringify(
          {
            date: new Date().toISOString(),
            interval: "10 seconds after 5 second warmup",
            frames: values.length,
            medianMs: values[Math.floor(values.length / 2)],
            p95Ms: values[Math.floor(values.length * 0.95)],
            meanMs: values.reduce((a, b) => a + b, 0) / values.length,
            viewport: [innerWidth, innerHeight],
            devicePixelRatio: devicePixelRatio,
            dprCap: 1.5,
            userAgent: sample.renderer,
            triangles: sample.triangles,
            drawCalls: sample.calls,
          },
          null,
          2,
        ),
      );
    }, 16000);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, []);
  return report ? (
    <details className="measurement">
      <summary>Rendering measurement</summary>
      <pre>{report}</pre>
    </details>
  ) : null;
}
