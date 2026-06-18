export default {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' }, 
      modules: 'auto' // Allow Jest to handle module transformation
    }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
};