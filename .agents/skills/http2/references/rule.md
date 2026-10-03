# Enable HTTP/2 or HTTP/3

> Use modern HTTP protocols to enable request multiplexing and reduce network latency.

**Priority:** high · **Difficulty:** intermediate · **Time:** 15 min

---
HTTP/2 and HTTP/3 are major revisions of the HTTP network protocol used by the World Wide Web. They address many of the performance limitations of HTTP/1.1.

## Code Example

#

## 1. Enabling HTTP/2 in Nginx
Ensure you have an SSL certificate configured, as HTTP/2 requires HTTPS in almost all browsers.

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # ... other configuration
}
```

### 2. Verifying Protocol in the Browser
You can check which protocol is being used in the Chrome DevTools Network tab.
1. Open **DevTools** > **Network**.
2. Right-click the table header and check **Protocol**.
3. Look for `h2` (HTTP/2) or `h3` (HTTP/3).

## Why It Matters

- **Multiplexing**: Allows multiple requests and responses to be sent at the same time over a single TCP connection, preventing "head-of-line blocking."
- **Header Compression**: Reduces the size of HTTP headers using HPACK (HTTP/2) or QPACK (HTTP/3), saving bandwidth.
- **Server Push**: Allows the server to send resources to the client before they are requested (though this is less commonly used today).
- **Reduced Latency**: HTTP/3, built on QUIC, further reduces latency by improving connection establishment and handling packet loss more efficiently.

## Best Practices

Confirm the protocol in a real browser trace or [PageSpeed Insights](https://pagespeed.web.dev/), because the practical benefit comes from how the live edge actually negotiates the connection, not just from a server config line.

✅ **Use HTTPS**: HTTP/2 and HTTP/3 are only supported over secure connections in browsers.
✅ **Stop Concatenating Files**: With HTTP/2, small individual files are often more efficient than one giant concatenated bundle because of better caching.
✅ **Leverage a CDN**: Most modern CDNs (Cloudflare, Akamai, etc.) enable HTTP/2 and HTTP/3 by default.
✅ **Prioritize Critical Assets**: Use resource hints like `preload` and `preconnect` to help the browser prioritize the right streams.

❌ **Don't Use Domain Sharding**: Splitting assets across multiple domains (e.g., `static1.example.com`, `static2.example.com`) is an anti-pattern in HTTP/2 as it breaks multiplexing.
❌ **Avoid Excessive Small Files**: While concatenation is less necessary, having thousands of tiny files still introduces some overhead.

## Tools & Validation

- [HTTP/2 Test](https://tools.keycdn.com/http2-test): Online tool to check if your server supports HTTP/2.
- [HTTP/3 Check](https://http3check.net/): Verify if your site is ready for the next generation of HTTP.
- **Chrome DevTools**: The "Protocol" column in the Network tab is the easiest way to verify support.
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/): Checks if the page "Does not use HTTP/2 for all of its resources."

## Standards

- Use web.dev: Learn Performance as the standard for measuring the final production behavior, not just local synthetic output.
- Use Chrome Developers: Lighthouse overview as the standard for measuring the final production behavior, not just local synthetic output.

## Support Notes

- Verify protocol support end to end on the real CDN, edge, or load balancer path because local origin support does not guarantee production support.
- Some browser and intermediary combinations may downgrade to HTTP/1.1 silently, so check the effective protocol in target browsers and not only in server config.

## Verification

### Automated Checks

- Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
- Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.

### Manual Checks

- Verify the change on a throttled mobile profile, not just local desktop.
- If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.