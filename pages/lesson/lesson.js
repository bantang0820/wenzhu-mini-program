// pages/lesson/lesson.js - 微课详情页
Page({
  data: {
    lessonId: 0,
    albumId: '',
    chapterId: '',
    lesson: null,
    totalLessons: 10, // 总课程数，可以从实际数据中获取

    // 录音相关
    isRecording: false,
    hasRecorded: false,
    recordedFilePath: '',
    isPlaying: false,

    // 能量光晕
    energyScale: 1,
    vadTimer: null
  },

  onLoad(options) {
    const { id, albumId, chapterId } = options;
    console.log('微课详情页加载:', { id, albumId, chapterId });

    this.setData({
      lessonId: parseInt(id),
      albumId,
      chapterId
    });

    this.loadLessonDetail(id, albumId, chapterId);
  },

  onUnload() {
    // 清理定时器
    if (this.data.vadTimer) {
      clearInterval(this.data.vadTimer);
    }
  },

  // 加载微课详情
  loadLessonDetail(lessonId, albumId, chapterId) {
    // 从上一页传递的数据中获取，或者从服务器加载
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage && prevPage.data && prevPage.data.lessons) {
      const lesson = prevPage.data.lessons.find(l => l.id === parseInt(lessonId));
      if (lesson) {
        this.setData({ lesson });
        console.log('从上一页加载微课:', lesson);
        return;
      }
    }

    // 如果从上一页获取失败，使用第一节的完整数据作为模拟数据
    const mockLessons = this.getMockLessons();
    const lesson = mockLessons.find(l => l.id === parseInt(lessonId)) || mockLessons[0];

    this.setData({ lesson });
    console.log('使用模拟数据:', lesson);
  },

  // 获取模拟微课数据（与 chapter 页面保持一致）
  getMockLessons() {
    // 根据当前页面参数判断章节
    const currentPage = getCurrentPages().pop();
    const chapterId = parseInt(currentPage.data.chapterId);

    // 第二章内容
    if (chapterId === 2) {
      return [
        {
          id: 1,
          title: '感受≠想法',
          theory: '非暴力沟通核心：区分感受与评判',
          breakthrough: '"我觉得"往往藏着评判',
          insight: '马歇尔·卢森堡指出：我们在表达时常常混淆感受与想法。\n"我觉得你不听话"——这不是感受，是评判。\n"我感到着急"——这才是感受。\n当我说"你让我很生气"时，我把自己感受的责任推给了孩子，他会本能地反抗。\n当我说"我感到生气，因为我看重秩序"时，我在为自己的感受负责，他能听到我的真诚。\n区分感受与想法，是改变沟通的第一步。',
          action: '检查你的语言，把"我觉得[评判]"改成"我感到[情绪词]"。',
          completed: false
        },
        {
          id: 2,
          title: '感受源于需要',
          theory: '感受是需要的信号灯',
          breakthrough: '感受告诉你需要什么',
          insight: '为什么我们会愤怒、伤心、恐惧？因为需要未被满足。\n愤怒=需要尊重，恐惧=需要安全，伤心=需要连接，焦虑=需要确定性。\n孩子哭闹时，我以前只看到"他不乖"。\n现在我学会了问：他的感受是什么？背后是什么需要？\n"你感到很生气，是因为需要被理解对吗？"\n当需要被看见，感受就转化了。\n感受不是问题，是需要的信使。',
          action: '当孩子有情绪时，问："你现在感到什么？是什么需要没有被满足？"',
          completed: false
        },
        {
          id: 3,
          title: '示弱的力量',
          theory: '表达感受而非指责，是建立连接的关键',
          breakthrough: '示弱不是软弱，是勇气',
          insight: '为什么我们害怕表达感受？因为害怕示弱。\n"你太自私了"——这是指责，我在保护自己，孩子听到的是攻击。\n"我感到很孤单"——这是表达感受，我敞开自己，孩子听到的是真诚。\n指责会引发防御，感受会引发连结。\n有一次我哭着对孩子说："妈妈现在很累，也很无助，不知道该怎么办了。"\n他紧紧抱住我："妈妈，我帮你。"那一刻我才明白：示弱不是软弱，而是建立连接的最短路径。',
          action: '今天对孩子说一次："妈妈/爸爸现在感到[情绪]，因为..."',
          completed: false
        },
        {
          id: 4,
          title: '精准的情绪词',
          theory: '词汇的精准度，决定沟通的清晰度',
          breakthrough: '别再说"我不开心"',
          insight: '我们的情绪词汇太贫乏了：开心、不开心、生气、难过。\n这些词无法准确描述内心世界。\n马歇尔·卢森堡建议我们建立更丰富的感受词汇库：\n开心：兴奋、喜悦、快乐、满足、欣慰、平静\n难过：伤心、沮丧、失望、委屈、痛苦、绝望\n生气：恼火、烦躁、愤怒、暴怒、愤慨\n害怕：担心、不安、焦虑、恐惧、惊慌\n当我能精准表达感受，孩子才能真正理解我。\n"我感到很沮丧，不是生气，是那种想放弃的感觉"\n当我这样说，他听懂了。',
          action: '建立你的情绪词汇库，今天练习用精准词汇表达感受。',
          completed: false
        },
        {
          id: 5,
          title: '先看见，再处理',
          theory: '感受被看见，才会自然流淌',
          breakthrough: '别急着"别哭了"',
          insight: '孩子哭闹时，我们的第一反应是什么？\n"别哭了"、"有什么好哭的"、"你再哭妈妈就生气了"\n这些话都在否定他的感受，让他学会压抑。\n非暴力沟通告诉我：感受被看见，自然会转化。\n现在我会说："我看到你很伤心，积木倒了，你很失落对吗？"\n神奇的是，当他的感受被看见，哭声渐渐小了。\n不是"不许哭"，而是"我看见你的哭了"。\n先看见感受，再解决问题。这个顺序不能错。',
          action: '孩子有情绪时，先说出他的感受："我看到你现在很[情绪词]..."，不要急着解决。',
          completed: false
        },
        {
          id: 6,
          title: '评判阻碍感受',
          theory: '评判会切断感受的通道',
          breakthrough: '感受无对错',
          insight: '我们为什么不敢表达感受？因为害怕被评判。\n"你怎么能这么想"——这句话让孩子学会了隐藏感受。\n"你不应该生气"——这句话让孩子学会了压抑。\n非暴力沟通强调：感受没有对错，只有存在。\n愤怒不是错，恐惧不是错，嫉妒也不是错。\n它们只是内心状态的信号。\n当我停止评判孩子的感受，他才敢于表达。\n"我看出你很嫉妒弟弟，这很正常，我也会嫉妒"\n当感受被允许，疗愈就开始了。',
          action: '当孩子表达负面感受时，告诉自己："这是他的感受，没有对错。"然后说："我听到你感到..."',
          completed: false
        },
        {
          id: 7,
          title: '为自己的感受负责',
          theory: '他人是刺激，不是原因',
          breakthrough: '感受的钥匙在你手里',
          insight: '这是非暴力沟通最颠覆性的洞见：\n"你让我很生气"——这是把感受的责任推给孩子。\n真相是：他的行为是刺激，我的感受源于我的需要。\n我感到生气，不是因为他不听话，而是因为我看重秩序。\n如果我的需要不同，感受也会不同。\n当我认识到这一点，就不再指责他人，而是看向自己的内心。\n"我感到焦虑，因为我需要确定性"\n为自己的感受负责，是成熟的表现。\n孩子也会学会：他不能控制我的情绪，我的情绪我自己负责。',
          action: '练习说"我感到[情绪]，因为我需要[需要]"，而不是"你让我..."',
          completed: false
        },
        {
          id: 8,
          title: '倾听感受',
          theory: '倾听不是为了建议，是为了陪伴',
          breakthrough: '别急着"你应该"',
          insight: '孩子说"我讨厌学校"，我们的反应是什么？\n"学校挺好的，你怎么能讨厌"、"你要好好学习"\n这些都是建议，不是倾听。\n非暴力沟通的倾听是：放下建议，全然陪伴。\n"你感到很挫败，是因为需要理解对吗？"\n"我听到你很沮丧"\n倾听不是解决问题，而是见证痛苦。\n当他的感受被听见，他就有了力量面对问题。\n我学会了闭嘴，只是陪伴，只是说："我听到了，你很难过。"',
          action: '孩子倾诉时，忍住建议的冲动，只说："我听到你感到[情绪]..."',
          completed: false
        },
        {
          id: 9,
          title: '共情四步法',
          theory: '观察+感受+需要+请求',
          breakthrough: '共情的公式',
          insight: '马歇尔·卢森堡总结了共情的四个步骤：\n1. 观察："我看到你..."（不是评判）\n2. 感受："你感到..."（不是想法）\n3. 需要："因为你需要..."（不是指责）\n4. 请求："你希望..."（不是命令）\n孩子摔玩具时：\n❌"你又发脾气了！"（评判）\n✅"我看到积木倒了（观察），你很生气（感受），因为你需要成就感（需要），你想重新搭对吗（请求）？"\n用这个公式，我学会了共情，而不是评判。',
          action: '练习四步法：观察→感受→需要→请求，用这个顺序和孩子对话。',
          completed: false
        },
        {
          id: 10,
          title: '感受是连接的密码',
          theory: '感受打开心门，评判关闭心门',
          breakthrough: '用心感受，用脑理解',
          insight: '这个月，我每天都在练习表达感受。\n一开始很别扭，"我感到..."说不出口。\n但渐渐地，家里的气氛变了。\n"我感到很累，需要休息"——孩子说："妈妈你睡会儿吧"\n"我感到很担心，因为看重你的安全"——孩子说："我会小心的"\n感受不是软弱，是连接的密码。\n当我们敢于表达真实感受，孩子也学会了表达。\n我们的家，从相互指责，变成了相互理解。\n原来，改变的不是孩子，而是我。\n我学会了用心感受，而不是用脑评判。',
          action: '记录一周的感受表达日记，观察关系的变化。',
          completed: false
        }
      ];
    }

    // 第三章内容
    if (chapterId === 3) {
      return [
        {
          id: 1,
          title: '感受源于需要',
          theory: '非暴力沟通核心：感受是需要的信号',
          breakthrough: '看见需要，就理解了感受',
          insight: '马歇尔·卢森堡指出：所有感受的背后，都是需要是否被满足。\n愤怒=需要尊重，恐惧=需要安全，伤心=需要连接，焦虑=需要确定性。\n孩子发脾气时，我以前只看到"他不听话"。\n现在我学会了问：他的需要是什么？\n"你很生气，是因为需要被理解对吗？"\n当需要被看见，感受就转化了。\n因为感受不是问题，感受只是需要的信使。\n看见需要，就理解了感受。',
          action: '当孩子有情绪时，问："你感到[情绪]，是因为需要[需要]对吗？"',
          completed: false
        },
        {
          id: 2,
          title: '需要≠策略',
          theory: '需要是深层的，策略是表层的',
          breakthrough: '别执着于一种方法',
          insight: '冲突的根源是什么？我们把需要和策略混淆了。\n"我要看电视"——这不是需要，这是策略。\n真正的需要可能是：放松、娱乐、刺激、探索。\n当我们执着于某个策略，冲突就产生了。\n但当我们看见需要，策略就有很多种。\n❌"不行，不能看电视！"\n✅"你想放松对吗？我们看看有哪些方式可以放松：看书、玩积木、画画..."\n从需要出发，策略就无限了。',
          action: '当孩子提出要求时，问："你想要这个东西，是想要满足什么需要呢？我们看看还有什么方式。"',
          completed: false
        },
        {
          id: 3,
          title: '需要的普遍性',
          theory: '所有人都有相同的基本需要',
          breakthrough: '我们渴望的是一样的',
          insight: '为什么我们和孩子总是对抗？因为我们看不见共同的需要。\n马歇尔·卢森堡强调：所有人的基本需要都是相同的。\n我们都渴望：被理解、被尊重、被爱、安全、自主、连接、意义...\n孩子和我，表面上有那么多冲突。\n但深层来看，我们的渴望是一样的。\n当我看见我们共同的渴望，对抗就消失了。\n原来，我们不是敌人，我们是一起面对问题的伙伴。\n透过需要，我看见了他的人性。',
          action: '记住：你和孩子有共同的需要。冲突时，问："我们各自的深层需要是什么？"',
          completed: false
        },
        {
          id: 4,
          title: '需要清单',
          theory: '精准识别需要，需要建立需要词汇库',
          breakthrough: '给需要起个名字',
          insight: '我们能精准识别感受，但能精准识别需要吗？\n马歇尔·卢森堡列出了人类的基本需要清单：\n身体需要：食物、休息、运动、空气...\n安全需要：秩序、确定、保护...\n连接需要：爱、理解、归属、陪伴...\n自主需要：选择、自由、独立...\n意义需要：贡献、成长、创造...\n玩耍需要：乐趣、探索、放松...\n当我熟记这个清单，就能精准地识别需要。\n"你感到愤怒，是因为需要尊重对吗？"\n需要的语言，让我们真正理解彼此。',
          action: '背诵人类的基本需要清单，今天练习识别3个需要。',
          completed: false
        },
        {
          id: 5,
          title: '需要无对错',
          theory: '需要本身是中性的，没有对错',
          breakthrough: '别评判需要',
          insight: '"你怎么这么黏人"——这是评判，孩子会内疚。\n"你需要连接对吗？"——这是看见，孩子会放松。\n需要本身没有对错，只有满足方式的不同。\n需要不是问题，需要是生命的力量。\n我的任务是帮助他以健康的方式满足需要，而不是否定需要。\n当我停止评判孩子的需要，他才敢于表达需要。\n"我看出你很需要陪伴，这很正常。我们一起看看如何满足这个需要。"\n看见需要，就停止了评判。',
          action: '当孩子表达需要时，告诉自己："这个需要是合理的。"然后说："我听到你需要..."',
          completed: false
        },
        {
          id: 6,
          title: '看见自己的需要',
          theory: '自我关怀从看见自己的需要开始',
          breakthrough: '我也有需要',
          insight: '我以前总在牺牲自己，满足孩子。\n直到精疲力竭，才意识到：我也有需要。\n我需要休息，需要支持，需要被理解。\n当我承认自己的需要，不再对孩子充满怨恨。\n马歇尔·卢森堡说：我们无法从匮乏中给予。\n照顾好自己的需要，才能更好地照顾孩子。\n这不是自私，这是智慧。\n"妈妈现在很累，需要休息20分钟，然后陪你玩。"\n当我尊重自己的需要，孩子也学会了尊重。',
          action: '今天诚实地问自己："我现在需要什么？"并尝试满足自己的一个需要。',
          completed: false
        },
        {
          id: 7,
          title: '需要≠行为',
          theory: '所有行为背后，都是试图满足某种需要',
          breakthrough: '看见行为背后的需要',
          insight: '孩子打人、拖延、撒谎...这些行为让我很头疼。\n但非暴力沟通告诉我：所有行为的背后，都是试图满足某种需要。\n打人=需要保护边界\n拖延=需要自主\n撒谎=需要安全\n当我看见行为背后的需要，评判就消失了。\n❌"你怎么又打人！"\n✅"你感到很生气，是需要保护边界对吗？我们可以用其他方式。"\n我不再对抗行为，而是支持他以更好的方式满足需要。\n理解需要，就是理解生命。',
          action: '当孩子有不当行为时，问自己："这个行为背后，他试图满足什么需要？"',
          completed: false
        },
        {
          id: 8,
          title: '冲突的本质',
          theory: '冲突是策略之争，不是需要之争',
          breakthrough: '寻找双赢策略',
          insight: '我想睡觉，他想玩耍——表面上是冲突。\n深层来看：我需要休息，他需要连接。\n这两个需要并不冲突，我们可以都满足。\n非暴力沟通的核心洞见：冲突不是需要之间的冲突，而是策略之间的冲突。\n当我们看见深层需要，总能找到双赢的策略。\n"妈妈现在需要休息（需要），20分钟后陪你玩（策略），可以吗？"\n当需要被看见，策略就有了无限可能。\n从对抗走向合作，只需要看见彼此的需要。',
          action: '当发生冲突时，问："我们各自的深层需要是什么？有满足双方需要的策略吗？"',
          completed: false
        },
        {
          id: 9,
          title: '需要的层次',
          theory: '先满足基础需要，再谈高层次需要',
          breakthrough: '别在饥饿时讲道理',
          insight: '孩子哭闹时，我讲大道理——没用。\n为什么？因为他现在需要的是安全感，不是道理。\n马斯洛的需求层次理论：生理需要>安全需要>归属需要>尊重需要>自我实现。\n当基础需要未被满足，高层次的需要就难以实现。\n❌孩子饿了，我说："你要学会等待。"\n✅孩子饿了，我说："你现在饿了，我们先吃饭，然后再谈。"\n先满足基础需要，再谈成长。这是人性的规律。',
          action: '当孩子有情绪时，先检查：他的基础需要（饿了、累了、害怕）满足了吗？',
          completed: false
        },
        {
          id: 10,
          title: '需要的语言',
          theory: '用需要的语言，创造理解的世界',
          breakthrough: '从指责走向需要',
          insight: '这个月，我每天都在练习"需要的语言"。\n一开始很不习惯，总是忘记。\n但渐渐地，家里的对话变了。\n❌"你怎么这么不听话"\n✅"你需要理解对吗？"\n❌"你太自私了"\n✅"你需要尊重，我也需要尊重，我们看看怎么都能满足。"\n当我们用需要的语言说话，指责就消失了，理解就产生了。\n因为需要是中性的，需要是普遍的，需要是连接的。\n原来，改变的不是孩子，而是我看见需要的方式。\n需要是桥梁，连接你我。',
          action: '记录一周的"需要语言"练习，观察关系的变化。',
          completed: false
        }
      ];
    }

    // 第四章内容
    if (chapterId === 4) {
      return [
        {
          id: 1,
          title: '请求≠命令',
          theory: '非暴力沟通核心：请求邀请合作，命令要求服从',
          breakthrough: '请求可以说不，命令必须执行',
          insight: '马歇尔·卢森堡指出：请求和命令的区别在于，对方可以说"不"。\n"把玩具收拾好"——这是命令，孩子必须执行。\n"你愿意收拾玩具吗？"——这是请求，孩子可以选择。\n当孩子说"不"时，如果他面临的是惩罚或说教，那这就是命令。\n如果他面临的是理解和协商，那这就是请求。\n命令会引发反抗，请求会邀请合作。\n我学会了把命令改成请求，孩子更愿意配合了。',
          action: '把"你去做X"改成"你愿意做X吗？"，允许孩子说"不"。',
          completed: false
        },
        {
          id: 2,
          title: '具体的请求',
          theory: '模糊的请求带来混乱，具体的请求带来行动',
          breakthrough: '具体到可以执行',
          insight: '为什么孩子"不听话"？因为我的请求太模糊了。\n"你要乖一点"——这太抽象了，孩子不知道怎么做。\n"请在吃饭前把手洗干净"——这很具体，孩子知道怎么做。\n马歇尔·卢森堡强调：请求必须具体到可以观察、可以衡量。\n❌"你要努力学习"\n✅"每天放学后，先做30分钟作业，再玩"\n具体的请求，让孩子知道如何配合。',
          action: '检查你的请求，问自己："这个请求够具体吗？孩子知道怎么做吗？"',
          completed: false
        },
        {
          id: 3,
          title: '正向的语言',
          theory: '大脑对"不"的处理需要额外步骤',
          breakthrough: '说做什么，别说不做什么',
          insight: '"别跑了"、"别吵了"、"别磨蹭了"\n这些话有个问题：大脑需要先理解"跑"，再否定它，效率很低。\n正向语言直接告诉孩子做什么，更清晰有效。\n❌"别在走廊跑"\n✅"在走廊请慢慢走"\n❌"别磨蹭了"\n✅"我们现在穿鞋子，好吗？"\n马歇尔·卢森堡说：正向的请求更清晰，也更容易被执行。',
          action: '把"别做X"改成"请做Y"，用正向语言提出请求。',
          completed: false
        },
        {
          id: 4,
          title: '一次一个请求',
          theory: '多重请求会让孩子过载',
          breakthrough: '别一次说太多',
          insight: '"去洗手、换衣服、做作业、收拾玩具..."\n我说了一串，孩子站在那里一动不动。\n为什么？因为多重请求会让大脑过载。\n马歇尔·卢森堡建议：一次只提一个请求。\n"先去洗手，完成后再说下一个。"\n当他完成一个，建立信心，再提下一个。\n❌一口气说5件事\n✅一次说1件事，完成后再说下一个\n简单清晰，孩子更容易执行。',
          action: '一次只提一个请求，等孩子完成后再提下一个。',
          completed: false
        },
        {
          id: 5,
          title: '请求的背景',
          theory: '说明"为什么"，增加请求的合理性',
          breakthrough: '给出理由，获得理解',
          insight: '"做作业去！"——孩子会想："为什么要听你的？"\n"现在是学习时间，做作业可以帮助你掌握知识，晚上就能自由玩了。"\n当请求给出背景和理由，孩子更容易理解并接受。\n马歇尔·卢森堡指出：当我们解释请求背后的需要，就是把命令变成了邀请。\n❌"快去睡觉"\n✅"现在是10点了，你明天还要上学，需要充足的睡眠。我们现在睡觉好吗？"\n给出理由，请求就变得合理。',
          action: '提出请求时，说明理由："我们这样做，是因为[需要]..."',
          completed: false
        },
        {
          id: 6,
          title: '确认理解',
          theory: '确保对方真正理解了你的请求',
          breakthrough: '请对方复述一遍',
          insight: '我说了半天，孩子还是一脸茫然。\n马歇尔·卢森堡建议：请对方复述你的请求。\n"妈妈刚才说了什么，你能告诉我吗？"\n"你听到我的请求了吗？能重复一遍吗？"\n复述能确认他是否真的理解，也能加深记忆。\n这不是不信任，这是为了确保沟通有效。\n❌说完就默认他懂了\n✅请他复述："你听到我说什么了吗？"\n确认理解，避免误解。',
          action: '重要请求后，请孩子复述："你能告诉妈妈，刚才我说了什么吗？"',
          completed: false
        },
        {
          id: 7,
          title: '尊重"不"',
          theory: '"不"是真实的反馈，不是反抗',
          breakthrough: '允许拒绝，寻找替代',
          insight: '孩子说"不"，我以前会生气。\n马歇尔·卢森堡说：当对方说"不"，倾听他背后的需要。\n"你不愿意做家务，是因为需要玩的时间对吗？"\n当需要被看见，我们就能找到替代方案。\n"那我们看看，有什么方式能既做家务，又给你玩的时间？"\n❌"你怎么说不！"\n✅"我听到你说不，你有什么顾虑吗？我们看看有没有其他方式。"\n尊重拒绝，寻找双赢。',
          action: '当孩子说"不"时，问："你有什么顾虑吗？我们看看有什么其他方式。"',
          completed: false
        },
        {
          id: 8,
          title: '请求≠要求',
          theory: '请求邀请贡献，要求强迫服从',
          breakthrough: '请求是邀请，不是强加',
          insight: '请求和要求有什么区别？\n要求：你必须做，不做就有后果\n请求：我希望你做，但你可以选择\n马歇尔·卢森堡强调：真正的请求，允许对方说"不"而不面临惩罚。\n❌"你必须现在做作业，不然就不能看电视"\n✅"我希望你现在做作业，这样晚上就能自由玩了。你有什么想法吗？"\n请求是平等的邀请，要求是强加的压力。',
          action: '检查你的意图：如果孩子说"不"，你会惩罚吗？如果是，那就是要求。',
          completed: false
        },
        {
          id: 9,
          title: '请求的场景',
          theory: '不同场景需要不同的请求方式',
          breakthrough: '灵活调整请求策略',
          insight: '有些请求需要立即执行（安全相关），有些可以协商（日常事务）。\n马歇尔·卢森堡建议：区分紧急和常规。\n❌紧急情况："马上停止！"（这是命令，合理）\n✅日常情况："你愿意现在收拾玩具，还是5分钟后？"（这是协商）\n分清楚什么时候需要命令，什么时候可以用请求。\n不是所有情况都适合请求，灵活应用。',
          action: '判断场景：安全相关用命令，日常事务用请求。',
          completed: false
        },
        {
          id: 10,
          title: '请求的艺术',
          theory: '好的请求是清晰、具体、尊重的',
          breakthrough: '从命令到请求的转化',
          insight: '这个月，我每天都在练习把命令改成请求。\n一开始很别扭，总觉得"你是家长，应该听我的"。\n但渐渐地，我发现：请求不是软弱，而是尊重。\n❌"快去洗澡！"\n✅"你愿意现在洗澡，还是15分钟后？"\n❌"不许玩手机"\n✅"我担心你的眼睛，我们一起看看怎么合理安排时间"\n当我们用请求代替命令，孩子从"被迫服从"变成了"主动合作"。\n原来，尊重会带来尊重，命令只会带来反抗。\n请求是信任的语言，命令是控制的语言。',
          action: '记录一周的"请求vs命令"练习，观察孩子的反应变化。',
          completed: false
        }
      ];
    }

    // 第五章内容
    if (chapterId === 5) {
      return [
        {
          id: 1,
          title: '倾听≠听见',
          theory: '非暴力沟通核心：倾听是全身心的临在',
          breakthrough: '听见是生理的，倾听是心理的',
          insight: '马歇尔·卢森堡说：倾听不只是听到声音，而是全身心地临在。\n孩子说话时，我一边刷手机一边"嗯嗯"，这不叫倾听。\n真正的倾听是：放下手机，看着他的眼睛，清空大脑，全然陪伴。\n❌"嗯嗯，你说说"（眼睛盯着手机）\n✅"我在听，请继续"（放下手机，看着对方）\n倾听是给予对方最珍贵的礼物：你的时间和注意力。',
          action: '孩子说话时，放下手机，看着他的眼睛，全然地听。',
          completed: false
        },
        {
          id: 2,
          title: '放下建议',
          theory: '倾听不是准备回答，而是准备理解',
          breakthrough: '别急着"你应该"',
          insight: '孩子说"我讨厌学校"，我的第一反应是什么？\n"学校挺好的，你要努力学习"、"你想想老师多辛苦"\n这些都是建议，不是倾听。\n马歇尔·卢森堡强调：倾听的关键是放下"我应该"的念头。\n❌"你应该这样想..."（说教）\n✅"我听到你很挫败，能多说说吗？"（理解）\n当我停止建议，才开始真正倾听。',
          action: '孩子倾诉时，忍住建议的冲动，只说："我听到..."，不要说"你应该..."',
          completed: false
        },
        {
          id: 3,
          title: '临在的倾听',
          theory: '倾听需要清空自己，为对方腾出空间',
          breakthrough: '清空大脑，全然在场',
          insight: '为什么孩子说着说着就不说了？因为他感觉不到我在听。\n我脑子里在想："等下要做什么饭"、"作业还没写完"\n这些念头让我无法临在。\n马歇尔·卢森堡说：倾听需要清空自己，为对方腾出空间。\n❌身体在这里，脑子在想别的\n✅放下所有念头，此时此刻只有你\n当我全然在场，孩子才愿意敞开心扉。',
          action: '倾听前深呼吸，告诉自己：此时此刻，只有你和我。',
          completed: false
        },
        {
          id: 4,
          title: '倾听感受',
          theory: '倾听不只是听内容，更是听感受',
          breakthrough: '听见话背后的情绪',
          insight: '孩子说"我不想写作业"，我听到的是"他又偷懒"。\n这是评判，不是倾听。\n真正的倾听是：听到话背后的感受和需要。\n❌"你怎么这么懒"（评判）\n✅"我听到你很烦躁，是作业太难了吗？"（感受）\n马歇尔·卢森堡建议：听到情绪，而不仅仅是听到内容。\n当感受被听见，孩子才觉得被理解。',
          action: '孩子说话时，问自己："他现在的感受是什么？背后的需要是什么？"',
          completed: false
        },
        {
          id: 5,
          title: '不打断',
          theory: '打断会切断对方的表达',
          breakthrough: '忍住插话的冲动',
          insight: '孩子话还没说完，我就急着插话："但是..."、"不对..."。\n为什么我会打断？因为我想纠正他、指导他、控制他。\n马歇尔·卢森堡指出：打断会切断对方的表达，也会打断对方的思考。\n❌"但是你应该..."（打断）\n✅"请继续说，我在听"（邀请）\n当我忍住打断，孩子才能完整表达，我才能完整理解。',
          action: '孩子说话时，忍住插话的冲动。数到3后再回应。',
          completed: false
        },
        {
          id: 6,
          title: '确认理解',
          theory: '确认不是重复，而是验证理解',
          breakthrough: '复述对方的话',
          insight: '我说"我懂了"，孩子说"你根本不懂"。\n为什么？因为我没有验证我的理解是否正确。\n马歇尔·卢森堡建议：用复述来确认理解。\n❌"我懂了"\n✅"我听到你说...，对吗？"\n复述不是重复，而是验证我的理解是否准确。\n当我说出他的感受，他会觉得："你真懂我。"\n确认理解，是倾听的重要技巧。',
          action: '倾听后复述："我听到你说[内容]，感到[感受]，对吗？"',
          completed: false
        },
        {
          id: 7,
          title: '倾听沉默',
          theory: '沉默也是一种表达',
          breakthrough: '别急着填补空白',
          insight: '孩子不说话时，我会急着问："你怎么不说话？"\n马歇尔·卢森堡说：沉默也是一种表达，不要急着填补空白。\n也许他在思考，也许他在整理情绪。\n❌"你快说啊"\n✅"我在这陪着你，想说的时候再说"\n当我学会和沉默相处，孩子反而更愿意表达了。\n倾听不仅是听话语，也是听沉默。',
          action: '当孩子沉默时，不要急着说话，安静地陪伴。',
          completed: false
        },
        {
          id: 8,
          title: '共情倾听',
          theory: '共情不是同情，是心与心的共振',
          breakthrough: '我和你在一起',
          insight: '"你好可怜"、"这太糟糕了"——这是同情，我站在高处。\n"我理解你的痛苦"、"我陪着你"——这是共情，我和他在一起。\n马歇尔·卢森堡强调：共情是站在对方的角度，感受他的感受。\n❌"你好可怜啊"\n✅"我感受到你很难过，我和你在一起"\n同情会让人感觉被俯视，共情会让人感觉被理解。\n共情是倾听的最高形式。',
          action: '倾听时，告诉自己："我和他在一起，我们一起面对。"',
          completed: false
        },
        {
          id: 9,
          title: '倾听的力量',
          theory: '倾听本身就是疗愈',
          breakthrough: '倾听不需要解决方案',
          insight: '孩子难过时，我急着给建议："你应该这样..."。\n但马歇尔·卢森堡告诉我：倾听本身就是疗愈，不需要急着解决。\n有一次孩子哭诉，我只是静静地听着，说："我听到了，你很委屈。"\n神奇的是，哭完后他说："谢谢你妈妈，我好多了。"\n原来，他需要的不是建议，而是被听见。\n倾听就是力量，陪伴就是疗愈。',
          action: '孩子有情绪时，先不要急着解决，只是倾听和陪伴。',
          completed: false
        },
        {
          id: 10,
          title: '倾听的练习',
          theory: '倾听是一种能力，需要持续练习',
          breakthrough: '从听到走向倾听',
          insight: '这个月，我每天都在练习倾听。\n一开始真的很难，总是急着给建议，急着纠正。\n但渐渐地，我学会了闭嘴，学会了全然地听。\n❌"你应该..."（给建议）\n✅"我听到..."（确认理解）\n孩子说："妈妈，你现在真的在听我说。"\n原来，倾听不是技巧，而是态度。\n当我放下说教的欲望，孩子才愿意说。\n倾听是连接的开始，理解是倾听的礼物。',
          action: '今天选择一个场景，完全不给孩子建议，只是倾听和确认理解。观察他的反应。',
          completed: false
        }
      ];
    }

    // 默认返回第一章内容
    return [
      {
        id: 1,
        title: '观察与评论',
        theory: '不带评论的观察是人类智力的最高形式 —— 克里希那穆提',
        breakthrough: '我是摄像机，不是法官',
        insight: '印度哲人克里希那穆提说："不带评论的观察是人类智力的最高形式。"\n观察就像摄像机一样，只记录事实，不加评判。当我看到孩子把玩具撒满地，我的第一反应是说"你真邋遢！"——这是评论，孩子听到的是指责。\n但如果我说"我看到地板上有三辆小汽车和五个积木"——这是观察，是客观事实。\n观察让我们连结，评论让我们对抗。',
        action: '当我想评价孩子时，先深吸一口气，只用"我看见/我注意到"开头，描述我眼睛看到的事实，不加任何形容词。',
        completed: false
      },
      {
        id: 2,
        title: '标签的陷阱',
        theory: '标签会阻碍我们真正看见孩子',
        breakthrough: '看见，而不是贴标签',
        insight: '标签会阻碍我们真正看见孩子。\n当我们给孩子贴上"邋遢""懒惰""调皮"这些标签时，我们看到的不再是鲜活的孩子，而是这些标签。\n孩子把颜料弄得满桌子都是，我会脱口而出："你总是这么邋遢！"这个词"邋遢"是一个标签，它否定了孩子作为独立个体的存在。\n当我试着去掉标签，只描述："我看到桌子上和你的手上都有蓝色的颜料。"奇迹发生了，他的肩膀放松了下来，主动说："妈妈，我们一起来擦干净吧。"\n标签会让孩子觉得被否定，观察会让孩子觉得被看见。',
        action: '下次遇到混乱场景，试着只用"我看见"开头，描述事实，不用"总是、从来不、这么"这类标签化词语。',
        completed: false
      },
      {
        id: 3,
        title: '区分事实与观点',
        theory: '事实引发思考，观点引发反抗',
        breakthrough: '事实不等于观点',
        insight: '事实引发思考，观点引发反抗。\n事实是客观发生的，观点是我们主观的判断。当我们说"你从来不写作业"时，这是观点，孩子会本能地反驳："我才没有！"\n但当我们说"我看到你今天还没有开始写作业"时，这是事实，他无法反驳。\n观点让孩子觉得被指责，会立刻启动防御机制。但事实摆在眼前，孩子反而会思考："哦，我确实还没开始写。"\n当我们学会区分这两者，孩子更容易接受我们的建议。',
        action: '把"你总是/从来不/每次都"改成"我看到这次/今天/现在"。用事实说话，而不是用观点评判。',
        completed: false
      },
      {
        id: 4,
        title: '观察的连结力',
        theory: '被看见，是人类最基本的需求',
        breakthrough: '观察是连结的开始',
        insight: '被看见，是人类最基本的需求。\n以前孩子哭闹时，我会急着问："你怎么了？又怎么了？"这些问题背后藏着我的评判和焦虑。\n现在我学会了先观察："我看到你紧紧抱着小熊，眼泪掉了下来。"这种中性的描述，让他感觉到我真的在看他，而不是在评判他。\n奇妙的是，当我这样说话时，他反而愿意告诉我发生了什么。\n因为观察传递的是"我在乎你"，评论传递的是"我要纠正你"。',
        action: '当孩子情绪激动时，先描述你看到的，而不是急着问"为什么"或给出建议。',
        completed: false
      },
      {
        id: 5,
        title: '具体化观察',
        theory: '具体的数字比模糊的形容词更有力量',
        breakthrough: '数字比形容词更有力量',
        insight: '具体的数字比模糊的形容词更有力量。\n"你在电视前坐了一整天"——孩子会立刻反驳："没有！我才看了一会儿！"\n"我看你在电视前坐了三个小时"——他没法反驳，因为这是事实。\n"一整天"是夸张，"三个小时"是观察。当我们用具体的时间、数量来描述时，孩子更容易接受现实。\n因为数字是中性的，它不会引发争吵，只会呈现事实。',
        action: '用具体的时间（30分钟/2小时）和数量（3次/5个）替代"总是、很久、很多"这些模糊的词。',
        completed: false
      },
      {
        id: 6,
        title: '情绪下的观察',
        theory: '愤怒时，我们的"摄像机"会失灵',
        breakthrough: '观察需要冷静的心',
        insight: '愤怒时，我们的"摄像机"会失灵。\n我发现一个有趣的现象：当我生气时，我的"摄像机"就坏了，我会直接跳到评论。只有当我先冷静下来，才能恢复观察的能力。\n因为愤怒会让我们戴上"有色眼镜"，看到的一切都是负面的。\n所以我学会了：有情绪时，先不说话。给自己三分钟，等脑子里的"摄像机"重新启动，再去描述事实。',
        action: '当你发现自己想批评时，停下来深呼吸三次，等情绪平复后，再尝试描述事实。',
        completed: false
      },
      {
        id: 7,
        title: '欣赏的观察',
        theory: '基于事实的赞美，才能让孩子感受到真诚',
        breakthrough: '欣赏也要先有观察',
        insight: '基于事实的赞美，才能让孩子感受到真诚。\n观察和评论并不是非黑即白的。当我们想赞美孩子时，同样需要以观察为基础。\n与其说"你真棒"（空洞的评论），不如说"我看到你努力拼完了这个100片的拼图（观察），这真的很棒（评论）"。\n有观察作为基础的赞美，孩子能感受到我的认真和真诚，而不是随口的敷衍。\n观察是赞美的骨架，评论是赞美的血肉。',
        action: '试着用"我看到...这让我觉得..."的句式来表达欣赏，让赞美有具体的事实支撑。',
        completed: false
      },
      {
        id: 8,
        title: '对自己的观察',
        theory: '对自己也要用观察的语言，避免自责',
        breakthrough: '对自己也要用观察',
        insight: '对自己也要用观察的语言，避免自责。\n我不仅是妈妈，我也是人。当我对自己说"我真是个糟糕的妈妈"时，我会陷入深深的自责。\n但当我对自己说"我今天对孩子发火了三次"时，我就能冷静地思考：为什么我会生气？下次可以怎么做？\n原来，观察的语言不仅对孩子有效，对我自己也同样重要。\n观察让我们接纳自己的不完美，评论让我们陷入自我否定的泥潭。',
        action: '当你想批评自己时，试试只描述事实，不加"糟糕、失败、太差"这些评判的词语。',
        completed: false
      },
      {
        id: 9,
        title: '观察创造对话空间',
        theory: '观察是解决问题的开始',
        breakthrough: '观察创造改变的空间',
        insight: '观察是解决问题的开始。\n当我用评论说话时，对话就结束了——孩子要么反抗，要么逃避。\n但当我用观察说话时，对话才刚刚开始——因为事实摆在面前，我们可以一起讨论它。\n观察不是为了批评，而是为了看见。看见是理解的开始，理解是改变的前提。\n当我学会了观察，我和孩子之间的沟通，从"我对你的指责"变成了"我们一起面对问题"。',
        action: '把目标从"让孩子承认错误"改成"让我们一起看看发生了什么，怎么解决会更好"。',
        completed: false
      },
      {
        id: 10,
        title: '持续的观察练习',
        theory: '观察是一种能力，需要持续练习',
        breakthrough: '每天三分钟的观察练习',
        insight: '观察是一种能力，需要持续练习。\n这个月我一直在练习观察的语言。说实话，一开始真的很别扭，我总是忍不住想评价。\n但渐渐地，我发现家里的争吵变少了。因为当我学会了只说事实，孩子也学会了只说事实。\n我们之间的沟通，终于从相互指责，变成了相互理解。\n原来，改变的不是孩子，而是我看孩子的方式。观察让我看见真实的他，而不是我想象中的他。',
        action: '今天选一个场景，只用"我看见/我注意到"来描述，记录下孩子的反应。持续练习一周，观察变化。',
        completed: false
      }
    ];
  },

  // 返回上一页
  onBack() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateBack();
  },

  // 标记完成
  onMarkComplete() {
    const { lesson } = this.data;
    if (!lesson) return;

    wx.vibrateShort({ type: 'heavy' });

    const newStatus = !lesson.completed;

    // 切换完成状态
    this.setData({
      'lesson.completed': newStatus
    });

    // 更新上一页数据
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage && prevPage.updateLessonStatus) {
      prevPage.updateLessonStatus(this.data.lessonId, newStatus);
    }

    wx.showToast({
      title: newStatus ? '已标记完成 ✓' : '已取消',
      icon: 'success'
    });
  },

  // 学习下一节
  onNextLesson() {
    wx.vibrateShort({ type: 'light' });

    const { lessonId, albumId, chapterId, totalLessons } = this.data;
    const nextLessonId = lessonId + 1;

    // 检查是否还有下一节
    if (nextLessonId > totalLessons) {
      wx.showModal({
        title: '提示',
        content: '已经是最后一节了！',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    // 跳转到下一节
    wx.redirectTo({
      url: `/pages/lesson/lesson?id=${nextLessonId}&albumId=${albumId}&chapterId=${chapterId}`,
      success: () => {
        console.log('跳转到下一节:', nextLessonId);
      },
      fail: (err) => {
        console.error('跳转失败', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 分享微课
  onShare() {
    const { lesson } = this.data;
    if (!lesson) return;

    wx.vibrateShort({ type: 'light' });

    wx.showModal({
      title: '分享微课',
      content: `分享「${lesson.breakthrough}」给好友`,
      confirmText: '分享',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // TODO: 实现分享功能
          wx.showToast({
            title: '分享功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 分享到微信
  onShareAppMessage() {
    const { lesson, lessonId } = this.data;
    return {
      title: lesson ? lesson.breakthrough : '正念育儿微课',
      path: `/pages/lesson/lesson?id=${lessonId}&albumId=${this.data.albumId}&chapterId=${this.data.chapterId}`,
      imageUrl: ''
    };
  },

  // ========== 录音功能 ==========

  // 点击录音按钮（开始/停止）
  onRecordClick() {
    if (this.data.isRecording) {
      // 正在录音，点击停止
      this.stopRecording();
    } else {
      // 未录音，点击开始
      this.startRecording();
    }
  },

  // 开始录音
  startRecording() {
    this.setData({
      isRecording: true
    });

    wx.vibrateShort({ type: 'light' });

    const recorderManager = wx.getRecorderManager();

    recorderManager.start({
      duration: 60000,
      format: 'mp3'
    });

    recorderManager.onStop((res) => {
      this.setData({
        isRecording: false,
        hasRecorded: true,
        recordedFilePath: res.tempFilePath
      });

      wx.vibrateShort({ type: 'heavy' });

      // 停止能量光晕效果
      this.stopVADEffect();
    });

    // 启动能量光晕效果
    this.startVADEffect();
  },

  // 停止录音
  stopRecording() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();

    // 注意：onStop回调会处理后续逻辑
  },

  // 结束录音（兼容旧代码）
  onRecordEnd() {
    this.stopRecording();
  },

  // 开始录音（兼容旧代码）
  onRecordStart() {
    this.startRecording();
  },

  // 启动VAD效果（模拟光晕缩放）
  startVADEffect() {
    let time = 0;
    const vadTimer = setInterval(() => {
      time += 0.1;
      const baseScale = 1.2;
      const variation = Math.sin(time * 2) * 0.3 + (Math.random() - 0.5) * 0.2;
      const scale = Math.max(1, Math.min(2, baseScale + variation));

      this.setData({
        energyScale: scale
      });
    }, 100);

    this.setData({ vadTimer });
  },

  // 停止VAD效果
  stopVADEffect() {
    if (this.data.vadTimer) {
      clearInterval(this.data.vadTimer);
      this.setData({
        vadTimer: null,
        energyScale: 1
      });
    }
  },

  // 回放录音
  onPlayRecord() {
    if (this.data.isPlaying) {
      // 停止播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.stop();
      this.setData({
        isPlaying: false
      });
    } else {
      // 开始播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = this.data.recordedFilePath;

      innerAudioContext.onPlay(() => {
        this.setData({
          isPlaying: true
        });
      });

      innerAudioContext.onEnded(() => {
        this.setData({
          isPlaying: false
        });
      });

      innerAudioContext.onError((res) => {
        console.error('播放失败', res);
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
        this.setData({
          isPlaying: false
        });
      });

      innerAudioContext.play();
    }
  }
});
