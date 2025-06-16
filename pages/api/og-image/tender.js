import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch';
import { getApiUrl } from '../../../utils/api';
import dayjs from 'dayjs';

// Image parameters
const WIDTH = 1200;
const HEIGHT = 630;
const BG_COLOR = '#FFFFFF';
const TEXT_COLOR = '#333333';
const ACCENT_COLOR = '#4A90E2';
const LOGO_URL = 'https://pcc.mlwmlw.org/static/favicon.ico'; // Updated path from previous version

function formatAmount(amount) {
  if (amount === null || amount === undefined) return '未提供';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 1) {
  if (!text) return y;
  const words = String(text).split('');
  let line = '';
  let currentY = y;
  let lines = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      if (lines < maxLines - 1) {
        context.fillText(line, x, currentY);
        currentY += lineHeight;
        line = words[i];
        lines++;
      } else {
        // Ensure '...' is added if text is truncated
        let lastLine = line;
        if (words.length > i || metrics.width > maxWidth ) { // if there are more words or current word itself is too long
            while(context.measureText(lastLine + words[i] + '...').width > maxWidth && lastLine.length > 0) {
                lastLine = lastLine.slice(0, -1);
            }
            if(context.measureText(lastLine + words[i] + '...').width <= maxWidth) { // check if current word can be added
                 lastLine += words[i]
            }
            lastLine += '...';
        }
        context.fillText(lastLine, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    context.fillText(line, x, currentY);
  }
  return currentY + lineHeight;
}

export default async function handler(req, res) {
  try {
    const { unit, id } = req.query;
    if (!unit || !id) throw new Error('Tender unit and id are required');

    let tenderData;
    try {
      const apiUrl = getApiUrl(`/tender/${encodeURIComponent(id)}/${encodeURIComponent(unit)}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
      const responseData = await response.json();
      tenderData = Array.isArray(responseData) && responseData.length > 0 ? responseData[0] : null;
      if (!tenderData) throw new Error('No tender data found');
      if (!tenderData.name && tenderData.job_name) tenderData.name = tenderData.job_name;
      if (!tenderData.name) throw new Error('Tender name missing');
    } catch (fetchError) {
      console.error("Data fetch/process error:", fetchError);
      const canvas = createCanvas(WIDTH, HEIGHT);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = TEXT_COLOR; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
      wrapText(ctx, `無法載入標案資料: ${unit}/${id}`, WIDTH/2, HEIGHT/2 - 60, WIDTH-100, 50, 2);
      wrapText(ctx, fetchError.message, WIDTH/2, HEIGHT/2 + 20, WIDTH-100, 40, 2);
      const buffer = canvas.toBuffer('image/png');
      res.setHeader('Content-Type', 'image/png').status(500).send(buffer);
      return;
    }

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
    gradient.addColorStop(0, ACCENT_COLOR); gradient.addColorStop(1, '#6BBFFF');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, 80);

    try {
      const logo = await loadImage(LOGO_URL);
      ctx.drawImage(logo, 40, 15, 50, 50);
    } catch (e) { /* fallback logo */ 
      ctx.fillStyle = ACCENT_COLOR; ctx.fillRect(40, 15, 50, 50);
      ctx.fillStyle = "#FFFFFF"; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText("PCC", 40 + 25, 15 + 25);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; // Reset
    }
    
    ctx.font = 'bold 32px Arial'; ctx.fillStyle = '#FFFFFF';
    ctx.fillText('開放政府標案', 110, 45);
    ctx.font = '18px Arial'; ctx.fillStyle = '#EEEEEE';
    ctx.fillText('https://pcc.mlwmlw.org', 110, 68);

    ctx.textBaseline = 'top';
    let currentY = 120;
    const leftMargin = 60;
    const rightMargin = 60;
    const columnGap = 40;
    const columnWidth = (WIDTH - leftMargin - rightMargin - columnGap) / 2;
    
    const titleFontSize = '48px';
    const titleFont = `bold ${titleFontSize} Arial, sans-serif`;
    const titleLineHeight = parseInt(titleFontSize, 10) + 12; // 48+12=60

    const infoLabelFontSize = '32px';
    const infoTextFontSize = '32px';
    const infoLabelFont = `bold ${infoLabelFontSize} Arial, sans-serif`;
    const infoTextFont = `${infoTextFontSize} Arial, sans-serif`;
    const infoLineHeight = parseInt(infoLabelFontSize, 10) + 8; // 32+8=40
    const infoItemGapY = 15; // Vertical gap between items in a column

    const sectionGapY = 30; // Vertical gap between sections

    // --- 1. Tender Name (Main Title) ---
    ctx.font = titleFont;
    ctx.fillStyle = ACCENT_COLOR;
    currentY = wrapText(ctx, tenderData.name, leftMargin, currentY, WIDTH - leftMargin - rightMargin, titleLineHeight, 2);
    currentY += sectionGapY;

    // --- 2. Main Info Section (Two Columns) ---
    let currentYLeft = currentY;
    let currentYRight = currentY;
    const col1X = leftMargin;
    const col2X = leftMargin + columnWidth + columnGap;

    // Left Column
    // 2a. Unit Name
    ctx.font = infoLabelFont; ctx.fillStyle = TEXT_COLOR;
    const unitLabel = "招標機關：";
    ctx.fillText(unitLabel, col1X, currentYLeft);
    ctx.font = infoTextFont;
    currentYLeft = wrapText(ctx, tenderData.unit || '未提供', col1X + ctx.measureText(unitLabel).width, currentYLeft, columnWidth - ctx.measureText(unitLabel).width, infoLineHeight, 2); // Allow 2 lines for unit name
    currentYLeft += infoItemGapY;

    // 2b. Price (was Budget)
    ctx.font = infoLabelFont; ctx.fillStyle = TEXT_COLOR;
    const priceLabel = "招標金額："; // Label remains the same
    ctx.fillText(priceLabel, col1X, currentYLeft);
    ctx.font = infoTextFont;
    ctx.fillText(formatAmount(tenderData.price), col1X + ctx.measureText(priceLabel).width, currentYLeft);
    currentYLeft += infoLineHeight;
    // currentYLeft += infoItemGapY; // No gap if it's the last item in column

    // Right Column
    // 2c. Publish Date
    ctx.font = infoLabelFont; ctx.fillStyle = TEXT_COLOR;
    const dateLabel = "招標日期：";
    ctx.fillText(dateLabel, col2X, currentYRight);
    ctx.font = infoTextFont;
    ctx.fillText(tenderData.publish ? dayjs(tenderData.publish).format('YYYY-MM-DD') : '未提供', col2X + ctx.measureText(dateLabel).width, currentYRight);
    currentYRight += infoLineHeight;
    currentYRight += infoItemGapY;
    
    // 2d. Category
    ctx.font = infoLabelFont; ctx.fillStyle = TEXT_COLOR;
    const categoryLabel = "分類：";
    ctx.fillText(categoryLabel, col2X, currentYRight);
    ctx.font = infoTextFont;
    currentYRight = wrapText(ctx, tenderData.category || '未提供', col2X + ctx.measureText(categoryLabel).width, currentYRight, columnWidth - ctx.measureText(categoryLabel).width, infoLineHeight, 2); // Allow 2 lines for category
    // currentYRight += infoItemGapY; // No gap if it's the last item in column

    currentY = Math.max(currentYLeft, currentYRight) + sectionGapY;


    // --- 3. Awarded Merchants Section ---
    const merchantTitleFont = `bold ${infoLabelFontSize} Arial, sans-serif`;
    const merchantListFont = `30px Arial, sans-serif`;
    const merchantLineHeight = parseInt(merchantListFont, 10) + 8; // 30+8=38
    const merchantItemGapY = 10;

    ctx.font = merchantTitleFont; ctx.fillStyle = TEXT_COLOR;
    ctx.fillText('得標廠商：', leftMargin, currentY);
    currentY += infoLineHeight; // Use infoLineHeight for consistency with other labels
    
    if (tenderData.award && tenderData.award.merchants && tenderData.award.merchants.length > 0) {
      const merchants = tenderData.award.merchants;
      const maxMerchantsToShow = 3; // Max 3 merchants to show
      ctx.font = merchantListFont;
      const merchantIndent = 20;

      for (let i = 0; i < Math.min(merchants.length, maxMerchantsToShow); i++) {
        if (currentY > HEIGHT - 50) break; // Stop if too close to bottom
        const merchant = merchants[i];
        let merchantName = merchant.name || '未命名廠商';
        if (merchantName.length > 12) {
          merchantName = merchantName.substring(0, 12) + "...";
        }
        const merchantText = `${merchantName}：${formatAmount(merchant.amount)}`;
        currentY = wrapText(ctx, merchantText, leftMargin + merchantIndent, currentY, WIDTH - leftMargin - rightMargin - merchantIndent, merchantLineHeight, 1);
        currentY += merchantItemGapY;
      }
      if (merchants.length > maxMerchantsToShow && currentY <= HEIGHT - 50) {
        ctx.fillText(`...等共 ${merchants.length} 間廠商`, leftMargin + merchantIndent, currentY);
        currentY += merchantLineHeight;
      }
    } else {
      ctx.font = merchantListFont;
      ctx.fillText('尚無得標廠商資訊或未決標', leftMargin + 20, currentY);
      currentY += merchantLineHeight;
    }
    
    ctx.textBaseline = 'alphabetic'; // Reset baseline
    const buffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
    res.status(200).send(buffer);
    
  } catch (error) {
    console.error("Error generating image:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: '生成圖像時發生錯誤', details: error.message });
    }
  }
}
