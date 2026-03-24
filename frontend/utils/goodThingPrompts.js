const GOOD_THING_PROMPTS = [
  '今天有没有一杯咖啡或者奶茶，喝到让你觉得很享受',
  '有没有一首歌，今天突然戳到你了',
  '今天有没有一件小事，让你感觉到被照顾了',
  '有没有一个瞬间，你一个人安静着，觉得还不错',
  '今天的天空、路边的花草，有没有让你看了觉得好美',
  '今天有没有一件小事，进行得出乎意料地顺利',
  '今天有没有美美吃了一顿，哪怕只是一个小零食',
  '有没有一刻，你一个人笑了，因为想起了什么',
  '今天你有没有和孩子一起笑得停不下来',
  '有没有一个瞬间，你和孩子在一起都不说话，但很好',
  '今天你有没有陪孩子做了一件他喜欢的事',
  '有没有一次，你抱住孩子，孩子也抱紧了你',
  '今天孩子有没有让你觉得，这一切都值得',
  '有没有一刻，你突然很庆幸，他是你的孩子',
  '孩子今天有没有自己做了一件以前要你帮的事',
  '孩子有没有主动说了谢谢，或者对不起',
  '孩子有没有认真完成了一件事，没有半途而废',
  '孩子有没有自己解决了一个小麻烦',
  '孩子有没有说了一句，让你觉得他突然懂事了的话',
  '孩子有没有照顾了你，或者照顾了别人',
  '孩子有没有让你发现，他其实记住了你说过的话',
  '孩子有没有做了一件事，让你忍不住想告诉别人',
  '孩子今天有没有主动给你倒水',
  '孩子有没有跑过来，突然抱住你',
  '孩子睡着的样子，今天有没有让你看了很久',
  '孩子有没有把他最喜欢的东西分给你',
  '孩子有没有拉着你的手，不让你走',
  '孩子有没有偷偷亲你一下，然后跑掉',
  '孩子有没有说了一句话，让你眼眶有点热',
  '孩子有没有帮你做了一件小事，哪怕做得歪歪扭扭'
];

function getRandomGoodThingPrompt(previousPrompt = '') {
  const candidates = GOOD_THING_PROMPTS.filter(item => item !== previousPrompt);
  const promptPool = candidates.length ? candidates : GOOD_THING_PROMPTS;
  const randomIndex = Math.floor(Math.random() * promptPool.length);
  return promptPool[randomIndex] || GOOD_THING_PROMPTS[0];
}

module.exports = {
  GOOD_THING_PROMPTS,
  DEFAULT_GOOD_THING_PROMPT: GOOD_THING_PROMPTS[0],
  getRandomGoodThingPrompt
};
