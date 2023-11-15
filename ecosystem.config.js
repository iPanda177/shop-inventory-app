module.exports = {
  apps : [{
    name: "shop-inventory",
    script: "build/index.js",
    env_production: {
      NODE_ENV: "production"
    },
    watch: true,
    ignore_watch: ["node_modules"]
  }]
}
