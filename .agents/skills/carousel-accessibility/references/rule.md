# Make carousels accessible

> Carousels and sliders are accessible with pause controls, keyboard navigation, and proper ARIA attributes.

**Priority:** medium · **Difficulty:** advanced · **Time:** 30 min

---
Accessible carousels require careful implementation to support keyboard users, screen readers, and motion preferences.

## Code Example

```html
<section
  aria-roledescription="carousel"
  aria-label="Featured products"
  class="carousel"
>
  <!-- Controls -->
  <div class="carousel__controls">
    <button
      type="button"
      aria-label="Previous slide"
      class="carousel__prev"
    >
      ←
    </button>

    <button
      type="button"
      aria-pressed="false"
      aria-label="Pause carousel"
      class="carousel__pause"
    >
      ⏸
    </button>

    <button
      type="button"
      aria-label="Next slide"
      class="carousel__next"
    >
      →
    </button>
  </div>

  <!-- Slides container -->
  <div
    aria-live="polite"
    aria-atomic="false"
    class="carousel__slides"
  >
    <div
      role="group"
      aria-roledescription="slide"
      aria-label="1 of 3"
      class="carousel__slide carousel__slide--active"
    >
      <img src="product1.jpg" alt="Product 1 description">
      <h3>Product 1</h3>
    </div>

    <div
      role="group"
      aria-roledescription="slide"
      aria-label="2 of 3"
      class="carousel__slide"
      hidden
    >
      <img src="product2.jpg" alt="Product 2 description">
      <h3>Product 2</h3>
    </div>

    <div
      role="group"
      aria-roledescription="slide"
      aria-label="3 of 3"
      class="carousel__slide"
      hidden
    >
      <img src="product3.jpg" alt="Product 3 description">
      <h3>Product 3</h3>
    </div>
  </div>

  <!-- Slide indicators -->
  <div role="tablist" aria-label="Slides" class="carousel__indicators">
    <button role="tab" aria-selected="true" aria-label="Slide 1"></button>
    <button role="tab" aria-selected="false" aria-label="Slide 2"></button>
    <button role="tab" aria-selected="false" aria-label="Slide 3"></button>
  </div>
</section>
```

## Why It Matters

Auto-playing carousels without controls trap users, cause disorientation, and violate WCAG requirements—proper implementation ensures all users can interact with slideshow content.

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Pause control | Button to stop/start auto-rotation |
| Keyboard navigation | Arrow keys, Tab between controls |
| Screen reader support | Live regions, slide announcements |
| Motion preferences | Respect prefers-reduced-motion |
| Visible focus | Clear focus indicators |

## React Carousel Component

```tsx

interface Slide {
  id: string
  image: string
  alt: string
  title: string
}

interface CarouselProps {
  slides: Slide[]
  autoPlay?: boolean
  interval?: number
  label: string
}

  slides,
  autoPlay = true,
  interval = 5000,
  label
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isPaused, setIsPaused] = useState(false)
  const carouselRef = useRef()

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex((index + slides.length) % slides.length)
  }, [slides.length])

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1)
  }, [currentIndex, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1)
  }, [currentIndex, goToSlide])

  const togglePlay = () => {
    setIsPlaying(prev => !prev)
  }

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && !isPaused && !prefersReducedMotion.current) {
      intervalRef.current = setInterval(nextSlide, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, isPaused, interval, nextSlide])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        prevSlide()
        break
      case 'ArrowRight':
        e.preventDefault()
        nextSlide()
        break
      case 'Home':
        e.preventDefault()
        goToSlide(0)
        break
      case 'End':
        e.preventDefault()
        goToSlide(slides.length - 1)
        break
    }
  }

  // Pause on hover/focus
  const handleMouseEnter = () => setIsPaused(true)
  const handleMouseLeave = () => setIsPaused(false)
  const handleFocus = () => setIsPaused(true)
  const handleBlur = (e: React.FocusEvent) => {
    if (!carouselRef.current?.contains(e.relatedTarget)) {
      setIsPaused(false)
    }
  }

  return (
    <section
      ref={carouselRef}
      aria-roledescription="carousel"
      aria-label={label}
      className="carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {/* Controls */}
      <div className="carousel__controls">
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className="carousel__prev"
        >
          ←
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-pressed={!isPlaying}
          aria-label={isPlaying ? 'Pause carousel' : 'Play carousel'}
          className="carousel__pause"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="carousel__next"
        >
          →
        </button>
      </div>

      {/* Slides */}
      <div
        aria-live={isPlaying ? 'off' : 'polite'}
        aria-atomic="false"
        className="carousel__slides"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== currentIndex}
            className={`carousel__slide ${
              index === currentIndex ? 'carousel__slide--active' : ''
            }`}
          >
            <img src={slide.image} alt={slide.alt} />
            <h3>{slide.title}</h3>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div role="tablist" aria-label="Slides" className="carousel__indicators">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            role="tab"
            aria-selected={index === currentIndex}
            aria-label={`Slide ${index + 1}`}
            onClick={() => goToSlide(index)}
            className={`carousel__indicator ${
              index === currentIndex ? 'carousel__indicator--active' : ''
            }`}
          />
        ))}
      </div>
    </section>
  )
}
```

## Reduced Motion Support

```tsx

function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// Usage in carousel
function AccessibleCarousel({ slides }: { slides: Slide[] }) {
  const prefersReducedMotion = useReducedMotion()
  const [autoPlay, setAutoPlay] = useState(!prefersReducedMotion)

  // Disable auto-play when reduced motion is preferred
  useEffect(() => {
    if (prefersReducedMotion) {
      setAutoPlay(false)
    }
  }, [prefersReducedMotion])

  return (
    
  )
}
```

## Styling

```css
.carousel {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.carousel__slides {
  position: relative;
  overflow: hidden;
}

.carousel__slide {
  display: none;
}

.carousel__slide--active {
  display: block;
}

.carousel__controls {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.carousel__prev,
.carousel__next,
.carousel__pause {
  padding: 0.5rem 1rem;
  font-size: 1.25rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.carousel__prev:hover,
.carousel__next:hover,
.carousel__pause:hover {
  background: #e0e0e0;
}

.carousel__prev:focus-visible,
.carousel__next:focus-visible,
.carousel__pause:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

.carousel__indicators {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.carousel__indicator {
  width: 12px;
  height: 12px;
  padding: 0;
  border: 2px solid #333;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.carousel__indicator--active {
  background: #333;
}

.carousel__indicator:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .carousel__slide {
    transition: none;
  }
}
```

## Verification

1. Verify pause button stops auto-rotation
2. Test keyboard navigation (arrows, Home, End)
3. Check live region announces slide changes
4. Verify motion respects prefers-reduced-motion
5. Test with screen reader (slide count announced)
6. Verify focus stays within carousel during keyboard nav
7. Check indicators update with slide changes

WCAG 2.2.2 requires auto-moving content to have pause, stop, or hide controls. Consider whether auto-play is truly necessary—many usability studies show carousels have low engagement.