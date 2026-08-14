module.exports = {
  apps: [
    {
      name: "opuspublica-web",
      script: "npm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      },
      exp_backoff_restart_delay: 100,
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: "1G"
    },
    {
      name: "opuspublica-worker",
      script: "node",
      args: "--import tsx governance/worker-entrypoint.ts",
      instances: 1, // Workers should not run in cluster mode to avoid duplicate task picking if not designed for it
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      },
      // Restart policy and health
      autorestart: true,
      exp_backoff_restart_delay: 1000,
      watch: false,
      max_memory_restart: "500M",
      // Graceful shutdown
      kill_timeout: 10000,
      // Logging
      out_file: "./logs/worker-out.log",
      error_file: "./logs/worker-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
