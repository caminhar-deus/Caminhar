# Use semantic HTML elements

> HTML5 Semantic Elements are used appropriately (header, section, footer, main, article, aside...).

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
HTML5 semantic elements provide meaningful structure to web content, improving accessibility, SEO, and code maintainability.

## Code Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Semantic HTML Example</title>
</head>
<body>
    <header>
        <h1>Site Title</h1>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <article>
            <header>
                <h1>Article Title</h1>
                <time datetime="2024-01-15">January 15, 2024</time>
            </header>

            <section>
                <h2>Section Heading</h2>
                <p>Content goes here...</p>
            </section>

            <aside>
                <h3>Related Links</h3>
                <ul>
                    <li><a href="/related">Related Article</a></li>
                </ul>
            </aside>
        </article>
    </main>

    <footer>
        <p>&copy; 2024 Company Name</p>
    </footer>
</body>
</html>
```

## Why It Matters

Screen readers use semantic elements to navigate pages—users can jump directly to &lt;main&gt; content or &lt;nav&gt;. Search engines also use semantics to understand content hierarchy.

## Semantic Elements Reference

#

## Document Structure
```html
<!-- Page header with site branding and navigation -->
<header>
    <h1>Site Logo</h1>
    <nav aria-label="Main navigation">
        <ul><!-- navigation items --></ul>
    </nav>
</header>

<!-- Main content area -->
<main>
    <!-- Primary content goes here -->
</main>

<!-- Page footer with site info -->
<footer>
    <p>Copyright information</p>
    <nav aria-label="Footer navigation">
        <ul><!-- footer links --></ul>
    </nav>
</footer>
```

### Content Grouping
```html
<!-- Self-contained content -->
<article>
    <h2>Blog Post Title</h2>
    <p>Post content...</p>
</article>

<!-- Thematic content grouping -->
<section>
    <h2>Products</h2>
    <div>Product listings...</div>
</section>

<!-- Sidebar or tangentially related content -->
<aside>
    <h3>Advertisement</h3>
    <p>Ad content...</p>
</aside>
```

## Framework Examples

### Next.js with Semantic Structure
```jsx
// components/Layout.js

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <h1>My Website</h1>
          <nav aria-label="Main navigation">
            <ul>
              <li>Home</li>
              <li>About</li>
              <li>Blog</li>
            </ul>
          </nav>
        </header>

        <main className="main-content">
          {children}
        </main>

        <footer className="site-footer">
          <p>&copy; 2024 My Website</p>
        </footer>
      </body>
    </html>
  )
}

// pages/blog/[slug].js

  return (
    <article>
      <header>
        <h1>{post.title}</h1>
        <time dateTime={post.publishedAt}>
          {formatDate(post.publishedAt)}
        </time>
        <address>
          By <a href={`/authors/${post.author.slug}`}>
            {post.author.name}
          </a>
        </address>
      </header>

      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      <aside>
        <h2>Related Posts</h2>
        <ul>
          {post.relatedPosts.map(related => (
            <li key={related.id}>
              
                {related.title}
              
            </li>
          ))}
        </ul>
      </aside>
    </article>
  )
}
```

### React Component Structure
```jsx
// BlogLayout.jsx
function BlogLayout({ children }) {
  return (
    <div className="blog-layout">
      <header className="blog-header">
        <h1>My Blog</h1>
        <nav aria-label="Blog categories">
          <ul>
            <li><a href="/tech">Tech</a></li>
            <li><a href="/design">Design</a></li>
            <li><a href="/business">Business</a></li>
          </ul>
        </nav>
      </header>

      <main className="blog-main">
        {children}
      </main>

      <aside className="blog-sidebar">
        <section>
          <h2>Recent Posts</h2>
          
        </section>

        <section>
          <h2>Categories</h2>
          
        </section>
      </aside>
    </div>
  )
}

