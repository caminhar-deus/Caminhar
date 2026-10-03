# Provide audio descriptions for video

> Videos with important visual content include audio descriptions that narrate visual information for blind users.

**Priority:** medium · **Difficulty:** intermediate · **Time:** 30 min

---
Audio descriptions narrate visual information for users who cannot see the video content.

## Code Example

```html
<video controls>
  <source src="product-demo.mp4" type="video/mp4">

  <!-- Captions for deaf users -->
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English">

  <!-- Audio descriptions for blind users -->
  <track kind="descriptions" src="descriptions-en.vtt" srclang="en" label="English Audio Description">
</video>
```

## Why It Matters

Blind users miss critical plot points, product demos, and on-screen information that's only shown visually—audio descriptions provide equal access to the complete experience.

## When Audio Descriptions Are Needed

| Visual Content | Needs Description? |
|----------------|-------------------|
| Character actions/reactions | Yes |
| Scene changes/locations | Yes |
| On-screen text/graphics | Yes |
| Facial expressions conveying emotion | Yes |
| Talking head with no visual action | No |
| Audio-only content (podcast) | No |

## VTT Description File Format

```vtt
WEBVTT

00:00:03.000 --> 00:00:06.000
A woman in business attire enters a modern office lobby.

00:00:15.000 --> 00:00:18.000
She approaches the reception desk where a man looks up from his computer.

00:00:32.000 --> 00:00:35.000
On-screen text reads: "Three months later"

00:01:05.000 --> 00:01:08.000
Close-up of her face showing concern as she reads the document.
```

## React Video Player with Descriptions

```tsx
interface VideoPlayerProps {
  src: string
  captions?: string
  descriptions?: string
  poster?: string
}

function AccessibleVideoPlayer({
  src,
  captions,
  descriptions,
  poster
}: VideoPlayerProps) {
  const [descriptionsEnabled, setDescriptionsEnabled] = useState(false)
  const videoRef = useRef
        <source src={src} type="video/mp4" />

        {captions && (
          <track
            kind="captions"
            src={captions}
            srcLang="en"
            label="English Captions"
            default
          />
        )}

        {descriptions && (
          <track
            kind="descriptions"
            src={descriptions}
            srcLang="en"
            label="Audio Description"
          />
        )}
      </video>

      {descriptions && (
        <button
          onClick={() => setDescriptionsEnabled(!descriptionsEnabled)}
          aria-pressed={descriptionsEnabled}
        >
          {descriptionsEnabled ? 'Disable' : 'Enable'} Audio Descriptions
        </button>
      )}

      <p id="video-description" className="sr-only">
        Video with audio descriptions available. Use the Audio Descriptions button to enable.
      </p>
    </div>
  )
}
```

## Alternative: Extended Description Video

```tsx
// Provide two versions of the video
function VideoWithDescriptionChoice({ standardSrc, extendedSrc }: {
  standardSrc: string
  extendedSrc: string
}) {
  const [useExtended, setUseExtended] = useState(false)

  return (
    <div>
      <div role="group" aria-label="Video version selection">
        <label>
          <input
            type="radio"
            name="video-version"
            checked={!useExtended}
            onChange={() => setUseExtended(false)}
          />
          Standard version
        </label>
        <label>
          <input
            type="radio"
            name="video-version"
            checked={useExtended}
            onChange={() => setUseExtended(true)}
          />
          Version with audio descriptions
        </label>
      </div>

      <video controls key={useExtended ? 'extended' : 'standard'}>
        <source src={useExtended ? extendedSrc : standardSrc} type="video/mp4" />
      </video>
    </div>
  )
}
```

## Writing Good Descriptions

```text
❌ Bad: "A person is there."
✅ Good: "Sarah enters the room looking worried."

❌ Bad: "Something happens on screen."
✅ Good: "The graph shows sales dropping 40% over three months."

❌ Bad: "He reacts."
✅ Good: "Marcus slams his fist on the table in frustration."
```

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Use browser accessibility tooling, axe, Lighthouse, or equivalent automated checks against a representative rendered state.

### Manual Checks

- Watch video with eyes closed—can you follow the story?
- Verify description track appears in player controls
- Check descriptions fit in gaps between dialogue
- Ensure descriptions don't overlap important audio