import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch'; // ADDED: For fetching data

// 圖像參數配置
const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#FFFFFF';
const TEXT_COLOR = '#333333';
const ACCENT_COLOR = '#4A90E2';
const LOGO_URL = 'https://pcc.mlwmlw.org/static/favicon.ico'; // 替換為實際Logo URL

// 格式化數字為金額格式
function formatAmount(amount) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// 繪製多行文字
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  if (!text) return y;
  // Ensure text is a string before splitting
  const words = String(text).split(' ');
  let line = '';
  let testLine = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      lineCount++;
      
      if (lineCount >= 3) {
        if (n < words.length - 1) {
          context.fillText(line + '...', x, y);
        } else {
          context.fillText(line, x, y);
        }
        return y + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  
  context.fillText(line, x, y);
  return y + lineHeight;
}

export default async function handler(req, res) {
  try {
    const { id, name: queryName } = req.query;
    const merchantId = id || queryName;

    if (!merchantId) {
      throw new Error('Merchant ID or name is required');
    }

    // Fetch merchant data
    let merchantData;
    try {
      const response = await fetch(`https://pcc.mlwmlw.org/api/merchant/${encodeURIComponent(merchantId)}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch merchant data: ${response.status}`);
      }
      merchantData = await response.json();
      if (!merchantData || !merchantData.tenders) {
        throw new Error('No tender data found for merchant');
      }
    } catch (fetchError) {
      console.error("Error fetching merchant data:", fetchError);
      // Fallback to a default/error image or simpler display
      const canvas = createCanvas(WIDTH, HEIGHT);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.textAlign = 'center';
      wrapText(ctx, `無法載入廠商資料: ${merchantId}`, WIDTH / 2, HEIGHT / 2 - 50, WIDTH - 100, 60);
      wrapText(ctx, fetchError.message, WIDTH / 2, HEIGHT / 2 + 20, WIDTH - 100, 50);
      
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
    
    // 繪製標題
    ctx.font = 'bold 32px Arial, sans-serif'; // Adjusted font size
    ctx.fillStyle = '#FFFFFF'; // White color for title
    ctx.fillText('開放政府標案', 110, 45); // Adjusted X, Y (Y to align better with new logo Y+height/2)

    // 繪製網站URL
    ctx.font = '18px Arial, sans-serif'; // Adjusted font size
    ctx.fillStyle = '#EEEEEE'; // Light gray color for URL
    ctx.fillText('https://pcc.mlwmlw.org', 110, 68); // Adjusted X, Y (below title)
    
    // 繪製廠商名稱
    const merchantName = merchantData.name || merchantId;
    ctx.font = 'bold 48px Arial, sans-serif'; // Reduced font size from 56px
    ctx.fillStyle = ACCENT_COLOR;
    ctx.textBaseline = 'top'; // Set textBaseline to top for merchant name
    let currentY = wrapText(ctx, merchantName, 60, 120, WIDTH - 120, 60); // Adjusted Y to 120, reduced lineHeight to 60
    ctx.textBaseline = 'alphabetic'; // Reset textBaseline
    currentY += 30; // Increased space from 20 to 30

    // 計算年度得標金額
    const yearlyData = merchantData.tenders.reduce((acc, tender) => {
      if (!tender.publish || !tender.award || !tender.award.merchants) {
        return acc;
      }
      const year = new Date(tender.publish).getFullYear();
      tender.award.merchants.forEach(m => {
        // Ensure merchantData._id exists, otherwise use merchantId for comparison if it's a name
        const idToCompare = merchantData._id || merchantId;
        if ((m._id === idToCompare || m.name === idToCompare) && m.amount) {
          acc[year] = (acc[year] || 0) + Number(m.amount);
        }
      });
      return acc;
    }, {});

    const sortedYears = Object.keys(yearlyData).map(Number).sort((a, b) => b - a).slice(0, 5).reverse(); // Get last 5 years, ascending

    // 繪製統計資訊 (總案件數 & 總金額)
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = TEXT_COLOR;
    
    const totalTenderCount = merchantData.tenders.length;
    ctx.fillText(`總得標案件數: ${totalTenderCount}`, 60, currentY);
    
    let overallTotalAmount = 0;
    Object.values(yearlyData).forEach(amount => overallTotalAmount += amount);
    ctx.fillText(`總得標金額: ${formatAmount(overallTotalAmount)}`, 450, currentY);
    currentY += 80; // Increased space from 60 to 80

    // 繪製長條圖
    if (sortedYears.length > 0) {
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('年度得標金額趨勢:', 60, currentY);
      currentY += 50; // Increased space from 40 to 50

      const chartStartX = 80;
      const chartStartY = currentY;
      const chartHeight = 190; // Increased chart height
      const chartWidth = WIDTH - chartStartX - 80;
      const barGap = 20;
      const barWidth = (chartWidth - (barGap * (sortedYears.length -1))) / sortedYears.length;
      
      const maxYearlyAmount = Math.max(...sortedYears.map(year => yearlyData[year]), 0);

      if (maxYearlyAmount > 0) {
        sortedYears.forEach((year, index) => {
          const amount = yearlyData[year];
          const barHeight = (amount / maxYearlyAmount) * chartHeight;
          const x = chartStartX + index * (barWidth + barGap);
          const y = chartStartY + chartHeight - barHeight;

          // Draw bar
          ctx.fillStyle = ACCENT_COLOR;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Draw year label
          ctx.fillStyle = TEXT_COLOR;
          ctx.font = '22px Arial, sans-serif';
          ctx.textAlign = 'center';
          // Adjusted Y position for year label to be slightly higher
          ctx.fillText(String(year), x + barWidth / 2, chartStartY + chartHeight + 22); 
          
          // Draw amount label on top of bar
          ctx.font = 'bold 18px Arial, sans-serif';
          const amountText = new Intl.NumberFormat('zh-TW', { notation: "compact", compactDisplay: "short" }).format(amount);
          ctx.fillText(amountText, x + barWidth / 2, y - 8);
        });
      } else {
         ctx.font = '24px Arial, sans-serif';
         ctx.textAlign = 'left';
         ctx.fillText('尚無年度得標金額資料可供顯示。', chartStartX, chartStartY + chartHeight / 2);
      }
      // Adjusted space after chart to ensure year labels are not cut off
      // Year label font is 22px, plus some padding.
      currentY += chartHeight + 22 + 8; // chartHeight + yearLabelHeight + reduced paddingAfterLabel
    } else {
      ctx.font = '24px Arial, sans-serif';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('尚無年度得標金額資料。', 60, currentY);
      currentY += 40;
    }
    
    // 輸出圖像
    const buffer = canvas.toBuffer('image/png');
    
    // MODIFIED: Use Node.js res object to send response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    res.status(200).send(buffer);
    
  } catch (error) {
    console.error("Error generating image:", error); // ADDED: console log for error
    // MODIFIED: Use Node.js res object to send error response
    res.status(500).json({ 
      error: '生成圖像時發生錯誤',
      details: error.message 
    });
  }
}
