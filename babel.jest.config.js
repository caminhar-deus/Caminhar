export default {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' }, 
      modules: false, // Keep ES modules for Jest
      loose: true 
    }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
};
