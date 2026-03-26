# 🛡️ CryptoSentinel — Personal DeFi Monitor Agent

> A personal AI agent for tracking crypto portfolios, monitoring price movements,
> and exploring on-chain data — built with ElizaOS and deployed on Nosana's
> decentralized GPU network.

**Nosana x ElizaOS Agent Challenge Submission**

---

## 🎯 What It Does

CryptoSentinel is a conversational DeFi monitoring agent. Talk to it naturally:

| You say | Agent does |
|---|---|
| "What's the price of ETH?" | Fetches live price, 24h change, market cap, ATH |
| "Check wallet 0x1234...abcd" | Returns ETH balance + last 5 transactions |
| "Give me a market summary" | Top 10 coins by market cap with 24h changes |
| "How is SOL doing?" | Full token stats for any supported coin |

---

## 🏗️ Architecture
┌─────────────────────────────────────────┐
│           Nosana GPU Network            │
│  ┌───────────────────────────────────┐  │
│  │         Docker Container          │  │
│  │  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ React UI │◄►│ ElizaOS Agent │  │  │
│  │  └──────────┘  └───────┬───────┘  │  │
│  │              ┌─────────▼────────┐ │  │
│  │              │ CryptoSentinel   │ │  │
│  │              │ Plugin           │ │  │
│  │              │ • CRYPTO_PRICE   │ │  │
│  │              │ • WALLET_BALANCE │ │  │
│  │              │ • MARKET_SUMMARY │ │  │
│  │              └─────────┬────────┘ │  │
│  └────────────────────────┼──────────┘  │
└───────────────────────────┼─────────────┘
│
┌─────────────────┼──────────────┐
│                 │              │
┌──────▼─────┐  ┌────────▼───┐  ┌──────▼─────┐
│ Qwen3.5-27B│  │ CoinGecko  │  │ Etherscan  │
│ (Nosana)   │  │ (free API) │  │ (free API) │
└────────────┘  └────────────┘  └────────────┘
---

## 🚀 Quick Start

### Prerequisites
- Node.js 23+
- Docker
- A Nosana account at nosana.com
- Free Etherscan API key at etherscan.io/apis

### 1. Clone & Configure

```bash
git clone https://github.com/YOUR-USERNAME/agent-challenge
cd agent-challenge
cp .env.example .env
# Edit .env with your API keys
2. Install Dependencies
npm install -g @elizaos/cli
npm install
cd frontend && npm install && cd ..
3. Run Locally
# Terminal 1 - Start agent
npm run dev

# Terminal 2 - Start frontend
npm run frontend
Open http://localhost:5173 to use CryptoSentinel.
🐳 Docker Build
# Build
docker build -t cryptosentinel:latest .

# Run locally
docker run -p 3000:3000 \
  -e NOSANA_MODEL_ENDPOINT=your_endpoint \
  -e ETHERSCAN_API_KEY=your_key \
  cryptosentinel:latest

# Push to Docker Hub
docker push YOUR_USERNAME/cryptosentinel:latest
⚡ Deploy to Nosana
Get free credits at nosana.com/builders-credits
Update nosana-job.yaml with your Docker Hub username
Go to deploy.nosana.com
Upload nosana-job.yaml and set environment variables
Submit job and get your live URL
⚙️ Environment Variables
Variable
Required
Description
NOSANA_MODEL_ENDPOINT
✅
Nosana Qwen3.5-27B endpoint URL
ETHERSCAN_API_KEY
Recommended
Free from etherscan.io/apis
PORT
No
Default: 3000
OPENAI_API_KEY
No
Set any string for Nosana endpoint
📁 Project Structure
agent-challenge/
├── characters/
│   └── cryptosentinel.json     # Agent personality
├── src/
│   ├── index.js                # ElizaOS entry point
│   └── plugin.js               # Crypto actions plugin
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Chat UI
│   │   ├── index.css           # Styles
│   │   └── main.jsx            # React entry
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── Dockerfile
├── nosana-job.yaml
└── README.md
🔌 Custom Actions
GET_CRYPTO_PRICE
Triggers on: "price", "worth", "how much is"
Returns: Price, 24h change, market cap, volume, ATH
GET_WALLET_BALANCE
Triggers on: any Ethereum address (0x...)
Returns: ETH balance in USD, last 5 transactions
GET_MARKET_SUMMARY
Triggers on: "market", "overview", "top coins"
Returns: Top 10 coins with prices and 24h changes
🛣️ Roadmap
Persistent price alerts
Multi-wallet portfolio tracking
Gas tracker integration
DeFi protocol TVL monitoring
ERC-20 token balances
Telegram notifications
📄 License
MIT License
🙏 Built With
ElizaOS — Multi-agent framework
Nosana — Decentralized GPU network
CoinGecko API — Free crypto market data
Etherscan API — On-chain Ethereum data
React + Vite — Frontend
Deployed on Nosana's decentralized GPU network.
Your keys, your coins, your compute.
