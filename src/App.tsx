import { useState, useCallback } from 'react';
import { cn } from './utils/cn';

// 扑克牌花色颜色映射 (保留用于UI显示)
const suitColors: Record<string, string> = {
  '♠': 'text-gray-800',
  '♣': 'text-gray-800',
  '♥': 'text-red-500',
  '♦': 'text-red-500',
};

// 这里的 values 仅用于 TypeScript 类型推断或备用，实际逻辑已移至服务器
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Card {
  suit: string;
  value: string;
  isFlipped: boolean;
}

// 定义服务器地址
// 注意：部署后需要将其更改为你的 Cloudflare 域名
// 暂时先写死或从环境变量读取，默认为本地测试地址
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/draw';

// 五彩纸屑组件 (保持不变)
const Confetti = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    color: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'][
      Math.floor(Math.random() * 6)
    ],
    size: 8 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
};

// 单张扑克牌组件 (保持不变)
const PokerCard = ({ card }: { card: Card }) => {
  return (
    <div
      className="relative w-32 h-44 sm:w-40 sm:h-56 perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <div
        className={cn(
          'relative w-full h-full transition-transform duration-700 transform-style-3d',
          card.isFlipped && 'rotate-y-180'
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: card.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 卡片背面 */}
        <div
          className="absolute w-full h-full rounded-xl shadow-xl backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl border-4 border-white flex items-center justify-center">
            <div className="w-[85%] h-[90%] border-2 border-blue-400/50 rounded-lg flex items-center justify-center">
              <div className="text-4xl sm:text-5xl text-blue-300/80">🎴</div>
            </div>
          </div>
        </div>

        {/* 卡片正面 */}
        <div
          className="absolute w-full h-full rounded-xl shadow-xl backface-hidden rotate-y-180"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="w-full h-full bg-white rounded-xl border-2 border-gray-200 p-2 sm:p-3 flex flex-col justify-between">
            <div className={cn('flex flex-col items-start', suitColors[card.suit])}>
              <span className="text-xl sm:text-2xl font-bold leading-none">{card.value}</span>
              <span className="text-xl sm:text-2xl leading-none">{card.suit}</span>
            </div>
            <div className={cn('flex items-center justify-center text-5xl sm:text-6xl', suitColors[card.suit])}>
              {card.suit}
            </div>
            <div className={cn('flex flex-col items-end rotate-180', suitColors[card.suit])}>
              <span className="text-xl sm:text-2xl font-bold leading-none">{card.value}</span>
              <span className="text-xl sm:text-2xl leading-none">{card.suit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function App() {
  // 初始状态显示背面
  const [cards, setCards] = useState<Card[]>([
    { suit: '♠', value: 'A', isFlipped: false },
    { suit: '♠', value: 'A', isFlipped: false },
    { suit: '♠', value: 'A', isFlipped: false },
  ]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState('点击按钮连接服务器抽奖');

  // 重置游戏
  const resetGame = useCallback(() => {
    // 重置时只把牌翻回去，不改变牌面，或者重置为默认背面
    setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
    setIsWinner(false);
    setShowConfetti(false);
    setMessage('点击按钮开始抽奖');
  }, []);

  // 抽奖逻辑
  const startDraw = useCallback(async () => {
    if (isDrawing) return;

    setIsDrawing(true);
    setIsWinner(false);
    setShowConfetti(false);
    setMessage('正在连接服务器获取结果...');

    // 先把所有牌翻回去（如果是重玩的情况）
    setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));

    try {
      // 1. 发起网络请求
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('网络请求失败');
      }
      const result = await response.json();
      const serverCards: Card[] = result.data.cards;
      const serverIsWinner: boolean = result.data.isWinner;

      // 拿到数据后，先设置数据（此时 isFlipped 都是 false，用户还看不到）
      // 这里的关键是：React 会重新渲染，但是因为 isFlipped 是 false，界面上还是背面
      setCards(serverCards); 
      setMessage('发牌中...');

      // 2. 开始执行翻牌动画
      
      // 翻第一张
      setTimeout(() => {
        setCards((prev) => {
          const updated = [...prev];
          updated[0] = { ...updated[0], isFlipped: true };
          return updated;
        });
      }, 500);

      // 翻第二张
      setTimeout(() => {
        setCards((prev) => {
          const updated = [...prev];
          updated[1] = { ...updated[1], isFlipped: true };
          return updated;
        });
      }, 1200);

      // 翻第三张并结算
      setTimeout(() => {
        setCards((prev) => {
          const updated = [...prev];
          updated[2] = { ...updated[2], isFlipped: true };
          return updated;
        });

        // 动画结束后显示结果
        setTimeout(() => {
          setIsWinner(serverIsWinner);
          setIsDrawing(false);

          if (serverIsWinner) {
            setShowConfetti(true);
            setMessage('🎉 恭喜中奖！服务器判定有效！🎉');
          } else {
            setMessage('很遗憾，再试一次吧！');
          }
        }, 500);
      }, 1900);

    } catch (error) {
      console.error("抽奖失败:", error);
      setMessage('无法连接到抽奖服务器，请检查网络');
      setIsDrawing(false);
    }

  }, [isDrawing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 flex flex-col items-center justify-center p-4 overflow-hidden">
      {showConfetti && <Confetti />}

      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center drop-shadow-lg">
        🃏 网络安全抽奖 Demo 🃏
      </h1>

      <div className="flex gap-3 sm:gap-6 mb-8">
        {cards.map((card, index) => (
          <PokerCard key={index} card={card} />
        ))}
      </div>

      <div
        className={cn(
          'text-xl sm:text-2xl font-semibold mb-6 text-center transition-all duration-300',
          isWinner ? 'text-yellow-300 animate-pulse scale-110' : 'text-white/90'
        )}
      >
        {message}
      </div>

      <div className="flex gap-4">
        <button
          onClick={startDraw}
          disabled={isDrawing}
          className={cn(
            'px-8 py-4 text-xl font-bold rounded-xl shadow-lg transition-all duration-300 transform',
            isDrawing
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white hover:scale-105 hover:shadow-xl active:scale-95'
          )}
        >
          {isDrawing ? '请求中...' : '🎰 请求服务器抽奖'}
        </button>

        {!isDrawing && cards.some((c) => c.isFlipped) && (
          <button
            onClick={resetGame}
            className="px-6 py-4 text-xl font-bold rounded-xl shadow-lg bg-white/20 text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-105 active:scale-95 backdrop-blur-sm"
          >
            🔄 重置
          </button>
        )}
      </div>

      {isWinner && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 p-1 rounded-3xl shadow-2xl animate-bounce">
            <div className="bg-white rounded-3xl px-8 py-6 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-red-500">
                恭喜中奖！
              </h2>
              <p className="text-gray-600 mt-2 text-lg">
                来自服务器的认证：三张 {cards[0].value}
              </p>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti linear forwards; }
      `}</style>
    </div>
  );
}