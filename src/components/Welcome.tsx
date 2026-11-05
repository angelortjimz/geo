interface WelcomeOverlayProps {
  onStartBlank: () => void
  onLoadStarter: () => void
}

export function WelcomeOverlay({ onStartBlank, onLoadStarter }: WelcomeOverlayProps) {
  return (
    <div className="welcome-layer">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">New scene</p>
        <h2 id="welcome-title">Start with an empty stage.</h2>
        <p className="welcome-card__copy">
          Build from geometric primitives, stylized surfaces, and a controlled world. Or load the
          tuned starter composition. Both open ordinary, editable scenes.
        </p>
        <div className="welcome-actions">
          <button
            type="button"
            className="welcome-button welcome-button--primary"
            onClick={onStartBlank}
          >
            Start blank scene
          </button>
          <button type="button" className="welcome-button" onClick={onLoadStarter}>
            Load starter scene
          </button>
        </div>
        <p className="welcome-card__note">Up to 12 objects · session only · local audio</p>
      </section>
    </div>
  )
}

export function WelcomeIntro() {
  return (
    <>
      <section className="milestone" aria-labelledby="welcome-intro-title">
        <p className="milestone__status">Milestone 3 · Expanded library</p>
        <h2 id="welcome-intro-title">Compose first. React second.</h2>
        <p>
          Every object holds a composed resting pose. Loudness, transients, and stereo add bounded
          energy without replacing what you authored.
        </p>
        <ul className="welcome-list">
          <li>Torus, torus knot, box, icosphere, cone, or cylinder.</li>
          <li>Chrome, glossy plastic, matte, emissive, or wireframe surfaces.</li>
          <li>Reflective or checkerboard floors, fog, and selective bloom.</li>
        </ul>
      </section>
      <p className="study-note">
        Scene state stays in this session. Audio is decoded locally and never uploaded.
      </p>
    </>
  )
}
