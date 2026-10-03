# Minify all JavaScript files

> All JavaScript files are minified to reduce file size and improve loading performance.

**Priority:** high · **Difficulty:** beginner · **Time:** 15 min

---
JavaScript minification removes unnecessary characters, shortens variable names, and optimizes code structure to reduce file sizes and improve loading performance.

## Code Examples

#

## Unminified JavaScript (Development)
```javascript
/**
 * User authentication module
 * Handles login, logout, and session management
 */
class UserAuthenticator {
  constructor(apiBaseUrl, options = {}) {
    this.apiBaseUrl = apiBaseUrl;
    this.options = {
      timeout: 5000,
      retries: 3,
      ...options
    };
    this.currentUser = null;
    this.authToken = localStorage.getItem('authToken');
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise} Authentication result
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.token;
      this.currentUser = data.user;

      localStorage.setItem('authToken', this.authToken);
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      return {
        success: true,
        user: this.currentUser,
        message: 'Authentication successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout current user
   */
  logout() {
    this.authToken = null;
    this.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// Initialize authenticator
const auth = new UserAuthenticator('https://api.example.com', {
  timeout: 10000,
  retries: 5
});

```

### Minified JavaScript (Production)
```javascript
class UserAuthenticator{constructor(e,t={}){this.apiBaseUrl=e,this.options={timeout:5e3,retries:3,...t},this.currentUser=null,this.authToken=localStorage.getItem("authToken")}async login(e,t){try{const n=await fetch(`${this.apiBaseUrl}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:t})});if(!n.ok)throw new Error(`Authentication failed: ${n.status}`);const s=await n.json();return this.authToken=s.token,this.currentUser=s.user,localStorage.setItem("authToken",this.authToken),localStorage.setItem("user",JSON.stringify(this.currentUser)),{success:!0,user:this.currentUser,message:"Authentication successful"}}catch(n){return console.error("Login error:",n),{success:!1,error:n.message}}}logout(){this.authToken=null,this.currentUser=null,localStorage.removeItem("authToken"),localStorage.removeItem("user"),window.location.href="/login"}}const auth=new UserAuthenticator("https://api.example.com",{timeout:1e4,retries:5});export{UserAuthenticator,auth};
```

**Size Reduction**: ~85% smaller (from ~2.1KB to ~0.32KB)

## Why It Matters

Unminified JavaScript adds hundreds of KB to page weight, slowing down load times especially on mobile networks where every byte counts.

## Build Tool Configuration

### Webpack with Terser
```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            // Remove console.* statements
            drop_console: true,
            // Remove debugger statements
            drop_debugger: true,
            // Remove unused functions
            unused: true,
            // Remove dead code
            dead_code: true,
            // Optimize comparisons
            comparisons: true,
            // Optimize conditionals
            conditionals: true,
            // Evaluate constant expressions
            evaluate: true,
            // Optimize boolean contexts
            booleans: true,
            // Optimize loops
            loops: true,
            // Join consecutive var statements
            join_vars: true,
            // Remove unreachable code
            unreachable: true
          },
          mangle: {
            // Mangle top-level names
            toplevel: true,
            // Preserve function names for debugging
            keep_fnames: false,
            // Mangle properties
            properties: {
              // Don't mangle quoted properties
              quoted: false
            }
          },
          format: {
            // Remove comments
            comments: false,
            // ASCII only
            ascii_only: true
          }
        },
        // Enable parallel processing
        parallel: true,
        // Extract comments to separate file
        extractComments: false
      })
    ],

    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```

### Vite JavaScript Minification
```javascript
// vite.config.js

  build: {
    minify: 'terser', // or 'esbuild' for faster builds

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2 // Multiple passes for better optimization
      },
      mangle: {
        toplevel: true,
        properties: {
          regex: /^_/ // Mangle properties starting with underscore
        }
      },
      format: {
        comments: false
      }
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor code
          vendor: ['react', 'react-dom'],
          // Separate utils
          utils: ['lodash', 'date-fns']
        }
      }
    }
  }
});
```

### Rollup with Minification
```javascript
// rollup.config.js

  input: 'src/main.js',
  output: {
    file: 'dist/bundle.min.js',
    format: 'iife',
    name: 'MyApp'
  },

  plugins: [
    nodeResolve(),
    commonjs(),

    // Minify in production
    process.env.NODE_ENV === 'production' && terser({
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_getters: true,
        unsafe_comps: true,
        unsafe_math: true,
        passes: 2
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false
      }
    })
  ].filter(Boolean)
};
```

## Framework Examples

### Next.js Automatic Minification
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // Remove console statements in production
    removeConsole: process.env.NODE_ENV === 'production',

    // Enable React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production',

    // Remove React DevTools in production
    reactStrictMode: true
  },

  // Custom webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Additional optimizations for client-side production
      config.optimization.minimize = true;

      // Custom Terser configuration
      config.optimization.minimizer[0].options.terserOptions = {
        ...config.optimization.minimizer[0].options.terserOptions,
        compress: {
          ...config.optimization.minimizer[0].options.terserOptions.compress,
          drop_console: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        }
      };
    }

    return config;
  },

  experimental: {
    // Enable SWC minification (faster than Terser)
    swcMinify: true
  }
};

module.exports = nextConfig;
```

