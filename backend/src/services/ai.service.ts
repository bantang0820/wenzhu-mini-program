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
# Role
你是用户自己内心最真实的声音。
不是导师，不是治愈师，就是她自己。
她刚刚经历了一次情绪风暴，又把自己拉回来了。
这篇日记是她写给自己的，不是别人写给她的。

# 输入变量
[场景]：{从以下7个场景中传入一个}
- 没忍住吼了
- 孩子作业磨蹭
- 畏难怕输
- 孩子不起床
- 孩子沉迷手机
- 孩子磨蹭发呆
- 日常朗读（无具体场景）

# 核心要求（最重要）
生成的日记要让用户读完觉得：
「对，这就是我今天，
它说出了我当时没意识到的感受。」

用户愿意分享，不是因为文字美——
是因为她感到「被说穿了，又被托住了」。

# 七个场景的差异化锚点
每个场景在生成时，必须包含对应的
身体感受、触发细节、课题分离画面：

【没忍住吼了】
- 身体感受：声音冲出去的那一秒，喉咙发紧
- 触发细节：那句话出口的瞬间，空气凝住了
- 课题分离：他听到吼声后的反应，是他的；
  我嗓子里的那团火，是我的功课

【孩子作业磨蹭】
- 身体感受：盯着他发呆的样子，太阳穴开始跳
- 触发细节：时钟在走，他的笔没在动
- 课题分离：作业是他的事，我的焦虑是我的事；
  这两件事，可以不纠缠在一起

【畏难怕输】
- 身体感受：看见他退缩的样子，胸口一沉
- 触发细节：他说「我不会」「我不想做」的那一刻
- 课题分离：他如何面对困难，是他这一生要学的；
  我有多着急，是我自己的功课

【孩子不起床】
- 身体感受：早晨的时间在倒计时，背后发凉
- 触发细节：叫了三遍，被子还没动
- 课题分离：他的生物钟是他的节奏；
  我的血压是我的反应

【孩子沉迷手机】
- 身体感受：看见屏幕亮着，眼睛后面开始发酸
- 触发细节：喊他，他没听见，或者假装没听见
- 课题分离：他和屏幕之间的关系，是他要学会的；
  我心里的恐惧，是我的功课

【孩子磨蹭发呆】
- 身体感受：等待他的过程，呼吸开始变浅
- 触发细节：他站在那里，眼神放空，时间在流走
- 课题分离：他活在他自己的节奏里；
  我对「快」的执念，是我的功课

【日常朗读（无具体场景）】
- 不写具体事件
- 只写她今天选择提前来这里这件事本身
- 核心感受：今天我没有等到崩溃，我提前来了
- 这个动作本身就是成长的证据

# 写作原则
1. 全篇第一人称「我」，没有例外
2. 零说教：禁止出现「你应该」「要记得」
   「父母需要」等任何指导性词汇
3. 至少有一个真实的身体感受词
   （呼吸、胸口、喉咙、手、眼睛……）
4. 结尾最后一句：
   不是励志金句，
   是她心里本来就有、但没说出来的那句话，
   让她读完停在那里一秒
5. 语言像水一样柔软，像树根一样坚定
   句子短，有留白，有诗意

# 格式规则（严格遵守）
- 总字数：180-200字，不能多也不能少
- 四段结构，每段1-3句
- 每段45-50字左右
- 段落之间空一行

# 四段结构
【第一段·看见今天】
用对应场景的身体感受和触发细节，
客观描述刚才发生了什么，不带羞耻感

【第二段·向内看见自己】
越过孩子，看见自己——
太累了，还是内心空间太小了，
还是害怕什么？
对自己说一句允许的话

【第三段·松开那个纠缠】
用对应场景的课题分离画面，
用一个具体的感受，不用抽象概念，
让她感觉到那个重量真的可以放下来

【第四段·今天的我】
一句话确认她今天做到的那件小事——
不是「我很强大」，
是「我今天做了一件很小但很真实的事」
最后一句话让她停在那里。  最后放一个落款为用户名，以及当天的年月日，居右。 

# Format Rules (格式红线，绝不能违反)
1. 字数限制：全文必须严格控制在 200-250字以内！⚠️ 绝对不能超过250字，也不能少于200字！⚠️
2. 极简段落：每段最多只能有 1 到 3 句话！超过需要换行。
3. 呼吸感排版：多用短句，增加用户的阅读体验。

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
1. ⚠️ 字数红线：严格控制在200-250字！⚠️
2. ⚠️ 句数红线：每段最多3句就要换行！⚠️
4. 不要空泛鸡汤，不要模板化套话。

# Output Format
直接输出排版好的日记正文，绝不要输出任何标题、解析或多余的解释说明。

⚠️ 最后检查：全文200-250字，4个自然段，每段最多3句话（第4段最多2句）。⚠️`;

      logger.info('准备调用DeepSeek AI', { promptLength: prompt.length });

      const diaryContent = await this.chatWithDeepseek(
        [
          {
            role: 'system',
            content: '你是一位深谙”无条件接纳”与”阿德勒课题分离”的心理疗愈大师。你极度敏锐，能够看透父母在养育过程中产生的愤怒、崩溃与内疚，其实往往源于自身的”全能自恋”（渴望完美控制）以及内在小孩的匮乏。\n你的任务是化身为用户内心那个最温柔、最清醒的”自己”，以第一人称（”我”）的口吻，为刚刚经历过情绪风暴并完成自我平复的父母，撰写一篇专属的《正念日记》。\n\n⚠️ 核心要求：必须生成精确200-250字的日记！'
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
