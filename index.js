const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const configFile = fs.readFileSync("config.json", "utf-8");
const config = JSON.parse(configFile);

const bot = new TelegramBot(config.telegramToken, { polling: true });

let autoSendInterval = null;

// Handle /on <interval>
bot.onText(/\/on (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (match && match[1]) {
    const interval = parseInt(match[1]);
    if (match[1]) {
      if (autoSendInterval !== null) {
        clearInterval(autoSendInterval);
      }

      autoSendInterval = setInterval(() => {
        fetchDataAndSend(chatId);
      }, interval * 1000 * 60);

      bot.sendMessage(
        chatId,
        `Auto send enabled with interval ${interval} minutes.`
      );
    }
    return;
  }

  const interval = config.autoSendInterval || 10;

  if (interval === 0) {
    bot.sendMessage(chatId, "Auto send is not configured.");
  } else {
    if (autoSendInterval !== null) {
      clearInterval(autoSendInterval);
    }

    autoSendInterval = setInterval(() => {
      fetchDataAndSend(chatId);
    }, interval * 1000 * 60);

    bot.sendMessage(
      chatId,
      `Auto send enabled with interval ${interval} minutes.`
    );
    return;
  }
});

bot.onText(/\/off/, (msg) => {
  const chatId = msg.chat.id;

  if (autoSendInterval !== null) {
    clearInterval(autoSendInterval);
    autoSendInterval = null;
    bot.sendMessage(chatId, "Auto send disabled.");
  } else {
    bot.sendMessage(chatId, "Auto send is not enabled.");
  }
  return;
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  fetchDataAndSend(chatId);
  return;
});

bot.onText(/\/set_region (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const regionMap = {
    'utc-12': 'Etc/GMT+12',
    'utc-11': 'Etc/GMT+11',
    'utc-10': 'Etc/GMT+10',
    'utc-9': 'Etc/GMT+9',
    'utc-8': 'Etc/GMT+8',
    'utc-7': 'Etc/GMT+7',
    'utc-6': 'Etc/GMT+6',
    'utc-5': 'Etc/GMT+5',
    'utc-4': 'Etc/GMT+4',
    'utc-3': 'Etc/GMT+3',
    'utc-2': 'Etc/GMT+2',
    'utc-1': 'Etc/GMT+1',
    'utc+0': 'Etc/GMT',
    'utc+1': 'Etc/GMT-1',
    'utc+2': 'Etc/GMT-2',
    'utc+3': 'Etc/GMT-3',
    'utc+4': 'Etc/GMT-4',
    'utc+5': 'Etc/GMT-5',
    'utc+6': 'Etc/GMT-6',
    'utc+7': 'Etc/GMT-7',
    'utc+8': 'Etc/GMT-8',
    'utc+9': 'Etc/GMT-9',
    'utc+10': 'Etc/GMT-10',
    'utc+11': 'Etc/GMT-11',
    'utc+12': 'Etc/GMT-12',
    'utc+13': 'Etc/GMT-13',
    'utc+14': 'Etc/GMT-14'
  };

  const regionInput = match[1].toLowerCase();

  if (regionInput in regionMap) {
    const region = regionMap[regionInput];

    // Update the region in the config
    config.region = region;

    // Save to the config file
    fs.writeFileSync("config.json", JSON.stringify(config, null, 2));

    bot.sendMessage(chatId, `Region set to ${regionInput}.`);
  } else {
    let supportedRegions = Object.keys(regionMap).join(', ');
    let exampleRegion = Object.keys(regionMap)[0]; // Mengambil contoh region dari regionMap

    bot.sendMessage(chatId, `Unsupported region format: ${regionInput}.\nSupported regions are: ${supportedRegions}.\nFor example: /set_region ${exampleRegion}`);
  }
  return;
});


bot.onText(/\/get_region/, (msg) => {
  const chatId = msg.chat.id;

  // Ambil nilai region dari konfigurasi
  const region = config.region || 'Region has not been set yet.';

  bot.sendMessage(chatId, `Current region is set to ${region}`);
  return;
});


