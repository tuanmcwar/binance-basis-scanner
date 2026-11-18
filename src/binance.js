
import axios from 'axios';
import { config } from './config.js';

const api = axios.create({
  baseURL: config.binanceRest,
  timeout: 20000
});

export async function getSymbols() {
  const { data } = await api.get('/fapi/v1/exchangeInfo');

  return data.symbols
    .filter(item =>
      item.contractType === 'PERPETUAL' &&
      item.status === 'TRADING' &&
      item.quoteAsset === 'USDT' &&
      item.marginAsset === 'USDT'
    )
    .map(item => item.symbol);
}

export async function getMarketData() {
  // Giá giao dịch Futures gần nhất
  const futuresRequest = api.get('/fapi/v1/ticker/price');

  // Index Price và Funding Rate
  const indexRequest = api.get('/fapi/v1/premiumIndex');

  const [futuresResponse, indexResponse] =
    await Promise.all([
      futuresRequest,
      indexRequest
    ]);

  const futuresMap = new Map();
  const indexMap = new Map();

  for (const item of futuresResponse.data) {
    const price = Number(item.price);

    if (Number.isFinite(price) && price > 0) {
      futuresMap.set(item.symbol, {
        price,
        priceText: item.price
      });
    }
  }

  for (const item of indexResponse.data) {
    const price = Number(item.indexPrice);

    if (Number.isFinite(price) && price > 0) {
      const rawFunding = item.lastFundingRate;

      const fundingRate =
        rawFunding != null &&
        rawFunding !== '' &&
        Number.isFinite(Number(rawFunding))
          ? Number(rawFunding) * 100
          : null;

      indexMap.set(item.symbol, {
        price,
        priceText: item.indexPrice,

        // Funding Rate tính theo %
        fundingRate,

        // Giá trị gốc từ Binance
        fundingRateText: rawFunding ?? null
      });
    }
  }

  return {
    futuresMap,
    indexMap
  };
}
