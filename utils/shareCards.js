// 分享卡片配置
const shareCards = {
  // 写作业场景
  'homework': {
    id: 'homework',
    title: '又要因为作业发火了',
    content: '刚才看着孩子在书桌前磨蹭，\n我差点又要吼出来了。\n\n幸好有这个小程序，\n3句话让我突然理解了他：\n"学习是他的事，我不能替代。"\n\n分享给你，我们都不必那么累。',
    bgColor: '#E8DFDF', // 莫兰迪红灰
    illustrationColor: '#B5A8A8',
    emoji: '📚',
    unlockScenarioId: '004' // 吃饭慢
  },

  // 孩子磨蹭场景
  'procrastination': {
    id: 'procrastination',
    title: '早上又迟到了',
    content: '催孩子上学简直是我的日常，\n直到今天读完这句话：\n\n"我的催促只会让他更紧张，\n我愿意陪他慢慢来。"\n\n突然就释怀了。\n\n如果你也常常因为孩子的磨蹭焦虑，\n试试这个，真的有用。',
    bgColor: '#DFE8E8', // 莫兰迪蓝灰
    illustrationColor: '#A8B5B5',
    emoji: '⏰',
    unlockScenarioId: '004'
  },

  // 顶嘴场景
  'talkback': {
    id: 'talkback',
    title: '被孩子顶撞了',
    content: '被孩子顶嘴的时候，\n真的想回一句"你反了天了"。\n\n但今天我没有。\n\n因为小程序提醒我：\n"他在练习表达观点，我需要引导。"\n"我不必赢得争论，我可以赢得关系。"\n\n分享给被孩子顶到心碎的你。',
    bgColor: '#E8F0E0', // 莫兰迪绿灰
    illustrationColor: '#B5C1AA',
    emoji: '💔',
    unlockScenarioId: '004'
  }
};

// 根据场景ID获取对应的分享卡片
function getShareCardByScenarioId(scenarioId) {
  // 场景ID映射到分享卡片
  const mapping = {
    '007': 'homework',  // 写作业拖拉
    '001': 'procrastination',  // 孩子磨蹭
    '005': 'talkback'  // 顶嘴
  };

  const cardId = mapping[scenarioId];
  return cardId ? shareCards[cardId] : null;
}

module.exports = {
  shareCards,
  getShareCardByScenarioId
};
