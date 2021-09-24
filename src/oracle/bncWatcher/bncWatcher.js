const axios = require("axios");
const BN = require("bignumber.js");
const fs = require("fs");
const { computeAddress } = require("ethers").utils;

const ethers = require('ethers')


const logger = require("./logger");
const redis = require("./db");
const { publicKeyToAddress } = require("./crypto");
const { delay, retry } = require("./wait");
const { connectRabbit, assertQueue } = require("./amqp");

const { PROXY_URL,SIDE_MAX_FETCH_RANGE_SIZE, FOREIGN_URL, RABBITMQ_URL } = process.env;

const FOREIGN_FETCH_INTERVAL = parseInt(process.env.FOREIGN_FETCH_INTERVAL, 10);
const FOREIGN_FETCH_BLOCK_TIME_OFFSET = parseInt(
  process.env.FOREIGN_FETCH_BLOCK_TIME_OFFSET,
  10
);
const FOREIGN_FETCH_MAX_TIME_INTERVAL = parseInt(
  process.env.FOREIGN_FETCH_MAX_TIME_INTERVAL,
  10
);

const proxyHttpClient = axios.create({ baseURL: PROXY_URL });

const provider = new ethers.providers.JsonRpcProvider(FOREIGN_URL);

let channel;
let lastBlockNumber;
let epochTimeIntervalsQueue;

function getForeignAddress(epoch) {
  const keysFile = `/keys/keys${epoch}.store`;
  try {
    const publicKey = JSON.parse(fs.readFileSync(keysFile))[5];
    logger.debug("getForeignAddress :", publicKey);
    return publicKeyToAddress(publicKey);
  } catch (e) {
    return null;
  }
}

async function getTx(hash) {
  const response = await provider.getTransaction(hash);
  return response;
}

async function getBlockTime() {
  return (await provider.getBlock("latest", false)).timestamp;
}

async function getBlock() {
  return (await provider.getBlock("latest", false)).number;
}

async function fetchNewTransactions(address, startBlock, endBlock) {
  logger.debug("Fetching new transactions");
  const params = {
    address,
    topics: [],
    fromBlock: startBlock,
    toBlock: endBlock
  };

  logger.trace("Transactions fetch params %o", params);
  return (await provider.getPastLogs(params));
}

async function fetchTimeIntervalsQueue() {
  let epoch = null;
  let startTime = null;
  let endTime = null;
  const lastBscBlockTime = await getBlockTime();
  logger.trace(`Binance last block timestamp ${lastBscBlockTime}`);
  while (true) {
    const msg = await epochTimeIntervalsQueue.get();
    if (msg === false) {
      break;
    }
    const data = JSON.parse(msg.content);
    let accept = false;
    logger.trace("Consumed time interval event %o", data);
    if (epoch !== null && epoch !== data.epoch) {
      logger.warn(
        "Two consequently events have different epochs, should not be like this"
      );
      channel.nack(msg, false, true);
      break;
    }
    if (data.startTime) {
      logger.trace("Set foreign time", data);
      await redis.set(`foreignTime${data.epoch}`, data.startTime);
      channel.ack(msg);
      break;
    }
    if (epoch === null) {
      accept = true;
      epoch = data.epoch;
      startTime = await redis.get(`foreignTime${epoch}`);
      logger.trace(
        `Retrieved epoch ${epoch} and start time ${startTime} from redis`
      );
      if (startTime === null) {
        logger.warn(`Empty foreign time for epoch ${epoch}`);
      }
    }
    if (
      (data.prolongedTime - startTime < FOREIGN_FETCH_MAX_TIME_INTERVAL ||
        accept) &&
      data.prolongedTime < lastBscBlockTime
    ) {
      endTime = data.prolongedTime;
      channel.ack(msg);
    } else {
      logger.trace("Requeuing current queue message");
      channel.nack(msg, false, true);
      break;
    }
  }
  return {
    epoch,
    startTime,
    endTime,
    startBlock:await getBlock(),
    endBlock:Math.min(await getBlock(), lastBlockNumber + SIDE_MAX_FETCH_RANGE_SIZE - 1)
  };
}

async function initialize() {
  logger.info
  channel = await connectRabbit(RABBITMQ_URL);
  logger.info("Connecting to epoch time intervals queue");
  epochTimeIntervalsQueue = await assertQueue(
    channel,
    "epochTimeIntervalsQueue"
  );
  blockNumber = await getBlock();
  logger.debug("blockNumber",blockNumber)
}

async function loop() {
  const { epoch, startTime, endTime,startBlock,endBlock } = await fetchTimeIntervalsQueue();

  if (!startTime || !endTime) {
    logger.debug("Nothing to fetch");
    await delay(FOREIGN_FETCH_INTERVAL);
    return;
  }

  if (startBlock < lastBlockNumber) {
    logger.debug(`No block after ${startBlock}`);
    await delay(2000);
    return;
  }

  logger.debug(`Watching events in blocks #${startBlock}-${endBlock}`)

  const address = getForeignAddress(epoch); // TODO

  if (!address) {
    logger.debug("Validator is not included in current epoch");
    await redis.set(`foreignTime${epoch}`, endTime);
    await delay(FOREIGN_FETCH_INTERVAL);
    return;
  }

  const transactions = await fetchNewTransactions(address, startBlock, endBlock);

  if (transactions.length === 0) {
    logger.debug("Found 0 new transactions");
    await redis.set(`foreignTime${epoch}`, endTime);
    await delay(FOREIGN_FETCH_INTERVAL);
    return;
  }

  logger.info(`Found ${transactions.length} new transactions`);
  logger.trace("%o", transactions);

  for (let i = transactions.length - 1; i >= 0; i -= 1) {
    const tx = getTx(transactions[i].transactionHash)
    logger.debug("Transaction :", tx);

    await proxyHttpClient.post("/transfer", {
      to: tx.to,
      value: new BN(tx.value).toString(16),
      hash: tx.hash,
      epoch,
    });
  }
  await redis.set(`foreignTime${epoch}`, endTime);
}

async function main() {
  await initialize();

  while (true) {
    await loop();
  }
}

main();
