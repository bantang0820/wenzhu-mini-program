// 云函数：生成情绪切片文案（调用DeepSeek API）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// TODO: 在云函数环境变量中配置 DEEPSEEK_API_KEY

exports.main = async (event, context) => {
  const { scenario, mood, stormTime, shiftTime, anchorTime } = event;

  console.log('收到AI生成请求:', { scenario, mood, stormTime, shiftTime, anchorTime });

  try {
    // 格式化时间
    const formatTime = (date) => {
      if (!date) return '--:--';
      const d = new Date(date);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const timeStart = formatTime(stormTime);
    const timeMid = formatTime(shiftTime);
    const timeEnd = formatTime(anchorTime);

    // 心情词映射（中文）
    const moodMap = {
      'angry': '濒临爆发，非常愤怒',
      'tired': '身心疲惫，无力感',
      'helpless': '心寒失望，觉得没用'
    };

    const moodDesc = moodMap[mood] || mood;

    // 构建Prompt
    const systemPrompt = `你是一位极具洞察力、文笔细腻的心理疗愈师，也是一位文字极简主义者。

你的任务是根据用户提供的【场景】、【心情】和【当前时间】，生成一段"三段式情绪微日记"。

**输入信息：**
- 时间：${timeEnd}（当前）
- 场景：${scenario}
- 心情：${moodDesc}

**输出格式（必须是JSON）：**
\`\`\`json
{
  "time_start": "${timeStart}",
  "phase_1_text": "风暴时刻的描述（不超过30字）",
  "time_mid": "${timeMid}",
  "phase_2_text": "转念瞬间的描述（不超过30字）",
  "time_end": "此刻",
  "phase_3_insight": "安顿金句（不超过20字）"
}
\`\`\`

**写作风格（至关重要）：**
1. **Show, Don't Tell**：不要说"我很生气"，要说"我的太阳穴突突直跳"、"喉咙里卡着一团火"。
2. **活人感**：使用口语化但优美的表达，像是在备忘录里随手记下的。
3. **高级感**：避免陈词滥调（如"退一步海阔天空"），使用更具画面感的隐喻（如"允许花慢慢开"、"就在这里等雨停"）。
4. **禁止说教**：这一段是写给自己的，不是写给别人看的。

**示例：**
如果输入是：
- 场景：辅导作业
- 心情：心寒无力

输出应该是：
\`\`\`json
{
  "time_start": "20:25",
  "phase_1_text": "橡皮擦屑铺满了桌角，同一道题讲了三遍，他眼里依然是一片茫然。",
  "time_mid": "20:30",
  "phase_2_text": "我合上了作业本，起身去厨房倒了一杯温水。透过玻璃杯升起的雾气，我看到了自己紧皱的眉头。",
  "time_end": "此刻",
  "phase_3_insight": "接纳他的平凡，也就是接纳我自己的平凡。"
}
\`\`\`

现在请根据用户的信息，生成JSON格式的情绪切片。只输出JSON，不要有其他内容。`;

    // 调用DeepSeek API
    const apiKey = process.env.DEEPSEEK_API_KEY || 'your-api-key';

    const response = await cloud.fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `场景：${scenario}，心情：${moodDesc}，当前时间：${timeEnd}`
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    const responseData = await response.json();

    console.log('DeepSeek API响应:', responseData);

    if (responseData.choices && responseData.choices.length > 0) {
      const content = responseData.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        success: true,
        data: {
          stormText: parsedContent.phase_1_text,
          shiftText: parsedContent.phase_2_text,
          anchorText: parsedContent.phase_3_insight,
          timeStart: parsedContent.time_start,
          timeMid: parsedContent.time_mid,
          timeEnd: parsedContent.time_end
        }
      };
    } else {
      throw new Error('API返回格式异常');
    }

  } catch (err) {
    console.error('生成情绪切片失败:', err);

    // 返回失败，让前端使用本地兜底
    return {
      success: false,
      error: err.message,
      fallback: {
        stormText: '那个瞬间，我感觉失控了。情绪像野火一样蔓延。',
        shiftText: '我按下了暂停键。三次深呼吸，把自己拉回当下。',
        anchorText: '情绪是天空，我是天空。云来云去，我一直在。'
      }
    };
  }
};