// ArticleCard.jsx
function ArticleCard({ article }) {
  return (
    <article className="article-card">
      <header>
        <h3>
          <a href={`/articles/${article.slug}`}>
            {article.title}
          </a>
        </h3>
        <time dateTime={article.publishedAt}>
          {article.publishedDate}
        </time>
      </header>

      <p>{article.excerpt}</p>

      <footer>
        <a href={`/articles/${article.slug}`}>
          Read more
        </a>
      </footer>
    </article>
  )
}
```

### Vue.js Semantic Templates
```vue
<!-- BlogPost.vue -->
<template>
  <article class="blog-post">
    <header class="post-header">
      <h1>{{ post.title }}</h1>
      <div class="post-meta">
        <time :datetime="post.publishedAt">
          {{ formatDate(post.publishedAt) }}
        </time>
        <address>
          By <router-link :to="`/authors/${post.author.slug}`">
            {{ post.author.name }}
          </router-link>
        </address>
      </div>
    </header>

    <div class="post-content" v-html="post.content"></div>

    <footer class="post-footer">
      <nav aria-label="Post navigation">
        <router-link v-if="previousPost" :to="previousPost.url">
          ← {{ previousPost.title }}
        </router-link>
        <router-link v-if="nextPost" :to="nextPost.url">
          {{ nextPost.title }} →
        </router-link>
      </nav>
    </footer>
  </article>
</template>

<!-- HomePage.vue -->
<template>
  <div class="homepage">
    <header class="hero">
      <h1>Welcome to My Website</h1>
      <p>Building amazing web experiences</p>
    </header>

    <main class="homepage-content">
      <section class="featured-posts">
        <h2>Featured Articles</h2>
        <div class="post-grid">
          <article v-for="post in featuredPosts" :key="post.id">
            <h3>{{ post.title }}</h3>
            <p>{{ post.excerpt }}</p>
          </article>
        </div>
      </section>

      <section class="services">
        <h2>Our Services</h2>
        <div class="service-list">
          <div v-for="service in services" :key="service.id">
            <h3>{{ service.name }}</h3>
            <p>{{ service.description }}</p>
          </div>
        </div>
      </section>
    </main>

    <aside class="sidebar">
      <section class="newsletter">
        <h2>Newsletter</h2>
        
      </section>
    </aside>
  </div>
</template>
```

## Complex Content Structures

### E-commerce Product Page
```html
<main class="product-page">
    <article class="product">
        <header>
            <h1>Product Name</h1>
            <p class="price">$99.99</p>
        </header>

        <section class="product-images">
            <figure>
                <img src="product.jpg" alt="Product photo">
                <figcaption>Main product image</figcaption>
            </figure>
        </section>

        <section class="product-details">
            <h2>Description</h2>
            <p>Product description...</p>
        </section>

        <section class="product-reviews">
            <h2>Customer Reviews</h2>
            <article class="review">
                <header>
                    <h3>Great product!</h3>
                    <div class="rating" aria-label="5 out of 5 stars">★★★★★</div>
                </header>
                <p>Review content...</p>
                <footer>
                    <address>By John Doe</address>
                    <time datetime="2024-01-10">January 10, 2024</time>
                </footer>
            </article>
        </section>

        <aside class="related-products">
            <h2>You Might Also Like</h2>
            <!-- Related products -->
        </aside>
    </article>
</main>
```

### News Website Structure
```html
<header class="site-header">
    <h1>News Site</h1>
    <nav aria-label="Main navigation">
        <ul>
            <li><a href="/politics">Politics</a></li>
            <li><a href="/sports">Sports</a></li>
            <li><a href="/tech">Technology</a></li>
        </ul>
    </nav>
</header>

