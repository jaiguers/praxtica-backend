const Redis = require('ioredis');
require('dotenv').config();

const host = process.env.REDIS_HOST;
console.log(`Host: "${host}"`);
console.log(`Host Length: ${host.length}`);
for (let i = 0; i < host.length; i++) {
    console.log(`Char at ${i}: ${host.charCodeAt(i)} ('${host[i]}')`);
}

const redis = new Redis({
    host: host.trim(),
    port: parseInt(process.env.REDIS_PORT, 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 1,
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis successfully!');
    process.exit(0);
});

redis.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('⌛ Timeout reaching Redis...');
    process.exit(1);
}, 5000);
