const ethers = require("ethers");
const { FOREIGN_URL, FOREIGN_ASSET } = process.env;

const tokenAbi = ["function balanceOf(address) view returns (uint)"];

const provider = new ethers.providers.JsonRpcProvider(FOREIGN_URL);
const token = new ethers.Contract(FOREIGN_ASSET, tokenAbi, provider);
const address = process.argv[2];

async function main() {
  console.log({
    bnb: ethers.utils.formatEther(await provider.getBalance(address)),
    token: ethers.utils.formatEther(await token.balanceOf(address)),
  });
}

main();
