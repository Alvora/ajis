import fs from 'fs';
const stats = fs.statSync('association_v3.db');
console.log('Size:', stats.size);
