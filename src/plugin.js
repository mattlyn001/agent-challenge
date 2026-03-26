/**
 * CryptoSentinel Plugin
 * Provides DeFi/crypto monitoring actions for ElizaOS.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const ETHERSCAN_BASE = "https://api.etherscan.io/api";

function fmt(n, decimals = 2) {
  if (n === null || n === undefined) return "N/A";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUSD(n) {
  if (n === null || n === undefined) return "N/A";
  return "$" + fmt(n);
}

function changeArrow(pct) {
  if (pct === null || pct === undefined) return "";
  return pct >= 0 ? `↑ +${fmt(pct)}%` : `↓ ${fmt(pct)}%`;
}

const COIN_MAP = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana",
  bnb: "binancecoin", ada: "cardano",
  matic: "matic-network", polygon: "matic-network",
  avax: "avalanche-2", link: "chainlink",
  uni: "uniswap", atom: "cosmos",
  nos: "nosana", nosana: "nosana",
  usdc: "usd-coin", usdt: "tether",
  doge: "dogecoin", shib: "shiba-inu",
};

function resolveCoinId(input) {
  return COIN_MAP[input.toLowerCase().trim()] || input.toLowerCase().trim();
}

export const getCryptoPriceAction = {
  name: "GET_CRYPTO_PRICE",
  similes: ["PRICE_CHECK", "CHECK_PRICE", "TOKEN_PRICE", "COIN_PRICE"],
  description: "Fetches current price and stats for a cryptocurrency.",

  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return ["price", "worth", "cost", "how much is", "value of"].some(k => text.includes(k));
  },

  handler: async (_runtime, message, _state, _options, callback) => {
    const text = message.content.text;
    const coinMatch = text.match(
      /\b(btc|eth|sol|bnb|ada|matic|avax|link|uni|atom|nos|nosana|usdc|usdt|doge|shib|bitcoin|ethereum|solana|cardano|polygon|avalanche|chainlink|uniswap|cosmos|dogecoin)\b/i
    );

    if (!coinMatch) {
      callback({ text: "Which coin? Try: 'price of ETH' or 'BTC price'." });
      return;
    }

    const coinId = resolveCoinId(coinMatch[1]);

    try {
      const res = await fetch(`${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`);
      const data = await res.json();

      if (!data || data.length === 0) {
        callback({ text: `No data found for "${coinMatch[1]}".` });
        return;
      }

      const c = data[0];
      const ath_diff = (((c.current_price - c.ath) / c.ath) * 100).toFixed(1);

      callback({
        text: [
          `**${c.name} (${c.symbol.toUpperCase()})**`,
          `Price: ${fmtUSD(c.current_price)}  ${changeArrow(c.price_change_percentage_24h)}`,
          `24h High: ${fmtUSD(c.high_24h)}  |  24h Low: ${fmtUSD(c.low_24h)}`,
          `Market Cap: ${fmtUSD(c.market_cap)}  (Rank #${c.market_cap_rank})`,
          `24h Volume: ${fmtUSD(c.total_volume)}`,
          `ATH: ${fmtUSD(c.ath)}  (${ath_diff}% from ATH)`,
          `_Data: CoinGecko_`,
        ].join("\n")
      });
    } catch (err) {
      callback({ text: `Error fetching price: ${err.message}` });
    }
  },

  examples: [[
    { user: "{{user1}}", content: { text: "What's the price of ETH?" } },
    { user: "CryptoSentinel", content: { text: "Fetching ETH price...", action: "GET_CRYPTO_PRICE" } },
  ]],
};

export const getWalletBalanceAction = {
  name: "GET_WALLET_BALANCE",
  similes: ["WALLET_CHECK", "CHECK_WALLET", "WALLET_BALANCE"],
  description: "Fetches ETH balance and recent transactions for a wallet.",

  validate: async (_runtime, message) => {
    return /0x[a-fA-F0-9]{40}/.test(message.content.text);
  },

  handler: async (_runtime, message, _state, _options, callback) => {
    const walletMatch = message.content.text.match(/0x[a-fA-F0-9]{40}/);
    if (!walletMatch) {
      callback({ text: "Please provide a valid Ethereum address (starts with 0x)." });
      return;
    }

    const address = walletMatch[0];
    const apiKey = process.env.ETHERSCAN_API_KEY || "";
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    try {
      const balRes = await fetch(`${ETHERSCAN_BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`);
      const balData = await balRes.json();
      const ethBalance = balData.status === "1" ? (parseInt(balData.result) / 1e18).toFixed(4) : "N/A";

      let ethPrice = 0;
      try {
        const priceRes = await fetch(`${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=usd`);
        const priceData = await priceRes.json();
        ethPrice = priceData?.ethereum?.usd || 0;
      } catch (_) {}

      const ethUSD = ethBalance !== "N/A" && ethPrice ? fmtUSD(parseFloat(ethBalance) * ethPrice) : "N/A";

      const txRes = await fetch(`${ETHERSCAN_BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${apiKey}`);
      const txData = await txRes.json();

      let txLines = "\n\n_No recent transactions found._";
      if (txData.status === "1" && txData.result.length > 0) {
        txLines = "\n\n**Recent Transactions:**\n" + txData.result.map(tx => {
          const val = (parseInt(tx.value) / 1e18).toFixed(4);
          const dir = tx.from.toLowerCase() === address.toLowerCase() ? "OUT ↑" : "IN ↓";
          const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return `  ${dir} ${val} ETH · ${date}`;
        }).join("\n");
      }

      callback({
        text: `**Wallet: ${shortAddr}**\nETH Balance: ${ethBalance} ETH (~${ethUSD})${txLines}\n\n_[View on Etherscan](https://etherscan.io/address/${address})_`
      });
    } catch (err) {
      callback({ text: `Error fetching wallet: ${err.message}` });
    }
  },

  examples: [[
    { user: "{{user1}}", content: { text: "Check wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
    { user: "CryptoSentinel", content: { text: "Fetching wallet data...", action: "GET_WALLET_BALANCE" } },
  ]],
};

export const getMarketSummaryAction = {
  name: "GET_MARKET_SUMMARY",
  similes: ["MARKET_OVERVIEW", "MARKET_DATA", "TOP_COINS", "MARKET_SUMMARY"],
  description: "Fetches top 10 cryptocurrencies by market cap.",

  validate: async (_runtime, message) => {
    const text = message.content.text.toLowerCase();
    return ["market", "overview", "summary", "top coins", "top crypto"].some(k => text.includes(k));
  },

  handler: async (_runtime, _message, _state, _options, callback) => {
    try {
      const res = await fetch(`${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`);
      const data = await res.json();

      if (!data || data.length === 0) {
        callback({ text: "Couldn't fetch market data. Try again shortly." });
        return;
      }

      const gainers = data.filter(c => c.price_change_percentage_24h > 0).length;
      const losers = data.filter(c => c.price_change_percentage_24h < 0).length;

      const coinLines = data.map((c, i) => {
        const change = c.price_change_percentage_24h;
        const arrow = change >= 0 ? "↑" : "↓";
        const sign = change >= 0 ? "+" : "";
        return `${i + 1}. **${c.symbol.toUpperCase()}**  ${fmtUSD(c.current_price)}  ${arrow} ${sign}${fmt(change)}%`;
      }).join("\n");

      callback({
        text: [
          "**📊 Crypto Market Summary**",
          `Movers: ${gainers} ↑ up  |  ${losers} ↓ down`,
          "",
          coinLines,
          "",
          "_Data: CoinGecko_",
        ].join("\n")
      });
    } catch (err) {
      callback({ text: `Error fetching market data: ${err.message}` });
    }
  },

  examples: [[
    { user: "{{user1}}", content: { text: "Give me a market summary" } },
    { user: "CryptoSentinel", content: { text: "Pulling market data...", action: "GET_MARKET_SUMMARY" } },
  ]],
};

export const cryptoSentinelPlugin = {
  name: "cryptosentinel",
  description: "DeFi & crypto monitoring — prices, wallets, market summaries",
  actions: [getCryptoPriceAction, getWalletBalanceAction, getMarketSummaryAction],
  providers: [],
  evaluators: [],
};

export default cryptoSentinelPlugin;
