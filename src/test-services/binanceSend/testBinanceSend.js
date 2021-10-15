const ethers = require('ethers')

const { FOREIGN_URL, FOREIGN_ASSET, FOREIGN_PRIVATE_KEY } = process.env

const PRIVATE_KEY = process.env.PRIVATE_KEY || FOREIGN_PRIVATE_KEY


const tokenAbi = [
  'function transfer(address to, uint256 value)',
  'function approve(address to, uint256 value)'
]


const provider = new ethers.providers.JsonRpcProvider(FOREIGN_URL)

const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
const token = new ethers.Contract(FOREIGN_ASSET, tokenAbi, wallet)


async function main() {
  const to = process.argv[2]
  const tokens = parseFloat(process.argv[3])
  let bnbs = process.argv[4] || 0
  let receipt


  if (bnbs) {
    bnbs = parseFloat(bnbs)
    console.log(`Funding from ${wallet.address} to ${to}, ${tokens} Tokens, ${bnbs} BNB'`)

    const tx = await wallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(bnbs.toString())
    })

    receipt = await tx.wait()
    
  } else {
    console.log(`From ${wallet.address} to ${to}, ${tokens} Tokens'`)
    try {
      const tx = await token.transfer(to, ethers.utils.parseEther(tokens.toString()))
      receipt = await tx.wait()
    } catch (error) {
      console.log(error)
    }
  }

  if (receipt.status === 200) {
    console.log(receipt.result[0].hash)
  } else {
    console.log(receipt)
  }
}

main()
