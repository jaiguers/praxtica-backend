const lk = require('./node_modules/@livekit/rtc-node');
console.log('Keys:', Object.keys(lk).sort());
if (lk.AudioFrame) {
    console.log('AudioFrame prototype keys:', Object.keys(lk.AudioFrame.prototype));
}
// Check for Stream classes
const streamKeys = Object.keys(lk).filter(k => k.includes('Stream'));
console.log('Stream related classes:', streamKeys);
