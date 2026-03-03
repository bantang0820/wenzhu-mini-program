import axios from 'axios';
import { config } from '../config/app';
import { EmotionSliceRequest, EmotionSliceResponse } from '../types';
import logger from '../utils/logger';
import moment from 'moment';

/**
 * AI服务类
 */
export class AIService {
  /**
   * 生成情绪切片文案
   * @param data 情绪切片请求
   * @returns 生成的文案
   */
  async generateEmotionSlice(data: EmotionSliceRequest): Promise<EmotionSliceResponse> {
    try {
      // 如果没有配置API key，返回兜底文案
      if (!config.deepseek.apiKey || config.deepseek.apiKey === 'your_deepseek_api_key') {
        logger.warn('DeepSeek API Key未配置，使用兜底文案');
        return this.getFallbackResponse();
      }

      const timeStart = moment(data.stormTime).format('HH:mm');
      const timeMid = moment(data.shiftTime).format('HH:mm');

      const prompt = `你是一位温柔而智慧的正念导师，请帮助用户生成一段"情绪切片"文案。

场景：${data.scenario}
心情：${data.mood}
风暴时刻（进入）：${timeStart}
转念时刻（按压）：${timeMid}
安顿时刻（朗读）：此刻

请生成以下三段文案（要求简洁、温暖、有力）：
1. stormText：风暴时刻文案（承认情绪，不超过30字）
2. shiftText：转念时刻文案（视角转换，不超过30字）
3. anchorText：安顿金句（稳定力量，不超过20字）

请以JSON格式返回：
{
  "stormText": "文案内容",
  "shiftText": "文案内容",
  "anchorText": "文案内容"
}`;

      const response = await axios.post(
        config.deepseek.apiUrl,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一位温柔而智慧的正念导师，擅长用简短有力的话语帮助父母安顿情绪。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${config.deepseek.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10秒超时
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI返回内容为空');
      }

      const aiData = JSON.parse(content);

      logger.info(`AI生成成功: ${data.scenario}`);

      return {
        success: true,
        data: {
          stormText: aiData.stormText,
          shiftText: aiData.shiftText,
          anchorText: aiData.anchorText,
          timeStart: timeStart,
          timeMid: timeMid,
          timeEnd: '此刻'
        }
      };
    } catch (error) {
      logger.error('AI生成失败:', error);
      // 返回兜底文案
      return this.getFallbackResponse();
    }
  }

  /**
   * 获取兜底文案
   * @returns 兜底响应
   */
  private getFallbackResponse(): EmotionSliceResponse {
    return {
      success: true,
      data: {
        stormText: '此刻的情绪真实而强烈，我看见并接纳它的存在',
        shiftText: '深呼吸，将视角拉高，这只是生命中的一个瞬间',
        anchorText: '安顿当下，力量自在心中',
        timeStart: '刚才',
        timeMid: '此刻',
        timeEnd: '此刻'
      },
      fallback: {
        stormText: '此刻的情绪真实而强烈，我看见并接纳它的存在',
        shiftText: '深呼吸，将视角拉高，这只是生命中的一个瞬间',
        anchorText: '安顿当下，力量自在心中'
      }
    };
  }
}

export default new AIService();