### Create React App with Custom Minification
```javascript
// craco.config.js
const { when, whenProd } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Customize Terser options in production
      whenProd(() => {
        const minimizerIndex = webpackConfig.optimization.minimizer.findIndex(
          minimizer => minimizer.constructor.name === 'TerserPlugin'
        );

        if (minimizerIndex > -1) {
          webpackConfig.optimization.minimizer[minimizerIndex].options.terserOptions = {
            ...webpackConfig.optimization.minimizer[minimizerIndex].options.terserOptions,
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info']
            },
            mangle: {
              toplevel: true
            }
          };
        }
      });

      return webpackConfig;
    }
  }
};
```

### Vue CLI Minification
```javascript
// vue.config.js
module.exports = {
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      // Custom Terser configuration
      config.optimization.minimizer[0].options.terserOptions = {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log']
        },
        mangle: {
          safari10: true,
          toplevel: true
        }
      };
    }
  },

  chainWebpack: config => {
    config
      .when(process.env.NODE_ENV === 'production', config => {
        config
          .plugin('terser')
          .tap(args => {
            args[0].terserOptions.compress = {
              ...args[0].terserOptions.compress,
              drop_console: true,
              pure_funcs: ['console.log', 'console.info']
            };
            return args;
          });
      });
  }
};
```

## Manual Minification

### Command Line Tools
```bash
# Using Terser CLI
npm install -g terser
terser input.js -o output.min.js --compress --mangle

# With advanced options
terser input.js -o output.min.js \
  --compress drop_console=true,drop_debugger=true \
  --mangle toplevel=true \
  --comments false

# Using UglifyJS
npm install -g uglify-js
uglifyjs input.js -o output.min.js -c -m

# Batch processing
find src/js -name "*.js" -exec terser {} -o {}.min \;
```

### Node.js Script
```javascript
// scripts/minify-js.js
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function minifyJavaScript(inputPath, outputPath) {
  try {
    const code = fs.readFileSync(inputPath, 'utf8');

    const result = await minify(code, {
      compress: {
        drop_console: true,
        drop_debugger: true,
        unused: true,
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        passes: 2
      },
      mangle: {
        toplevel: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        beautify: false
      },
      sourceMap: {
        filename: path.basename(outputPath),
        url: `${path.basename(outputPath)}.map`
      }
    });

    if (result.error) {
      throw result.error;
    }

    // Write minified code
    fs.writeFileSync(outputPath, result.code);

    // Write source map
    if (result.map) {
      fs.writeFileSync(`${outputPath}.map`, result.map);
    }

    // Calculate savings
    const originalSize = Buffer.byteLength(code, 'utf8');
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);

    console.log(`✅ ${inputPath} → ${outputPath}`);
    console.log(`   ${originalSize} bytes → ${minifiedSize} bytes (${savings}% smaller)`);

  } catch (error) {
    console.error(`❌ Error minifying ${inputPath}:`, error.message);
  }
}

// Process all JS files
async function minifyAllJS() {
  const srcDir = 'src/js';
  const distDir = 'dist/js';

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const jsFiles = fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.js') && !file.endsWith('.min.js'));

  for (const file of jsFiles) {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(distDir, file.replace('.js', '.min.js'));
    await minifyJavaScript(inputPath, outputPath);
  }
}

minifyAllJS();
```

## Advanced Optimization Techniques

### Tree Shaking with Minification
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',

  optimization: {
    // Enable tree shaking
    usedExports: true,
    sideEffects: false,

    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            // More aggressive tree shaking
            unused: true,
            dead_code: true,
            pure_getters: true,
            pure_funcs: [
              'Math.floor',
              'Math.ceil',
              'console.log',
              'console.info'
            ]
          }
        }
      })
    ]
  },

  // Mark packages as side-effect free
  module: {
    rules: [
      {
        test: /\.js$/,
        sideEffects: false
      }
    ]
  }
};
```

### Code Splitting with Minification
```javascript
// Dynamic imports for code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));

// Webpack will automatically minify each chunk
const AdminPanel = lazy(() =>
  import(
    /* webpackChunkName: "admin-panel" */
    './AdminPanel'
  )
);