async function fetchDataAndSend(chatId) {
  try {
    const response = await axios.get("http://127.0.0.1:26657/status");
    const data = response.data.result;

    const { node_info, sync_info, validator_info } = data;
    const { latest_block_height, latest_block_time, catching_up } = sync_info;
    const { address, voting_power } = validator_info;

    const { moniker, network } = node_info;

    const region = config.region || 'Etc/UTC';


    const formattedBlockTime = new Date(latest_block_time).toLocaleString('en-US', {
      timeZone: region,
      hour12: true,
    });

    const message = `Moniker: ${moniker}\nNetwork: ${network}\nLatest Block Height: ${latest_block_height}\nLatest Block Time: ${formattedBlockTime}\nCatching Up: ${catching_up}\nAddress: ${address}\nVoting Power: ${voting_power}\n`;

    bot.sendMessage(chatId, message);
  } catch (error) {
    bot.sendMessage(chatId, "Error fetching data from the endpoint.");
  }
  return;
}


const os = require('os');
const disk = require('diskusage');

bot.onText(/\/server/, (msg) => {
  const chatId = msg.chat.id;

  disk.check('/', (err, info) => {
    if (err) {
      bot.sendMessage(chatId, 'Error fetching disk information.');
      return;
    }

    const totalDisk = info.total; // Total disk space
    const freeDisk = info.free; // Free disk space
    const usedDisk = info.total - info.free; // Used disk space

    const totalMemory = os.totalmem(); // Total RAM
    const freeMemory = os.freemem(); // Free RAM
    const usedMemory = totalMemory - freeMemory; // Used RAM

    const cpuUsage = os.loadavg()[0]; // Current CPU usage

    const message = `Server Stats:\n\n`
      + `💿 Disk Usage:\n`
      + `Total: ${(totalDisk / 1e9).toFixed(2)} GB\n`
      + `Used: ${(usedDisk / 1e9).toFixed(2)} GB\n`
      + `Free: ${(freeDisk / 1e9).toFixed(2)} GB\n\n`
      + `🖥️ Memory Usage:\n`
      + `Total: ${(totalMemory / 1e9).toFixed(2)} GB\n`
      + `Used: ${(usedMemory / 1e9).toFixed(2)} GB\n`
      + `Free: ${(freeMemory / 1e9).toFixed(2)} GB\n\n`
      + `🔄 CPU Usage:\n`
      + `Total CPUs: ${os.cpus().length}\n`
      + `Current Usage: ${cpuUsage.toFixed(2)}%`;

    bot.sendMessage(chatId, message);
  });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const message = `List of available commands:\n\n`
    + `/on <interval> - Enable auto-send with a specified interval in minutes.\n`
    + `/off - Disable auto-send.\n`
    + `/stats - Manually fetch and send blockchain-related data.\n`
    + `/set_region <region> - Set the time region. Supported regions: utc-12 to utc+14.\n`
    + `/get_region - Get the current set region.\n`
    + `/server - Get server statistics including disk, memory, and CPU usage.`;

  bot.sendMessage(chatId, message);
});


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const startMessage = "Hello! I'm a bot designed to fetch Namada Node information periodically.\n" +
    "You can use commands such as:\n\n" +
    "/on <interval> - To enable automatic data fetching with a specified interval.\n" +
    "/off - To disable automatic data fetching.\n" +
    "/stats - To manually fetch and send blockchain-related data.\n" +
    "/set_region <region> - To set the time region. Supported regions: utc-12 to utc+14.\n" +
    "/get_region - To get the currently set region.\n" +
    "/server - To get server statistics including disk, memory, and CPU usage.\n" +
    "/help - To view the list of available commands.\n\n" +
    "Enjoy using this bot!";

  bot.sendMessage(chatId, startMessage);
});




console.log("Namada Bot is running.....\nType /help on Bot to start.")
