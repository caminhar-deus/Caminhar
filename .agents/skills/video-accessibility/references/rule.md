# Make videos accessible with captions

> Videos have captions, audio descriptions, transcripts, pause controls, and avoid autoplay for users with hearing, vision, or cognitive impairments.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Accessible videos ensure all users can understand and interact with video content.

## Code Example

```html
<figure>
  <video
    controls
    preload="metadata"
    poster="thumbnail.jpg"
    aria-describedby="video-description"
  >
    <source src="video.mp4" type="video/mp4" />
    <source src="video.webm" type="video/webm" />

    <!-- Captions (for deaf/hard of hearing) -->
    <track
      kind="captions"
      src="captions-en.vtt"
      srclang="en"
      label="English captions"
      default
    />
    <track
      kind="captions"
      src="captions-es.vtt"
      srclang="es"
      label="Spanish captions"
    />

    <!-- Audio descriptions (for blind users) -->
    <track
      kind="descriptions"
      src="descriptions-en.vtt"
      srclang="en"
      label="English audio descriptions"
    />

    <!-- Fallback -->
    <p>
      Your browser doesn't support HTML5 video.
      <a href="video.mp4">Download the video</a>.
    </p>
  </video>

  <figcaption id="video-description">
    Product demonstration showing how to use the dashboard features.
  </figcaption>
</figure>
```

## Why It Matters

Videos without captions exclude deaf and hard-of-hearing users, while videos without audio descriptions exclude blind users from understanding visual content.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Captions | `<track kind="captions">` for deaf users |
| Audio descriptions | `<track kind="descriptions">` for blind users |
| Transcript | Text alternative for video content |
| Keyboard controls | Accessible play/pause/seek |
| No autoplay | Prevent unwanted playback |

Auto-generated captions are a starting point, not a finished accessibility deliverable. Review them for speaker names, punctuation, technical terms, and meaningful sound effects.

## Caption File Format (WebVTT)

```vtt
WEBVTT

00:00:00.000 --> 00:00:04.000
Welcome to our product demonstration.

00:00:04.500 --> 00:00:08.000
Today we'll show you the key features
of the dashboard.

00:00:08.500 --> 00:00:12.000
[Background music playing]

00:00:12.500 --> 00:00:16.000
First, let's look at the navigation menu.
```

Include non-speech audio such as `[applause]`, `[laughter]`, or `[door closes]` when it changes understanding.

## React Video Component

```tsx

interface VideoTrack {
  kind: 'captions' | 'descriptions' | 'subtitles'
  src: string
  srclang: string
  label: string
  default?: boolean
}

interface AccessibleVideoProps {
  src: string
  poster?: string
  title: string
  description?: string
  tracks?: VideoTrack[]
  transcript?: string
}

  src,
  poster,
  title,
  description,
  tracks = [],
  transcript
}: AccessibleVideoProps) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  // Prevent spacebar from scrolling page
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && document.activeElement === video) {
        e.preventDefault()
        if (video.paused) {
          video.play()
        } else {
          video.pause()
        }
      }
    }

    video.addEventListener('keydown', handleKeyDown)
    return () => video.removeEventListener('keydown', handleKeyDown)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="video-container">
      <figure>
        <video
          ref={videoRef}
          controls
          preload="metadata"
          poster={poster}
          aria-label={title}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={src} type="video/mp4" />

          {tracks.map((track, index) => (
            <track
              key={index}
              kind={track.kind}
              src={track.src}
              srcLang={track.srclang}
              label={track.label}
              default={track.default}
            />
          ))}
        </video>

        {description && (
          <figcaption className="video-description">
            {description}
          </figcaption>
        )}
      </figure>

      {/* Custom accessible controls */}
      <div className="video-controls" role="group" aria-label="Video controls">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* Transcript toggle */}
      {transcript && (
        <div className="video-transcript">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
            aria-controls="transcript"
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>

          {showTranscript && (
            <div id="transcript" className="transcript-content">
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

## Usage

```tsx

```

## Video with Reduced Motion Support

```tsx
function ResponsiveVideo({ src, poster }: { src: string; poster: string }) {
  const [shouldAutoplay, setShouldAutoplay] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    setShouldAutoplay(!prefersReducedMotion)
  }, [])

  return (
    <video
      controls
      poster={poster}
      autoPlay={shouldAutoplay}
      muted={shouldAutoplay} // Autoplay requires muted
      loop={shouldAutoplay}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
```

## Embedded Videos (YouTube/Vimeo)

Third-party players do not remove your accessibility responsibility.

- Verify captions are available and accurate, not only auto-generated.
- Provide a transcript link when the player makes transcript discovery difficult.
- Confirm keyboard users can reach pause, captions, and volume controls.
- Avoid autoplay with sound on embeds even when the provider allows it.

```tsx
interface EmbeddedVideoProps {
  videoId: string
  title: string
  provider: 'youtube' | 'vimeo'
}

  const src = provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${videoId}?cc_load_policy=1`
    : `https://player.vimeo.com/video/${videoId}?texttrack=en`

  return (
    <div className="video-embed">
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
```

## Caption Best Practices

| Do | Don't |
|----|-------|
| Include speaker identification | Rely on auto-generated captions |
| Describe relevant sounds [door slams] | Censor or summarize dialogue |
| Sync captions with speech | Use all caps for entire captions |
| Include music descriptions [upbeat music] | Overlap captions with visuals |

If the narration does not explain important on-screen actions, pair captions with audio descriptions or a detailed transcript.
| Keep lines short (32-40 characters) | Leave sounds undescribed |

## Styling

```css
.video-container {
  max-width: 800px;
  margin: 0 auto;
}

.video-container video {
  width: 100%;
  display: block;
}

.video-description {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

.video-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.video-controls button {
  padding: 0.5rem 1rem;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.video-controls button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.video-transcript button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.transcript-content {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

/* Responsive embed */
.video-embed {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
}

.video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
```

## Verification

1. Verify captions display correctly and are synchronized
2. Test audio descriptions are available and accurate
3. Check transcript is complete and accessible
4. Verify keyboard controls work (space to pause)
5. Test with screen reader (video title announced)
6. Confirm no autoplay with sound
7. Check prefers-reduced-motion is respected

Auto-generated captions from YouTube or other platforms are often inaccurate. WCAG requires captions to be accurate. Always review and edit auto-generated captions or provide professional captions.