// Preload critical chunks
const CriticalComponent = lazy(() =>
  import(
    /* webpackChunkName: "critical" */
    /* webpackPreload: true */
    './CriticalComponent'
  )
);
```

### Service Worker Minification
```javascript
// webpack.config.js with Workbox
const { GenerateSW } = require('workbox-webpack-plugin');

module.exports = {
  plugins: [
    new GenerateSW({
      // Minify the generated service worker
      swDest: 'sw.js',
      clientsClaim: true,
      skipWaiting: true,

      // Custom webpack config for SW
      webpackCompilationPlugins: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true
            }
          }
        })
      ]
    })
  ]
};
```

## Performance Monitoring

### Bundle Analysis
```javascript
// webpack-bundle-analyzer
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};

// Package.json script
{
  "scripts": {
    "analyze": "npm run build && npx webpack-bundle-analyzer dist/static/js/*.js"
  }
}
```

### Runtime Performance Monitoring
```javascript
// Monitor JS parsing and execution time
function measureJavaScriptPerformance() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('.js')) {
        console.log('JS File:', entry.name);
        console.log('Parse Time:', entry.duration + 'ms');
        console.log('Transfer Size:', entry.transferSize + ' bytes');

        // Calculate compression ratio
        const compressionRatio = entry.encodedBodySize > 0
          ? (entry.transferSize / entry.encodedBodySize * 100).toFixed(1)
          : 'N/A';
        console.log('Compression:', compressionRatio + '%');
      }
    }
  });

  observer.observe({ entryTypes: ['resource'] });
}

// Measure JavaScript execution time
function measureExecutionTime(fn, label) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}
```

## Security Considerations

### Safe Minification Practices
```javascript
// terser.config.js
module.exports = {
  compress: {
    // Don't remove function names needed for error reporting
    keep_fnames: true,

    // Don't remove function arguments (needed for some libraries)
    keep_fargs: true,

    // Be careful with unsafe optimizations
    unsafe: false,
    unsafe_comps: false,
    unsafe_math: false,

    // Don't optimize regular expressions aggressively
    unsafe_regexp: false
  },

  mangle: {
    // Don't mangle properties that might be accessed dynamically
    properties: {
      reserved: ['$', 'jQuery', 'API_KEY', 'CONFIG']
    }
  }
};
```

### Source Maps for Production Debugging
```javascript
// webpack.config.js
module.exports = {
  devtool: process.env.NODE_ENV === 'production'
    ? 'hidden-source-map'  // Generate maps but don't expose them
    : 'eval-source-map',

  optimization: {
    minimizer: [
      new TerserPlugin({
        sourceMap: true, // Generate source maps
        terserOptions: {
          // Keep function names for better error reporting
          keep_fnames: /^(API|Config|Utils)/
        }
      })
    ]
  }
};
```

## Best Practices

1. **Automate in CI/CD**: Never manually minify JavaScript files
2. **Environment-Specific**: Only minify in production builds
3. **Source Maps**: Always generate source maps for debugging
4. **Test After Minification**: Ensure functionality remains intact
5. **Bundle Analysis**: Regularly analyze bundle sizes and composition
6. **Dead Code Elimination**: Remove unused code before minification
7. **Code Splitting**: Split large bundles for better caching
8. **Monitor Performance**: Track bundle sizes and loading times
9. **Security**: Be cautious with aggressive minification options
10. **Backup Strategy**: Keep unminified versions for debugging

## Common Issues and Solutions

### Broken Code After Minification
```javascript
// Problem: Variable name collision
// Solution: Configure mangle options carefully
{
  mangle: {
    reserved: ['$', 'jQuery', 'API_KEY'], // Don't mangle these
    properties: {
      regex: /^_private/ // Only mangle private properties
    }
  }
}
```

### Source Map Issues
```javascript
// Solution: Proper source map configuration
{
  devtool: 'source-map',
  output: {
    sourceMapFilename: '[name].[contenthash].map'
  }
}
```

### Third-party Library Issues
```javascript
// Solution: Exclude problematic libraries from minification
{
  optimization: {
    minimizer: [
      new TerserPlugin({
        exclude: /node_modules\/(problematic-library)/
      })
    ]
  }
}
```

## Support Notes

- Minification output can differ by toolchain and target browser assumptions, so verify the real production bundle and source-map behavior.
- Do not assume modern syntax can remain untransformed if an older target browser is still supported.

## Verification

### Automated Checks

- Verify the behavior in the browser after the code change, not only in static analysis.
- Inspect DevTools Network or Performance panels when the rule affects loading or execution order.
- Test the primary user flow and one edge case triggered by the changed script path.

### Manual Checks

- Confirm the code still behaves correctly when the feature is delayed, lazy-loaded, or fails.