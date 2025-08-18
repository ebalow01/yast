const fs = require('fs');
const data = JSON.parse(fs.readFileSync('nvdw_15min_data.json', 'utf8'));

// Get last 5 trading days (130 bars)
const last5Days = data.results.slice(-130);

console.log('=== ACTUAL 15-MINUTE STOCK DATA FOR NVDW (LAST 5 TRADING DAYS) ===');
console.log('');
console.log('Timestamp (UTC)             | Open    | High    | Low     | Close   | Volume');
console.log('---------------------------|---------|---------|---------|---------|----------');

last5Days.forEach(bar => {
  const date = new Date(bar.t);
  const timestamp = date.toISOString().replace('T', ' ').substring(0, 19);
  const open = bar.o.toFixed(2).padEnd(7);
  const high = bar.h.toFixed(2).padEnd(7);
  const low = bar.l.toFixed(2).padEnd(7);
  const close = bar.c.toFixed(2).padEnd(7);
  const volume = bar.v.toLocaleString().padEnd(8);
  console.log(`${timestamp} | ${open} | ${high} | ${low} | ${close} | ${volume}`);
});

console.log('');
console.log('Total bars:', last5Days.length);
console.log('Date range:', new Date(last5Days[0].t).toISOString().split('T')[0], 'to', new Date(last5Days[last5Days.length-1].t).toISOString().split('T')[0]);