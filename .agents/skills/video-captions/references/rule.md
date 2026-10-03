# Provide captions for video content

> Prerecorded video with audio must have synchronized captions. Live video must have real-time captions. This is required by WCAG 2.1 SC 1.2.2 and SC 1.2.4.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
Captions provide a synchronized text-based representation of all audio content in a video. [WCAG 1.2.2 Captions (Prerecorded)](https://www.w3.org/TR/WCAG21/#captions-prerecorded), [WCAG 1.2.4 Captions (Live)](https://www.w3.org/TR/WCAG21/#captions-live), and the [`<track>` element reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track) all treat captions as a first-class part of the video experience.
## Code Examples

```html
<!-- ✅ Correct: <track kind="captions"> with WebVTT file -->
<video controls width="800">
  <source src="presentation.mp4" type="video/mp4">
  <source src="presentation.webm" type="video/webm">

  <!-- Captions for deaf/hard-of-hearing (includes non-speech audio) -->
  <track
    kind="captions"
    srclang="en"
    label="English captions"
    src="captions-en.vtt"
    default>

  <!-- Subtitles are for translation only — do NOT substitute for captions -->
  <track
    kind="subtitles"
    srclang="fr"
    label="Français"
    src="subtitles-fr.vtt">

  <p>Your browser does not support HTML video. <a href="presentation.mp4">Download the video</a>.</p>
</video>
```

### WebVTT File Format

```vtt
WEBVTT

00:00:01.000 --> 00:00:04.000
Welcome to the Front-End Checklist workshop.

00:00:04.500 --> 00:00:08.000
Today we'll cover accessibility fundamentals.

00:00:08.500 --> 00:00:10.000
[upbeat music playing]

00:00:10.500 --> 00:00:14.000
[Speaker 2] Let's start with color contrast requirements.
```

## Why It Matters

The distinction between captions, subtitles, and transcripts matters because [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API) and [WebAIM's media guidance](https://webaim.org/techniques/captions/) expect captions to include meaningful non-speech audio, not just dialogue.

- **Hearing Loss**: 15% of adults have some hearing loss; deaf users cannot access audio content without captions.
- **Situational Limitations**: Users in noisy environments, offices, or public transit often watch with sound off.
- **Non-native Speakers**: Reading captions simultaneously improves comprehension for second-language viewers.
- **Cognitive and Learning Disabilities**: Captions help users with attention disorders or dyslexia who process text more easily than audio.
- **SEO and Searchability**: Caption text is indexable by search engines, improving video discoverability.

## Captions vs Subtitles vs Transcripts

| Type | Purpose | Non-speech audio | Synchronized | WCAG SC |
|---|---|---|---|---|
| Captions | Deaf/hard-of-hearing | Yes (required) | Yes | 1.2.2, 1.2.4 |
| Subtitles | Translation | No | Yes | Not required |
| Transcript | All users, search | Yes (recommended) | No | 1.2.1 (audio-only) |

## Auto-Generated Captions

Auto-generated captions (YouTube, Whisper, AWS Transcribe) must be reviewed before publishing:
- Average accuracy is ~80% — insufficient for formal or technical content
- Proper nouns, technical terms, and accented speech are most error-prone
- Review and correct all auto-captions before the video goes live

## Exceptions

- Logos, purely decorative text treatments, and screenshots used as documentation can be valid exceptions when their accessible alternative is still provided appropriately.
- An image or media rule should not force redundant alt text, captions, or transcripts when another nearby mechanism already provides the equivalent information clearly.
- If the media asset fails more than one rule, prioritize the issue that most directly blocks understanding for assistive technology users.

## Verification

### Automated Checks

- Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
- Run an automated accessibility checker such as axe or Lighthouse where applicable.

### Manual Checks

- Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
- Re-test one representative user flow with a screen reader if this rule affects a key interaction.