export default {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' }, 
      modules: 'auto', // Allow Jest to handle module transformation
      loose: true 
    }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ],
  // Disable istanbul plugin for test files to avoid Babel conflicts
  env: {
    test: {
      plugins: [
        '@babel/plugin-transform-modules-commonjs'
      ]
    }
  }
};
