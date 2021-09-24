const Bridge = artifacts.require('Bridge')

const addresses = Object.entries(process.env)
  .filter(([key]) => key.startsWith('VALIDATOR_ADDRESS'))
  .map(([, value]) => value)

  console.log(addresses)
const {
  THRESHOLD, HOME_TOKEN_ADDRESS, MIN_TX_LIMIT, MAX_TX_LIMIT, BLOCKS_RANGE_SIZE, CLOSE_EPOCH_FLAG
} = process.env

module.exports = (deployer) => {
  deployer.deploy(
    Bridge,
    THRESHOLD,
    addresses,
    HOME_TOKEN_ADDRESS,
    [MIN_TX_LIMIT, MAX_TX_LIMIT],
    BLOCKS_RANGE_SIZE,
    CLOSE_EPOCH_FLAG === 'true'
  )
}