<main class="news-main">
    <section class="breaking-news">
        <h2>Breaking News</h2>
        <article class="featured-story">
            <header>
                <h3>Major News Story</h3>
                <time datetime="2024-01-15T14:30:00Z">
                    January 15, 2024 at 2:30 PM
                </time>
            </header>
            <p>Story summary...</p>
        </article>
    </section>

    <section class="latest-news">
        <h2>Latest News</h2>
        <div class="news-grid">
            <article class="news-item">
                <h3><a href="/news/story-1">Story Title</a></h3>
                <p>Story excerpt...</p>
                <footer>
                    <time datetime="2024-01-15">Jan 15</time>
                </footer>
            </article>
        </div>
    </section>
</main>

<aside class="sidebar">
    <section class="trending">
        <h2>Trending</h2>
        <ol>
            <li><a href="/trending/1">Trending Story 1</a></li>
            <li><a href="/trending/2">Trending Story 2</a></li>
        </ol>
    </section>
</aside>
```

## Accessibility Benefits

### Screen Reader Navigation
```html
<!-- Provides landmarks for screen readers -->
<nav aria-label="Main navigation">
    <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
    </ul>
</nav>

<!-- Skip to main content link -->
<a href="#main" class="skip-link">Skip to main content</a>

<main id="main" tabindex="-1">
    <!-- Main content -->
</main>
```

### Heading Hierarchy
```html
<article>
    <h1>Main Article Title</h1>        <!-- Level 1 -->

    <section>
        <h2>Section Title</h2>           <!-- Level 2 -->

        <h3>Subsection Title</h3>        <!-- Level 3 -->
        <p>Content...</p>

        <h3>Another Subsection</h3>      <!-- Level 3 -->
        <p>More content...</p>
    </section>

    <section>
        <h2>Another Section</h2>         <!-- Level 2 -->
        <p>Section content...</p>
    </section>
</article>
```

## SEO Benefits

### Rich Snippets Support
```html
<article itemscope itemtype="http://schema.org/Article">
    <header>
        <h1 itemprop="headline">Article Title</h1>
        <time itemprop="datePublished" datetime="2024-01-15">
            January 15, 2024
        </time>
        <address itemprop="author" itemscope itemtype="http://schema.org/Person">
            By <span itemprop="name">Author Name</span>
        </address>
    </header>

    <div itemprop="articleBody">
        <p>Article content...</p>
    </div>
</article>
```

## Common Anti-Patterns

### ❌ Div Soup (Non-semantic)
```html
<div class="header">
    <div class="title">Site Title</div>
    <div class="navigation">
        <div class="nav-item">Home</div>
        <div class="nav-item">About</div>
    </div>
</div>

<div class="content">
    <div class="article">
        <div class="article-title">Article Title</div>
        <div class="article-content">Content...</div>
    </div>
</div>

<div class="footer">Footer content</div>
```

### ✅ Semantic Alternative
```html
<header>
    <h1>Site Title</h1>
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
        </ul>
    </nav>
</header>

<main>
    <article>
        <h1>Article Title</h1>
        <p>Content...</p>
    </article>
</main>

<footer>Footer content</footer>
```

## Tools & Validation

- **HTML5 Outliner**: Visualize document structure
- **WAVE**: Check semantic structure accessibility
- **axe DevTools**: Accessibility testing including landmarks
- **Lighthouse**: SEO and accessibility audit
- **W3C Markup Validator**: Validate HTML5 semantic usage

## Browser Support

All modern browsers fully support HTML5 semantic elements. For older browsers (IE8 and below), you can use the HTML5 shiv:

```html
<!--[if lt IE 9]>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.7.3/html5shiv.min.js"></script>
<![endif]-->
```

## Verification

### Automated Checks

- Inspect the final rendered HTML in the browser or page source to confirm the rule is satisfied.
- Validate the affected markup with browser tooling or an HTML validator where appropriate.
- Test one representative route or template that uses the pattern.
- Re-check shared components that emit the same markup so the fix is consistent.

### Manual Checks

- Verify the rendered browser behavior manually on representative routes and supported browsers so the user-facing outcome matches the rule.