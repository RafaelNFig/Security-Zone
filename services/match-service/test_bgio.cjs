// Testa se o statuses resolve para a versão certa
try {
  const path = require.resolve('statuses');
  console.log('statuses path:', path);
  const s = require(path);
  console.log('statuses keys:', Object.keys(s).slice(0, 10));
  console.log('statuses.message:', typeof s.message);
  console.log('statuses[200]:', s[200]);
} catch(e) {
  console.log('statuses error:', e.message);
}

try {
  const path2 = require.resolve('http-errors/node_modules/statuses');
  console.log('nested statuses path:', path2);
  const s2 = require(path2);
  console.log('nested statuses.message:', typeof s2.message);
} catch(e) {
  console.log('nested statuses error:', e.message);
}
