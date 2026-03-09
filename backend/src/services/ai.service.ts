import axios from 'axios';
import { config } from '../config/app';
import {
  EmotionSliceRequest,
  EmotionSliceResponse,
  MindfulDiaryRequest,
  MindfulDiaryResponse,
  RetellFeedbackRequest,
  RetellFeedbackResponse
} from '../types';
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
   * 生成每句复述后的AI反馈
   */
  async generateRetellFeedback(data: RetellFeedbackRequest): Promise<RetellFeedbackResponse> {
    try {
      const prompt = `你是正念育儿练习中的陪伴型AI教练。请根据以下信息，给出一段简短反馈。

场景：${data.scenarioTitle}
当前句子轮次：第${data.readingRound}/${data.totalRounds}句
原句核心：${data.mantraText || '（未提供）'}
用户复述：${data.retellText}

要求：
1. 语气抱持、肯定、温暖，不评价对错。
2. 点出用户“已经做对了什么”。
3. 结尾给一句简单鼓励，引导继续下一句。
4. 控制在80字以内，不要分点，不要标题。`;

      const feedback = await this.chatWithZhipu(
        [
          {
            role: 'system',
            content: '你是擅长情绪支持的正念育儿陪练教练，语言温和且有力量。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        0.7,
        220
      );

      return {
        success: true,
        data: {
          feedback: feedback.trim()
        }
      };
    } catch (error) {
      logger.error('生成复述反馈失败:', error);
      return this.getRetellFeedbackFallback(data);
    }
  }

  /**
   * 生成最终正念育儿日记
   */
  async generateMindfulDiary(data: MindfulDiaryRequest): Promise<MindfulDiaryResponse> {
    try {
      const timeStart = moment(data.stormTime).format('HH:mm');
      const timeMid = moment(data.shiftTime).format('HH:mm');
      const timeEnd = moment(data.anchorTime).format('HH:mm');

      const mantrasPreview = (data.allMantras || [])
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');
      const retellsPreview = (data.roundRetells || [])
        .filter((item) => !!item && item.trim().length > 0)
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');

      const prompt = `请生成一段“正念育儿日记”正文，用户将直接用于生成卡片。

场景：${data.scenarioTitle}
练习轨迹：风暴 ${timeStart} -> 转念 ${timeMid} -> 安顿 ${timeEnd}
5句朗读原文：
${mantrasPreview}

用户每句复述：
${retellsPreview || '（用户复述较短）'}

用户最终状态：${data.finalStateLabel}（${data.finalState}）

要求：
1. 第一人称“我”叙述，温暖真实，富有希望感。
2. 重点体现：我先稳住自己，再去连接孩子。
3. 结尾给一句“下一次我会...”的具体行动。
4. 只输出正文，不要标题，不要markdown标记。`;

      const diaryContent = await this.chatWithZhipu(
        [
          {
            role: 'system',
            content: '你是正念育儿写作助手，擅长写有温度、有力量、可直接发布的短日记。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        0.75,
        900
      );

      return {
        success: true,
        data: {
          diaryContent: diaryContent.trim()
        }
      };
    } catch (error) {
      logger.error('生成正念日记失败:', error);
      return this.getMindfulDiaryFallback(data);
    }
  }

  /**
   * 调用智谱大模型
   */
  private async chatWithZhipu(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature = 0.7,
    maxTokens = 800
  ): Promise<string> {
    if (!config.zhipu.apiKey || config.zhipu.apiKey.startsWith('your_')) {
      throw new Error('ZHIPU_API_KEY 未配置');
    }

    const response = await axios.post(
      config.zhipu.apiUrl,
      {
        model: config.zhipu.model,
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          Authorization: `Bearer ${config.zhipu.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('智谱返回内容为空');
    }

    return content;
  }

  private getRetellFeedbackFallback(data: RetellFeedbackRequest): RetellFeedbackResponse {
    const fallback = `你已经把第${data.readingRound}句的重点说出来了，这说明你在认真练习稳住自己。继续下一句，你会更有力量。`;
    return {
      success: true,
      data: { feedback: fallback },
      fallback: { feedback: fallback }
    };
  }

  private getMindfulDiaryFallback(data: MindfulDiaryRequest): MindfulDiaryResponse {
    const retells = (data.roundRetells || []).filter((item) => item && item.trim().length > 0);
    const summary = retells.length > 0 ? retells.slice(0, 2).join('，') : '我先稳住自己，再去回应孩子';
    const diaryContent = `今天在“${data.scenarioTitle}”这个场景里，我经历了情绪上涌，也看见了自己停下来呼吸的能力。慢慢练习后，我不再只想控制孩子，而是先照顾自己的情绪，再去和孩子连接。复述里我最记得的是：${summary}。现在我的状态是“${data.finalStateLabel}”，这让我对家庭关系更有希望。下一次遇到类似时刻，我会先深呼吸三次，再开口说话。`;

    return {
      success: true,
      data: { diaryContent },
      fallback: { diaryContent }
    };
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
