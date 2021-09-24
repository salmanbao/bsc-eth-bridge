const PrivateKeyProvider = require('truffle-hdwallet-provider')

const { HOME_RPC_URL, HOME_PRIVATE_KEY } = process.env
console.log("HOME_RPC_URL",HOME_RPC_URL)
console.log("HOME_PRIVATE_KEY",HOME_PRIVATE_KEY)

const addresses = Object.entries(process.env)
  .filter(([key]) => key.startsWith('VALIDATOR_ADDRESS'))
  .map(([, value]) => value)

  console.log(addresses)
  
module.exports = {
  networks: {
    home: {
      provider: new PrivateKeyProvider(HOME_PRIVATE_KEY, HOME_RPC_URL),
      network_id: "*",
      timeoutBlocks:200,
      skipDryRun:false
    }
  },
  compilers: {
    solc: {
      version: '0.5.9',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
}
