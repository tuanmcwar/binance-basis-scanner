
import axios from 'axios';
import { config } from './config.js';

const format = (value, digits = 2) =>
  Number(value).toLocaleString('en-US', {
    maximumFractionDigits: digits
  });

const vnTime = () =>
  new Date().toLocaleString('vi-VN', {
    timeZone: config.timezone,
    hour12: false
  });

export async function sendToTelegram(item) {
  const positive = item.side === 'POSITIVE';

  const cleanSymbol = String(item.symbol)
    .replace(/\.P$/i, '')
    .toUpperCase();

  const coin = `${cleanSymbol}.P`;
  const priceText = String(item.futuresPriceText);

  // Funding Rate đã được lấy từ Binance API
  // và truyền sang từ scanner.
  const fundingRate =
    item.fundingRate != null &&
    Number.isFinite(Number(item.fundingRate))
      ? Number(item.fundingRate)
      : null;

  const fundingText =
    fundingRate == null
      ? 'N/A'
      : `${fundingRate > 0 ? '+' : ''}${format(fundingRate, 4)}%`;

  const conclusion = positive
    ? `🟢 KẾT LUẬN: Giá Futures đang cao hơn Index ${format(Math.abs(item.basisRate), 4)}%.`
    : `🔴 KẾT LUẬN: Giá Futures đang thấp hơn Index ${format(Math.abs(item.basisRate), 4)}%.`;

  // Link CoinGlass không có .P
  const chart =
    `https://www.coinglass.com/tv/vi/Binance_${cleanSymbol}`;

  const message = [
    '🚨 BINANCE FUTURES BASIS ALERT',
    '━━━━━━━━━━━━━━━━━━',
    `🪙 Coin: ${coin}`,
    '⏱ Scan Cycle: 1H',
    '',
    positive
      ? '🟢 POSITIVE BASIS'
      : '🔴 NEGATIVE BASIS',
    '',
    `📊 Basis Rate: ${item.basisRate > 0 ? '+' : ''}${format(item.basisRate, 4)}%`,
    `💰 Futures Price: ${priceText}`,
    `📍 Index Price: ${item.indexPriceText}`,
    '',
    `💸 Funding Rate: ${fundingText}`,
    '',
    `🕒 Thời gian quét: ${vnTime()} (VN)`,
    conclusion,
    ''
  ].join('\n');

  console.log(
    `🚨 ${coin} | Basis: ${format(item.basisRate, 4)}% | Funding: ${fundingText}`
  );

  if (!config.telegramToken || !config.telegramChatId) {
    console.log(message);
    return;
  }

  const url =
    `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;

  const { data } = await axios.post(
    url,
    {
      chat_id: config.telegramChatId,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 Copy tên COIN',
              copy_text: {
                text: coin
              }
            },
            {
              text: '🤖 Coin',
              copy_text: {
                text: cleanSymbol
              }
            },
            {
              text: '📈 CoinGlass',
              url: chart
            }
          ]
        ]
      }
    },
    {
      timeout: 15000
    }
  );

  if (!data.ok) {
    throw new Error(
      data.description || 'Telegram send failed'
    );
  }
}
