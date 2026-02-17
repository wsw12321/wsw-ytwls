export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 获取当前用户
  const currentUser = request.headers.get('x-username') || 'guest';
  const isGuest = currentUser === 'guest';

  // 抽卡逻辑
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const generateCard = () => ({
    suit: suits[Math.floor(Math.random() * suits.length)],
    value: values[Math.floor(Math.random() * values.length)],
    isFlipped: false
  });

  let cards = [generateCard(), generateCard(), generateCard()];

  // 20% 强制中奖
  if (Math.random() < 0.2) {
    const winValue = values[Math.floor(Math.random() * values.length)];
    cards = cards.map(c => ({ ...c, value: winValue }));
  }

  const isWinner = (cards[0].value === cards[1].value) && (cards[1].value === cards[2].value);

  // 如果是登录用户，写入数据库
  if (!isGuest) {
    const cardsStr = cards.map(c => c.suit + c.value).join(',');
    const resultStr = isWinner ? '中奖' : '未中奖';
    
    // 异步写入 D1，不阻塞返回
    await env.DB.prepare(
      'INSERT INTO history (username, result, cards) VALUES (?, ?, ?)'
    ).bind(currentUser, resultStr, cardsStr).run();
  }

  return Response.json({
    success: true,
    data: {
      cards: cards,
      isWinner: isWinner,
      user: currentUser
    }
  });
}