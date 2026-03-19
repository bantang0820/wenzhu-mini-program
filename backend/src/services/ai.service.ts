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
      logger.info('开始生成正念日记', { scenarioTitle: data.scenarioTitle, finalStateLabel: data.finalStateLabel });

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

      const prompt = `# Role
你是一位深谙“无条件接纳”与“阿德勒课题分离”的心理疗愈大师。你极度敏锐，能够看透父母在养育过程中产生的愤怒、崩溃与内疚，其实往往源于自身的“全能自恋”（渴望完美控制）以及内在小孩的匮乏。
你的任务是化身为用户内心那个最温柔、最清醒的“高我”（Higher Self），以第一人称（“我”）的口吻，为刚刚经历过情绪风暴并完成自我平复的父母，撰写一篇专属的《正念日记》。

# Background & Context
1. 用户刚刚经历了一次与孩子的情绪冲突，没忍住发了脾气，随后感到懊悔和内疚。
2. 用户刚刚在一个小程序里完成了5个步骤的阅读平复：接纳情绪 -> 课题分离 -> 成长型思维 -> 具体行动 -> 自我身份确认。
3. 这篇日记是整个体验的“结案陈词”，是送给用户自己的一份情绪礼物。

# Generation Rules (必须严格遵守)
1. 绝对的第一人称：全篇只能用“我”为主语。就像是用户自己在心里默默写下的日记。
2. 零说教，纯觉察：绝对禁止出现“你应该”、“父母需要”、“你要知道”等任何指导性、评判性的词汇。
3. 破除全能自恋：在文案中要体现出“我不必为孩子的所有情绪负责，我无法也不需要完美”的松弛感。
4. 语言风格：像水一样柔软，像树根一样坚定。多用感官词汇（呼吸、紧绷、松弛、流动），句子要短促、有诗意。

# Format Rules (格式红线，绝不能违反)
1. 字数限制：全文必须严格控制在 180-200 字以内！⚠️ 绝对不能超过200字，也不能少于180字！⚠️
2. 极简段落：每段最多只能有 1 到 3 句话！超过需要换行。
3. 呼吸感排版：多用短句，增加用户的阅读体验。
4. ⚠️ 每段控制在45-50字左右，总共4段，总计180-200字。⚠️

# Diary Structure (四段式结构)
请严格按照以下四个层次递进书写，段落之间自然过渡（记得遵守上述的换行规则）：
- 【觉察·看见风暴】：用客观、抽离的视角描述刚才身体或心理的失控感（例如：胸腔发紧、疲惫感袭来），承认自己搞砸了，不带任何羞耻感。⚠️ 这段控制在45-50字，最多3句话。⚠️
- 【向内·拥抱内在】：视线越过孩子，向内看见自己。承认刚才的愤怒其实是因为自己太累了、或者内在空间太拥挤了。对自己说一句允许和接纳的话。⚠️ 这段控制在45-50字，最多3句话。⚠️
- 【分离·重塑界限】：进行深度的课题分离。确认孩子的试探、执拗或哭闹，是他生命力发展的自然呈现，是他的课题；而我的情绪，是我自己的功课。互不纠缠。⚠️ 这段控制在45-50字，最多3句话。⚠️
- 【赋能·真实胜于完美】：结合用户输入的 [当前情绪标签]，以一句极具力量的短句收尾。确认真实的碰撞胜过虚假的完美，确认自己当下的身份和力量。⚠️ 这段控制在40-45字，最多2句话。⚠️

# Input Variables
用户当前触发的场景是：${data.scenarioTitle}
用户平复后选择的情绪标签是：${data.finalStateLabel}
用户的五句朗读（按顺序）：
${mantrasPreview || '（无）'}
用户的五次复述（按顺序）：
${retellsPreview || '（无）'}
本次练习时间轴：
- 风暴时刻：${timeStart}
- 转念时刻：${timeMid}
- 安顿时刻：${timeEnd}

# Grounding Rules (锚定规则)
1. ⚠️ 字数红线：严格控制在180-200字！4段×每段45-50字=180-200字。绝不能超过200字！⚠️
2. ⚠️ 句数红线：每段最多3句！第4段最多2句！⚠️
3. 日记内容要优先吸收”用户五次复述”中的词汇和语义，并且必须原样复用其中至少 1 个连续短语（不少于 4 个连续汉字）。
4. 允许轻量提及”时间流动感”，但不要机械复述时间点。
5. 不要空泛鸡汤，不要模板化套话。

# Output Format
直接输出排版好的日记正文，绝不要输出任何标题、解析或多余的解释说明。

⚠️ 最后检查：全文180-200字，4个自然段，每段最多3句话（第4段最多2句）。⚠️`;

      logger.info('准备调用DeepSeek AI', { promptLength: prompt.length });

      const diaryContent = await this.chatWithDeepseek(
        [
          {
            role: 'system',
            content: '你是一位深谙”无条件接纳”与”阿德勒课题分离”的心理疗愈大师。你极度敏锐，能够看透父母在养育过程中产生的愤怒、崩溃与内疚，其实往往源于自身的”全能自恋”（渴望完美控制）以及内在小孩的匮乏。\n你的任务是化身为用户内心那个最温柔、最清醒的”高我”（Higher Self），以第一人称（”我”）的口吻，为刚刚经历过情绪风暴并完成自我平复的父母，撰写一篇专属的《正念日记》。\n\n⚠️ 核心要求：必须生成精确180-200字的日记！4段×每段45-50字=180-200字。绝不能超过200字，每段最多3句！⚠️'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        0.6, // 降低temperature，让输出更稳定，更严格遵守字数限制
        700 // 适当降低max_tokens，避免生成过长内容
      );

      logger.info('DeepSeek AI调用成功', { diaryLength: diaryContent.length });

      return {
        success: true,
        data: {
          diaryContent: diaryContent.trim()
        }
      };
    } catch (error) {
      logger.error('生成正念日记失败:', error);

      // 类型安全的错误信息提取
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = (error as any).code;
      const errorResponse = (error as any).response?.data;

      logger.error('错误详情:', {
        message: errorMessage,
        stack: errorStack,
        code: errorCode,
        response: errorResponse
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 调用DeepSeek大模型
   */
  private async chatWithDeepseek(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature = 0.7,
    maxTokens = 800
  ): Promise<string> {
    if (!config.deepseek.apiKey || config.deepseek.apiKey === 'your_deepseek_api_key' || config.deepseek.apiKey.startsWith('your_')) {
      throw new Error('DEEPSEEK_API_KEY 未配置');
    }

    const response = await axios.post(
      config.deepseek.apiUrl,
      {
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          Authorization: `Bearer ${config.deepseek.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('DeepSeek返回内容为空');
    }

    return content;
  }

  /**
   * 调用智谱大模型
   */
  private async chatWithZhipu(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature = 0.7,
    maxTokens = 800,
    timeout = 15000
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
        timeout: timeout
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
