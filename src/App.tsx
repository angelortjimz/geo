export default function App() {
  return (
    <main className="app-shell">
      <section className="canvas-stage" aria-label="Scene preview placeholder">
        <div className="scene-placeholder">
          <span className="scene-placeholder__eyebrow">Visual study 01</span>
          <p>The canvas is ready for its first impossible object.</p>
        </div>
      </section>

      <aside className="composition-panel">
        <header className="app-header">
          <h1 className="app-name">geo</h1>
          <p className="app-tagline">An audio-played CGI scene composer.</p>
        </header>

        <section className="milestone" aria-labelledby="milestone-title">
          <span className="milestone__status">Project initialized</span>
          <h2 id="milestone-title">Next: the fixed visual study</h2>
          <p>
            A chrome torus, an emissive satellite, and a quiet digital world. Loudness, transients,
            and stereo space will bring it to life.
          </p>
          <ol className="milestone__steps">
            <li>Clean Three.js rendering and selective bloom</li>
            <li>Loudness, impact, balance, and width signals</li>
            <li>WebGL capture and original-audio export validation</li>
          </ol>
        </section>
      </aside>

      <footer className="transport" aria-label="Project capabilities">
        <span>Local only</span>
        <span>React + TypeScript</span>
        <span>Three.js / WebGL</span>
        <span>Session-local scenes</span>
      </footer>
    </main>
  )
}
