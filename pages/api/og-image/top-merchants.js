import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch'; // ADDED: For fetching data

// 圖像參數配置
const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#FFFFFF';
const TEXT_COLOR = '#333333';
const ACCENT_COLOR = '#4A90E2';
const LOGO_URL = 'https://pcc.mlwmlw.org/static/favicon.ico'; // 替換為實際Logo URL

// 格式化數字為金額格式 (緊湊型)
function formatAmount(amount) {
  return new Intl.NumberFormat('zh-TW', { 
    notation: "compact", 
    compactDisplay: "short",
    minimumFractionDigits: 0, // 根據需要調整小數位數
    maximumFractionDigits: 1  // 最多顯示一位小數
  }).format(amount);
}

// 截斷文字並加上省略號
function truncateText(context, text, x, y, maxWidth) {
  let truncatedText = String(text);
  if (context.measureText(truncatedText).width <= maxWidth) {
    context.fillText(truncatedText, x, y);
    return;
  }

  while (context.measureText(truncatedText + '...').width > maxWidth && truncatedText.length > 0) {
    truncatedText = truncatedText.slice(0, -1);
  }
  context.fillText(truncatedText + '...', x, y);
}

export default async function handler(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    let topMerchants = [];

    try {
      const response = await fetch(`https://pcc.mlwmlw.org/api/rank/merchants/sum/${currentYear}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch top merchants data: ${response.status}`);
      }
      const rawData = await response.json();
      // Assuming the API returns an array of objects with `merchant.name` and `sum`
      // And we need to take top 10
      topMerchants = rawData.slice(0, 8); // Corrected to top 8

      if (!topMerchants || topMerchants.length === 0) {
        throw new Error('No top merchants data found or data is empty');
      }
    } catch (fetchError) {
      console.error("Error fetching top merchants data:", fetchError);
      // Fallback to a default/error image or simpler display
      const canvas = createCanvas(WIDTH, HEIGHT);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 40px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`無法載入 ${currentYear}年 廠商排行資料`, WIDTH / 2, HEIGHT / 2 - 30);
      ctx.font = '28px Arial, sans-serif';
      ctx.fillText(fetchError.message, WIDTH / 2, HEIGHT / 2 + 30);
      
      const buffer = canvas.toBuffer('image/png');
      res.setHeader('Content-Type', 'image/png');
      res.status(500).send(buffer);
      return;
    }
    
    // 創建畫布
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    
    // 繪製背景
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // 繪製頂部漸層條
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
    gradient.addColorStop(0, ACCENT_COLOR);
    gradient.addColorStop(1, '#6BBFFF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, 80);
    
    // 載入網站Logo
    try {
      const logo = await loadImage(LOGO_URL);
      ctx.drawImage(logo, 40, 15, 50, 50); // Adjusted X, Y, Width, Height
    } catch (e) {
      // 畫一個替代圖形
      ctx.fillStyle = ACCENT_COLOR; // Fallback background for logo area
      ctx.fillRect(40, 15, 50, 50); // Adjusted X, Y, Width, Height
      ctx.fillStyle = "#FFFFFF"; // White text for fallback
      ctx.font = 'bold 24px Arial'; // Adjusted font size for fallback
      ctx.textAlign = 'center'; // Center fallback text
      ctx.textBaseline = 'middle'; // Center fallback text
      ctx.fillText("PCC", 40 + 50 / 2, 15 + 50 / 2); // Centered fallback text
      ctx.textAlign = 'left'; // Reset textAlign
      ctx.textBaseline = 'alphabetic'; // Reset textBaseline
    }
    
    // 繪製標題 (網站名稱)
    ctx.font = 'bold 32px Arial, sans-serif'; // Adjusted font size
    ctx.fillStyle = '#FFFFFF'; // White color for title
    ctx.fillText('開放政府標案', 110, 45); // Adjusted X, Y (Y to align better with new logo Y+height/2)

    // 繪製網站URL
    ctx.font = '18px Arial, sans-serif'; // Adjusted font size
    ctx.fillStyle = '#EEEEEE'; // Light gray color for URL
    ctx.fillText('https://pcc.mlwmlw.org', 110, 68); // Adjusted X, Y (below title)
    
    // 繪製頁面主標題 (年度資訊)
    ctx.font = 'bold 48px Arial, sans-serif'; // Adjusted font size for main title
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillText(`${currentYear}年 政府標案得標廠商前10名`, 60, 150); // Adjusted Y position
    
    // 繪製說明
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText('依據得標金額排序', 60, 200); // Adjusted Y position
    
    // 繪製廠商列表
    ctx.font = 'bold 28px Arial, sans-serif';
    let yPosition = 250; // Adjusted Y position
    
    topMerchants.forEach((merchant, index) => {
      // 繪製排名
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(`${index + 1}.`, 60, yPosition);
      
      // 繪製廠商名稱
      const merchantName = merchant.merchant ? merchant.merchant.name : '未知廠商';
      const merchantNameX = 100;
      const amountX = WIDTH - 60;
      // 估算金額最大寬度約 250-300px，加上與廠商名稱的間距 20px
      const merchantNameMaxWidth = amountX - merchantNameX - 280; // 1140 - 100 - 280 = 760. Let's use a slightly smaller value for safety.
      truncateText(ctx, merchantName, merchantNameX, yPosition, 700); 
      
      // 繪製金額
      ctx.fillStyle = ACCENT_COLOR;
      ctx.textAlign = 'right';
      ctx.fillText(formatAmount(merchant.sum), WIDTH - 60, yPosition);
      ctx.textAlign = 'left';
      
      yPosition += 50;
    });
    
    // 輸出圖像
    const buffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
    
  } catch (error) {
    console.error('生成OG圖像錯誤:', error);
    res.status(500).json({ error: '生成圖像時發生錯誤', details: error.message });
  }
}
