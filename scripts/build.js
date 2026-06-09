const { spawnSync } = require('child_process');

process.env.VUE_APP_VERSION = process.env.VUE_APP_VERSION || Math.floor(Date.now() / 1000).toString();
if (process.argv[2] === 'production') {
  process.env.NODE_ENV = 'production';
}

const result = spawnSync(process.execPath, [
  require.resolve('@vue/cli-service/bin/vue-cli-service.js'),
  'build',
], {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
