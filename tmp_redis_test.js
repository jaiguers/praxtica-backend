const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: 1,
});

redis.on('connect', () => console.log('✅ Connected to Redis'));
redis.on('error', (err) => {
    console.error('❌ Redis Error Path:', err.path);
    console.error('❌ Redis Error Message:', err.message);
    console.error('❌ Redis Full Error:', err);
    process.exit(1);
});

setTimeout(() => {
    console.log('⌛ Timeout reaching Redis...');
    process.exit(1);
}, 5000);
