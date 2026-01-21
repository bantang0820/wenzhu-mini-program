// pages/card/card.js - 简化版（用于调试）
Page({
  data: {
    scenario: null,
    stormTime: null,
    shiftTime: null,
    anchorTime: null,
    stormText: '',
    shiftText: '',
    anchorText: '',
    userInfo: { nickName: '我' },
    cardImage: '',
    showCard: false,
  },

  onLoad(options) {
    console.log('情绪切片页面加载');

    const eventChannel = this.getOpenerEventChannel();

    if (eventChannel) {
      eventChannel.on('acceptData', (data) => {
        console.log('接收到的数据:', data);

        const { scenario, stormTime, shiftTime, anchorTime, allMantras } = data;

        // 将5句话整合成一篇连贯的日记
        const diaryContent = this.transformToDiary(allMantras, scenario);

        this.setData({
          scenario: scenario,
          anchorTime: anchorTime || new Date(),
          diaryContent: diaryContent,
          userInfo: { nickName: '我' }
        });

        // 生成卡片
        setTimeout(() => {
          this.generateWarmCard();
        }, 300);
      });
    } else {
      // 直接使用默认数据
      const now = new Date();
      const defaultMantras = [
        '此刻，我原谅自己刚才的失控，那只是杏仁核在接管身体。',
        '转念：我不需要为孩子的每一个情绪负责，我先照顾好自己。',
        '看见：这次冲突不是灾难，而是我们练习和好的机会。',
        '尝试：我决定蹲下来，给他一个拥抱，说声对不起。',
        '确认：我是一个真实的人，我在努力成为更好的容器。'
      ];

      const diaryContent = this.transformToDiary(defaultMantras, { title: '没忍住吼了' });

      this.setData({
        scenario: { title: '没忍住吼了', id: '001' },
        anchorTime: now,
        diaryContent: diaryContent,
        userInfo: { nickName: '我' }
      });

      setTimeout(() => {
        this.generateWarmCard();
      }, 300);
    }
  },

  // 将5句话转换成连贯的日记
  transformToDiary(mantras, scenario) {
    // 获取用户名
    const userName = this.data.userInfo?.nickName || '小美';

    // 如果没有5句话，返回默认日记
    if (!mantras || mantras.length < 5) {
      return `今天……还是没忍住，对他吼了。

看到那一地狼藉，火气"噌"地一下就上来了。等我吼完，看到他那个被吓住的、怯生生的小眼神，我的心瞬间就后悔了。

我深吸了几口气，告诉自己：**我也是第一次当妈妈，我也有情绪失控的权利。**

等平静了一些，我走进房间，蹲在他面前，张开手。他犹豫了一下，还是扑进了我怀里。我说："对不起，妈妈刚才太凶了。"

育儿真是一场修行啊，我又跌倒了一次。但庆幸的是，**我学会了不再长时间陷入自责，而是选择主动去修补裂痕。**

爱在流动，我们都在学着长大。

—— ${userName}`;
    }

    // 将5句话整合成日记格式
    const diary = `今天……还是没忍住，对他吼了。

看到那一地狼藉，火气"噌"地一下就上来了。等我吼完，看到他那个被吓住的、怯生生的小眼神，我的心瞬间就后悔了。

我深吸了几口气，告诉自己：**${mantras[0].replace(/^[（\(][^））]*[））][:：]?\s*/, '')}**

~~我怎么又变成那个糟糕的妈妈了？~~ 不，我要停下来。

**${mantras[1].replace(/^[（\(][^））]*[））][:：]?\s*/, '')}**

等平静了一些，我走进房间，蹲在他面前，张开手。他犹豫了一下，还是扑进了我怀里。

我说："对不起，妈妈刚才太凶了，吓到你了吧？"

**${mantras[2].replace(/^[（\(][^））]*[））][:：]?\s*/, '')}**

我们拉钩约定，下次我要爆炸前，先去阳台冷静一分钟。

育儿真是一场修行啊，我又跌倒了一次。但庆幸的是，**${mantras[3].replace(/^[（\(][^））]*[））][:：]?\s*/, '')}**

**${mantras[4].replace(/^[（\(][^））]*[））][:：]?\s*/, '')}**

爱在流动，我们都在学着长大。


—— ${userName}`;

    return diary;
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  },

  // 生成温情卡片
  generateWarmCard() {
    console.log('开始生成温情卡片...');
    wx.showLoading({ title: '生成中...', mask: true });

    const query = wx.createSelectorQuery();
    query.select('#cardCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('Canvas查询结果:', res);

        if (!res || !res[0]) {
          console.error('Canvas未找到');
          wx.hideLoading();
          wx.showToast({ title: 'Canvas未找到', icon: 'none' });
          return;
        }

        const canvas = res[0].node;
        if (!canvas) {
          console.error('Canvas节点为null');
          wx.hideLoading();
          wx.showToast({ title: 'Canvas初始化失败', icon: 'none' });
          return;
        }

        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = 750;
        const height = 1334; // iPhone标准比例

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        console.log('Canvas准备完成，开始绘制');

        // 绘制温情卡片
        this.drawWarmCard(ctx, width, height, canvas);
      });
  },

  // 绘制温情卡片（精致风格）
  drawWarmCard(ctx, width, height, canvas) {
    const { scenario, anchorTime, diaryContent, userInfo } = this.data;

    // ============ 1. 背景：温暖渐变 + 光晕 ============
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#FFFEF9'); // 极浅米白
    bgGradient.addColorStop(1, '#F9F6F0'); // 浅暖灰
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 添加细腻纸张纹理效果
    this.addFinePaperTexture(ctx, width, height);

    // 添加光影效果（左上角暖光晕，模拟台灯）
    const lightGradient = ctx.createRadialGradient(100, 100, 0, 150, 150, 400);
    lightGradient.addColorStop(0, 'rgba(255, 248, 220, 0.15)');
    lightGradient.addColorStop(1, 'rgba(255, 248, 220, 0)');
    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, width, height);

    // ============ 2. 装饰元素 ============
    // 左上角装饰（极简色块）
    ctx.fillStyle = 'rgba(255, 183, 178, 0.15)';
    this.roundRect(ctx, 25, 25, 45, 45, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(181, 234, 215, 0.15)';
    this.roundRect(ctx, 32, 32, 45, 45, 6);
    ctx.fill();

    // 右上角装饰（圆形）
    ctx.fillStyle = 'rgba(253, 223, 159, 0.15)';
    ctx.beginPath();
    ctx.arc(width - 50, 50, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(199, 206, 234, 0.15)';
    ctx.beginPath();
    ctx.arc(width - 40, 60, 18, 0, Math.PI * 2);
    ctx.fill();

    // ============ 3. 顶部：日期与天气 ============
    const dateInfo = this.formatDateInfo(anchorTime);

    // 日期（左上）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.font = '400 15px "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.fillText(dateInfo.fullDate, 100, 55);
    ctx.fillText(dateInfo.weekday, 100, 80);

    // 天气（右上）
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🌧️→🌤️', width - 100, 70);

    // ============ 4. 主标题区 ============
    // 英文副标题
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'italic 400 18px "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mindful Parenting Diary', width / 2, 155);

    // 中文主标题（手写风格）
    ctx.fillStyle = '#2C3E50';
    ctx.font = '700 50px "STKaiti", "KaiTi", "cursive", serif'; // 使用手写字体
    ctx.textAlign = 'center';
    ctx.fillText('正念育儿日记', width / 2, 220);

    // 装饰线（加粗）
    const lineWidth = 100;
    ctx.strokeStyle = 'rgba(44, 62, 80, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - lineWidth, 252);
    ctx.lineTo(width / 2 + lineWidth, 252);
    ctx.stroke();

    // 装饰点
    ctx.fillStyle = 'rgba(44, 62, 80, 0.3)';
    ctx.beginPath();
    ctx.arc(width / 2 - lineWidth - 25, 252, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width / 2 + lineWidth + 25, 252, 4, 0, Math.PI * 2);
    ctx.fill();

    // ============ 5. 内容区 ============
    const contentMargin = 70;
    const maxWidth = width - contentMargin * 2;
    const startX = contentMargin;
    const startY = 310; // 增加间距，让内容与标题分离更清晰

    this.drawDiaryContent(ctx, diaryContent, startX, startY, maxWidth);

    // ============ 6. 底部：简化版 ============
    const footerY = height - 110; // 稍微减小底部区域高度

    // 分隔线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentMargin, footerY);
    ctx.lineTo(width - contentMargin, footerY);
    ctx.stroke();

    // 小程序码（居中）
    const qrSize = 70;
    const qrY = footerY + 20;

    // 计算整个组合的宽度，使其居中
    // 假设文字宽度约为80px，总宽度约为 qrSize + 20 + 80 = 170px
    const totalWidth = qrSize + 100; // 二维码 + 间距 + 文字
    const startX = width / 2 - totalWidth / 2;

    // 小程序码背景（圆形白色）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(startX + qrSize/2, qrY + qrSize/2, qrSize/2, 0, Math.PI * 2);
    ctx.fill();

    // 小程序码边框
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(startX + qrSize/2, qrY + qrSize/2, qrSize/2, 0, Math.PI * 2);
    ctx.stroke();

    // 右侧两行文字
    const textX = startX + qrSize + 25;
    const textY1 = qrY + 22;
    const textY2 = qrY + 52;

    // 统一字体大小
    ctx.font = '400 15px "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 第一行：扫码加入
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText('扫码加入', textX, textY1);

    // 第二行：稳住· 正念育儿
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText('稳住· 正念育儿', textX, textY2);

    // ============ 生成图片 ============
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res) => {
        console.log('温情卡片生成成功');
        wx.hideLoading();
        this.setData({
          cardImage: res.tempFilePath,
          showCard: true
        });
      },
      fail: (err) => {
        console.error('生成图片失败:', err);
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
      }
    });
  },

  // 绘制日记内容（处理涂改、荧光笔等）
  drawDiaryContent(ctx, content, startX, startY, maxWidth) {
    // 安全检查
    if (!content || typeof content !== 'string') {
      console.error('diaryContent is invalid:', content);
      content = '今天……还是没忍住，对他吼了。\n\n看到那一地狼藉，火气"噌"地一下就上来了。等我吼完，看到他那个被吓住的、怯生生的小眼神，我的心瞬间就后悔了。\n\n我深吸了几口气，告诉自己：**我也是第一次当妈妈，我也有情绪失控的权利。**\n\n~~我怎么又变成那个糟糕的妈妈了？~~ 不，我要停下来。\n\n爱在流动，我们都在学着长大。\n\n—— 小美';
    }

    const paragraphs = content.split('\n\n');
    let currentY = startY;
    const lineHeight = 40; // 增加行高,模拟信纸的呼吸感(从36增加到40)
    const paragraphSpacing = 18; // 进一步减小段落间距

    // 固定最大行数为20行
    const maxLines = 20;

    console.log('内容区参数:', { startY, maxLines });

    let totalLines = 0;

    paragraphs.forEach((paragraph, pIndex) => {
      // 检查行数限制
      if (totalLines >= maxLines - 2) {
        console.warn('内容过多，已达到最大行数限制');
        return; // 停止绘制更多内容
      }

      // 检查是否是落款段落（以——开头）
      const isSignature = paragraph.trim().startsWith('——');

      if (isSignature) {
        // 落款居右显示（始终显示）- 使用手写字体
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = '400 20px "STKaiti", "KaiTi", "cursive", serif';
        ctx.textAlign = 'right';
        ctx.fillText(paragraph.trim(), startX + maxWidth, currentY + lineHeight);
        currentY += lineHeight;
        totalLines += 1;
      } else {
        // 解析段落，识别涂改（~~text~~）、荧光笔高亮（**text**）
        const parts = this.parseDiaryText(paragraph);

        parts.forEach((part) => {
          if (totalLines >= maxLines - 2) return; // 接近限制时停止

          if (part.type === 'strikethrough') {
            // 涂改文字：~~文本~~
            this.drawStrikethroughText(ctx, part.text, startX, currentY, maxWidth);
            const lines = this.wrapTextToLines(ctx, part.text, maxWidth);
            currentY += lines.length * lineHeight;
            totalLines += lines.length;
          } else if (part.type === 'highlight') {
            // 荧光笔高亮：**文本**
            this.drawHighlightedText(ctx, part.text, startX, currentY, maxWidth);
            const lines = this.wrapTextToLines(ctx, part.text, maxWidth);
            currentY += lines.length * lineHeight;
            totalLines += lines.length;
          } else {
            // 普通文字 - 使用手写字体
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.font = '400 22px "STKaiti", "KaiTi", "cursive", serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';

            const lines = this.wrapTextToLines(ctx, part.text, maxWidth);
            lines.forEach((line, lineIndex) => {
              if (totalLines < maxLines - 2) {
                ctx.fillText(line, startX, currentY + lineIndex * lineHeight);
              }
            });
            currentY += lines.length * lineHeight;
            totalLines += lines.length;
          }
        });

        currentY += paragraphSpacing; // 段落间距
      }
    });

    console.log('实际绘制行数:', totalLines, '最大行数:', maxLines);

    // 保存内容结束位置
    this.setData({ contentEndY: currentY });
  },

  // 解析日记文本，识别特殊标记
  parseDiaryText(text) {
    const parts = [];
    let remaining = text;

    while (remaining.length > 0) {
      // 检查涂改标记 ~~text~~
      const strikethroughMatch = remaining.match(/~~([^~]+)~~/);
      if (strikethroughMatch) {
        const beforeStrikethrough = remaining.substring(0, strikethroughMatch.index);
        if (beforeStrikethrough) {
          parts.push({ type: 'normal', text: beforeStrikethrough });
        }
        parts.push({ type: 'strikethrough', text: strikethroughMatch[1] });
        remaining = remaining.substring(strikethroughMatch.index + strikethroughMatch[0].length);
        continue;
      }

      // 检查荧光笔高亮 **text**
      const highlightMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (highlightMatch) {
        const beforeHighlight = remaining.substring(0, highlightMatch.index);
        if (beforeHighlight) {
          parts.push({ type: 'normal', text: beforeHighlight });
        }
        parts.push({ type: 'highlight', text: highlightMatch[1] });
        remaining = remaining.substring(highlightMatch.index + highlightMatch[0].length);
        continue;
      }

      // 没有更多特殊标记
      parts.push({ type: 'normal', text: remaining });
      break;
    }

    return parts;
  },

  // 绘制涂改文字（潦草的多道笔触）
  drawStrikethroughText(ctx, text, x, y, maxWidth) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '400 22px "STKaiti", "KaiTi", "cursive", serif';
    ctx.textAlign = 'left';

    const lines = this.wrapTextToLines(ctx, text, maxWidth);
    lines.forEach((line, lineIndex) => {
      const lineY = y + lineIndex * 40;

      // 绘制潦草的涂改痕迹(2-3道不规则笔触)
      const metrics = ctx.measureText(line);
      const lineWidth = metrics.width;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.2;

      // 第一道笔触(稍微弯曲)
      ctx.beginPath();
      ctx.moveTo(x, lineY - 7);
      const midX = x + lineWidth / 2;
      const curveOffset = Math.random() * 4 - 2; // 随机弯曲
      ctx.quadraticCurveTo(midX, lineY - 7 + curveOffset, x + lineWidth, lineY - 7);
      ctx.stroke();

      // 第二道笔触(稍微偏移,模拟纠结感)
      if (lineWidth > 30) {
        ctx.beginPath();
        const yOffset2 = Math.random() * 3 - 1;
        ctx.moveTo(x + 5, lineY - 7 + yOffset2);
        ctx.quadraticCurveTo(midX, lineY - 7 + curveOffset + yOffset2, x + lineWidth - 5, lineY - 7 + yOffset2);
        ctx.stroke();
      }

      // 第三道笔触(部分区域,更随意)
      if (lineWidth > 50) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        const startPct = Math.random() * 0.2;
        const endPct = 1 - Math.random() * 0.2;
        const yOffset3 = Math.random() * 4 - 2;
        ctx.moveTo(x + lineWidth * startPct, lineY - 7 + yOffset3);
        ctx.lineTo(x + lineWidth * endPct, lineY - 7 + yOffset3);
        ctx.stroke();
      }

      // 绘制文字
      ctx.fillText(line, x, lineY);
    });
  },

  // 绘制荧光笔高亮文字(不规则边缘效果)
  drawHighlightedText(ctx, text, x, y, maxWidth) {
    ctx.font = '400 22px "STKaiti", "KaiTi", "cursive", serif';
    ctx.textAlign = 'left';

    const lines = this.wrapTextToLines(ctx, text, maxWidth);
    lines.forEach((line, lineIndex) => {
      const lineY = y + lineIndex * 40;

      // 绘制不规则荧光笔效果(多层叠加,边缘不规则)
      const metrics = ctx.measureText(line);
      const textWidth = metrics.width;
      const highlightHeight = 26;
      const baseY = lineY - 20;

      // 第一层:主荧光笔效果
      ctx.save();
      ctx.translate(x + textWidth / 2, baseY + highlightHeight / 2);
      ctx.rotate(-0.015 + Math.random() * 0.01); // 轻微随机旋转

      const alpha1 = 0.12 + Math.random() * 0.06;
      ctx.fillStyle = `rgba(255, 235, 59, ${alpha1})`;

      // 绘制不规则矩形(使用贝塞尔曲线模拟手绘边缘)
      ctx.beginPath();
      const halfW = textWidth / 2 + 4;
      const halfH = highlightHeight / 2;
      const roughness = 2; // 边缘粗糙度

      ctx.moveTo(-halfW + Math.random() * roughness, -halfH);
      ctx.quadraticCurveTo(-halfW, -halfH + Math.random() * roughness, -halfW + Math.random() * roughness, 0);
      ctx.quadraticCurveTo(-halfW, halfH - Math.random() * roughness, -halfW + Math.random() * roughness, halfH);
      ctx.lineTo(halfW - Math.random() * roughness, halfH);
      ctx.quadraticCurveTo(halfW, halfH - Math.random() * roughness, halfW - Math.random() * roughness, 0);
      ctx.quadraticCurveTo(halfW, -halfH + Math.random() * roughness, halfW - Math.random() * roughness, -halfH);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 第二层:叠加层,模拟笔触深浅变化
      ctx.save();
      ctx.translate(x + textWidth / 2, baseY + highlightHeight / 2);
      ctx.rotate(-0.02 + Math.random() * 0.015);

      const alpha2 = 0.08 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(255, 235, 59, ${alpha2})`;

      ctx.beginPath();
      const offsetX = Math.random() * 3 - 1.5;
      const offsetY = Math.random() * 2 - 1;

      ctx.moveTo(-halfW + 2 + offsetX, -halfH + offsetY);
      ctx.lineTo(halfW - 2 + offsetX, -halfH + offsetY);
      ctx.lineTo(halfW - 2 + offsetX, halfH + offsetY);
      ctx.lineTo(-halfW + 2 + offsetX, halfH + offsetY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 绘制文字
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillText(line, x, lineY);
    });
  },

  // 绘制天气图标（手绘风格）
  drawWeatherIcon(ctx, x, y) {
    ctx.strokeStyle = '#8B7E74';
    ctx.fillStyle = '#FFD700';
    ctx.lineWidth = 1.5;

    // 太阳（手绘圆）
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();

    // 光芒（手绘射线）
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const innerR = 15;
      const outerR = 22;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
      ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  },

  // 绘制雨转晴图标（手绘风格）
  drawWeatherTransitionIcon(ctx, x, y) {
    // 左边：雨云
    ctx.fillStyle = 'rgba(139, 126, 116, 0.4)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🌧️', x - 15, y + 6);

    // 箭头
    ctx.strokeStyle = '#8B7E74';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.stroke();

    // 右边：晴日
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌤️', x + 15, y + 6);
  },

  // 绘制装饰星星（参考案例3）
  drawDecorativeStars(ctx, centerX, y) {
    const stars = ['⭐', '✨', '⭐'];
    const spacing = 60;
    const totalWidth = (stars.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;

    stars.forEach((star, index) => {
      ctx.fillStyle = 'rgba(92, 85, 74, 0.3)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(star, startX + index * spacing, y);
    });
  },

  // 绘制底部图标（参考案例2和5：茶杯、鸟、叶子等生活化元素）
  drawBottomIcons(ctx, centerX, y) {
    const icons = ['🍃', '☕', '🕊️'];
    const spacing = 70;
    const totalWidth = (icons.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;

    icons.forEach((icon, index) => {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, startX + index * spacing, y);
    });
  },

  // 荧光笔高亮效果
  highlightText(ctx, x, y, width, height) {
    ctx.save();
    // 稍微旋转，模拟手绘
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(-0.02);
    ctx.fillRect(-width/2 - 2, -height/2, width + 4, height);
    ctx.restore();
  },

  // 添加细腻纸张纹理效果
  addFinePaperTexture(ctx, width, height) {
    ctx.save();
    // 更多但更细腻的噪点
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 0.8;
      ctx.fillStyle = `rgba(139, 126, 116, ${Math.random() * 0.015})`;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  },

  // 绘制圆角矩形
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  },

  // 短日期格式
  formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  },

  // 日期详细信息
  formatDateInfo(date) {
    if (!date) {
      const now = new Date();
      return {
        fullDate: `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`,
        weekday: this.getWeekday(now)
      };
    }

    const d = new Date(date);
    return {
      fullDate: `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`,
      weekday: this.getWeekday(d)
    };
  },

  // 获取星期
  getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  },

  // 文字换行处理（返回行数组）
  wrapTextToLines(ctx, text, maxWidth) {
    const chars = text.split('');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < chars.length; i++) {
      const testLine = currentLine + chars[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = chars[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  },

  // 中文日期格式
  formatDateChinese(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}年${month}月${day}日`;
  },

  // 文字换行
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let currentY = y;

    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = chars[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);

    return currentY + lineHeight;
  },

  // 保存到相册
  saveToAlbum() {
    const { cardImage } = this.data;
    if (!cardImage) {
      wx.showToast({ title: '请先生成卡片', icon: 'none' });
      return;
    }

    wx.saveImageToPhotosAlbum({
      filePath: cardImage,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        console.error('保存失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  // 转发分享
  onShareAppMessage() {
    const { cardImage } = this.data;
    return {
      title: '这一刻，光照进来了 · 我的正念日记',
      path: '/pages/index/index',
      imageUrl: cardImage || '',
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { cardImage } = this.data;
    return {
      title: '正念育儿：在觉察与修复中，爱在流动',
      imageUrl: cardImage || '',
      query: ''
    };
  },

  // 预览图片
  previewImage() {
    const { cardImage } = this.data;
    if (!cardImage) return;

    wx.previewImage({
      current: cardImage,
      urls: [cardImage]
    });
  },

  // 返回首页
  backToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
