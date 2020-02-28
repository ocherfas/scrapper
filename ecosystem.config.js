module.exports = {
  apps : [{
    name: "scrapper",
    script: "./bin/index.js",
    instances: 1,
    watch: false,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z"
  }]
};
