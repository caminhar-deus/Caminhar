# Avoid autoplaying media

> Audio and video content does not autoplay, or provides immediate controls to pause or stop playback.

**Priority:** high · **Difficulty:** beginner · **Time:** 10 min

---
Autoplaying media disrupts screen readers and startles users. Always require user interaction to start audio.

## Code Example

```html
<!-- ❌ Bad: Autoplay with audio -->
<video autoplay src="video.mp4"></video>

<!-- ✅ Acceptable: Autoplay muted (background video) -->
<video autoplay muted loop playsinline src="hero-bg.mp4"></video>

<!-- ✅ Best: No autoplay, user controls -->
<video controls src="video.mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>
```

## Why It Matters

Autoplaying audio drowns out screen reader speech, startles users, and wastes bandwidth—providing user control is essential for accessibility and good UX.

## Accessible Video Player

```tsx
function VideoPlayer({ src, poster }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        playsInline
      />

      <div className="controls">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ?  : }
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ?  : }
        </button>
      </div>
    </div>
  )
}
```

## Background Video with Stop Button

```tsx
function HeroWithVideo() {
  const [isPlaying, setIsPlaying] = useState(true)
  const videoRef = useRef
        <source src="hero.mp4" type="video/mp4" />
      </video>

      {/* Prominent pause control */}
      <button
        onClick={toggleVideo}
        className="video-control"
        aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
      >
        {isPlaying ? 'Pause' : 'Play'} Background
      </button>

      <div className="hero-content">
        <h1>Welcome</h1>
      </div>
    </section>
  )
}
```

## WCAG Requirements

| Criterion | Requirement |
|-----------|-------------|
| 1.4.2 Audio Control | Audio that plays automatically for more than 3 seconds must have pause/stop/mute controls |
| 2.2.2 Pause, Stop, Hide | Moving content must have a mechanism to pause, stop, or hide |

## Exceptions

- Evaluate the rendered experience before treating a static-code smell as a blocker; interaction timing, browser behavior, and assistive technology output often determine severity.
- Not every secondary accessibility issue deserves equal weight; prioritize the issue that most directly blocks perception, operation, or understanding.
- Avoid adding redundant markup or ARIA solely to satisfy a rule when a simpler semantic implementation would eliminate the issue entirely.

## Standards

- Align the implementation with W3C WAI: WCAG Overview and verify the rendered experience, not only the source code.
- Align the implementation with MDN: Accessibility and verify the rendered experience, not only the source code.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Load page and verify no unexpected audio plays
- If video autoplays, confirm it's muted
- Check pause controls are keyboard accessible (early in tab order)
- Verify screen reader can announce and interact with controls