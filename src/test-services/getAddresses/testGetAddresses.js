const { utils } = require("ethers");

function main() {
  const privateKey = process.argv[2].startsWith("0x")
    ? process.argv[2]
    : `0x${process.argv[2]}`;

  const ethAddress = utils.computeAddress(privateKey);
  const bscAddress = utils.computeAddress(privateKey);

  console.log(
    `Eth address: ${ethAddress}\nBsc address: ${bscAddress}\n)}`
  );
}

main();
