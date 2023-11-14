module.exports = {
  apps : [{
    name: "shop-inventory",
    script: "build/index.js",
    interpreter: "node",
    interpreter_args: "--require ts-node/register --loader ts-node/esm",
    env_production: {
      NODE_ENV: "production"
    },
    watch: true,
    ignore_watch: ["node_modules"]
  }]
}
