# Use a content delivery network

> Static assets are served from a CDN for reduced latency and faster delivery.

**Priority:** high · **Difficulty:** intermediate · **Time:** 30 min

---
CDNs distribute your content across global edge servers for faster delivery.

## Code Example

```javascript
// next.config.js - assets automatically served via CDN
module.exports = {
  // Enable image optimization via CDN
  images: {
    domains: ['images.example.com'],
  },

  // Configure headers for CDN caching
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

## Why It Matters

A CDN serves static assets from geographically distributed servers—users download from the nearest location, dramatically reducing latency and improving load times.

## CDN Benefits

| Benefit | Impact |
|---------|--------|
| Reduced latency | 50-70% faster for distant users |
| Traffic handling | Auto-scales for traffic spikes |
| DDoS protection | Edge network absorbs attacks |
| SSL/TLS offloading | Edge handles encryption |
| Caching | Reduces origin server load |

## Common CDN Providers

| Provider | Best For | Key Features |
|----------|----------|--------------|
| Cloudflare | General purpose | Free tier, WAF, Workers |
| Vercel | Next.js/React apps | Edge functions, instant cache invalidation |
| AWS CloudFront | AWS ecosystem | Lambda@Edge, S3 integration |
| Fastly | Real-time updates | Instant purging, VCL |
| Akamai | Enterprise | Global reach, advanced security |

## Cloudflare Configuration

```javascript
// DNS setup points to Cloudflare, which proxies to origin

// Page rules for caching
// *.example.com/static/* -> Cache Level: Cache Everything, Edge TTL: 1 month

// Workers for custom logic
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Serve static assets from cache
  if (url.pathname.startsWith('/static/')) {
    const response = await fetch(request)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'public, max-age=31536000')
    return new Response(response.body, { ...response, headers })
  }

  return fetch(request)
}
```

## AWS CloudFront Setup

```yaml
# CloudFormation template
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: !GetAtt S3Bucket.DomainName
            Id: S3Origin
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # CachingOptimized
          Compress: true
        PriceClass: PriceClass_100  # US, Canada, Europe
        Enabled: true
```

## React App with CDN Assets

```tsx
// Use CDN URLs for static assets
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || ''

function ImageWithCDN({ src, alt, ...props }: ImageProps) {
  // Prepend CDN URL to relative paths
  const cdnSrc = src.startsWith('http') ? src : `${CDN_URL}${src}`

  return <img src={cdnSrc} alt={alt} {...props} />
}

// Environment variables
// .env.production
// NEXT_PUBLIC_CDN_URL=https://cdn.example.com
```

## Cache Headers for Different Asset Types

```nginx
# Nginx configuration for origin server
location /static/ {
    # Immutable assets (hashed filenames)
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location /assets/ {
    # Assets that may change
    add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800";
}

location / {
    # HTML pages - short cache with revalidation
    add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

## Measuring CDN Performance

```javascript
// Check if resources are served from CDN
function checkCDNHeaders() {
  const resources = performance.getEntriesByType('resource')

  resources.forEach(resource => {
    // CDN typically adds specific headers
    // Check in Network tab: cf-ray (Cloudflare), x-amz-cf-id (CloudFront)
    console.log(resource.name, {
      transferSize: resource.transferSize,
      encodedBodySize: resource.encodedBodySize,
      duration: resource.duration
    })
  })
}

// Test from multiple locations using tools like:
// - WebPageTest (select test locations)
// - Pingdom (global testing)
// - GTmetrix (performance comparison)
```

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Verification

### Automated Checks

- Check response headers for CDN indicators (cf-ray, x-cache)
- Run Lighthouse from different regions

### Manual Checks

- Test from multiple geographic locations
- Verify cache hit rate in CDN dashboard
- Compare latency with and without CDN