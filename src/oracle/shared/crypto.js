const crypto = require('crypto')
var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
const publicKeyToAddr = require('ethereum-public-key-to-address')

function padZeros(s, len) {
  while (s.length < len) {
    // eslint-disable-next-line no-param-reassign
    s = `0${s}`
  }
  return s
}

function sha256(bytes) {
  return crypto.createHash('sha256')
    .update(bytes)
    .digest('hex')
}

function publicKeyToAddress({ x, y }) {
var pub = { x, y }; 
var key = ec.keyFromPublic(pub, 'hex');
const publicKey = key.getPublic("hex");
return publicKeyToAddr(publicKey)
}

module.exports = {
  publicKeyToAddress,
  padZeros,
  sha256
}
