import { useState, useCallback } from 'react';
import { cn } from './utils/cn';

// ---------------- 配置区域 ----------------
// 直接置空，使用相对路径。
// 当你访问 /api/draw 时，Cloudflare Pages 会自动路由到 functions/api/draw.js
const API_BASE = '';

// ---------------- 类型定义 ----------------
interface Card {
  suit: string;
  value: string;
  isFlipped: boolean;
}

const suitColors: Record<string, string> = {
  '♠': 'text-gray-800', '♣': 'text-gray-800',
  '♥': 'text-red-500', '♦': 'text-red-500',
};

// ---------------- 子组件: 扑克牌 ----------------
const PokerCard = ({ card }: { card: Card }) => {
  return (
    <div className="relative w-24 h-36 sm:w-32 sm:h-48 perspective-1000">
      <div
        className={cn(
          'relative w-full h-full transition-transform duration-700 transform-style-3d',
          card.isFlipped && 'rotate-y-180'
        )}
        style={{ transformStyle: 'preserve-3d', transform: card.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* 背面 */}
        <div className="absolute w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
          <div className="w-full h-full bg-blue-700 rounded-lg border-2 border-white shadow-lg flex items-center justify-center">
             <div className="text-3xl">🎴</div>
          </div>
        </div>
        {/* 正面 */}
        <div className="absolute w-full h-full bg-white rounded-lg border-2 border-gray-200 shadow-lg backface-hidden rotate-y-180 flex flex-col items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className={cn('text-2xl font-bold', suitColors[card.suit])}>{card.suit}{card.value}</div>
        </div>
      </div>
    </div>
  );
};

// ---------------- 主程序 ----------------
export function App() {
  // 游戏状态
  const [cards, setCards] = useState<Card[]>([
    { suit: '♠', value: '?', isFlipped: false },
    { suit: '♠', value: '?', isFlipped: false },
    { suit: '♠', value: '?', isFlipped: false },
  ]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [message, setMessage] = useState('请点击抽奖');
  
  // 用户状态
  const [user, setUser] = useState<string | null>(null); // null 代表游客
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // 表单输入
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // --- 核心功能: 抽奖 ---
  const startDraw = useCallback(async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    setCards(prev => prev.map(c => ({ ...c, isFlipped: false }))); // 先盖牌
    setMessage('请求服务器中...');

    try {
      // 注意：这里改成了 POST 请求，为了方便传 Header
      const res = await fetch(`${API_BASE}/api/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 如果已登录，带上用户名，服务器会记录；没登录就不带，服务器当游客处理
          'x-username': user || 'guest' 
        }
      });
      
      if (!res.ok) throw new Error('网络错误');
      const data = await res.json();
      
      // 动画逻辑
      setTimeout(() => {
        setCards(data.data.cards); // 设置数据并翻牌
        setTimeout(() => {
          setCards(prev => [
            { ...prev[0], isFlipped: true },
            { ...prev[1], isFlipped: false },
            { ...prev[2], isFlipped: false }
          ]);
          setTimeout(() => {
             setCards(prev => [{...prev[0]}, { ...prev[1], isFlipped: true }, { ...prev[2], isFlipped: false }]);
             setTimeout(() => {
                setCards(prev => [{...prev[0]}, {...prev[1]}, { ...prev[2], isFlipped: true }]);
                setIsDrawing(false);
                setMessage(data.data.isWinner ? '🎉 恭喜中奖！' : '再接再厉');
             }, 500);
          }, 500);
        }, 100);
      }, 500);

    } catch (err) {
      console.error(err);
      setMessage('无法连接服务器');
      setIsDrawing(false);
    }
  }, [isDrawing, user]);

  // --- 核心功能: 登录/注册 ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (authMode === 'login') {
          setUser(data.username);
          setShowAuthModal(false);
          setMessage(`欢迎回来, ${data.username}!`);
        } else {
          alert('注册成功，请切换到登录');
          setAuthMode('login');
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('认证请求失败，检查服务器');
    }
  };

  const logout = () => {
    setUser(null);
    setMessage('已退出登录，当前为游客模式');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
      
      {/* 顶部栏 */}
      <div className="absolute top-4 right-4 flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-green-400 font-bold">👤 {user}</span>
            <button onClick={logout} className="text-sm underline text-gray-400 hover:text-white">退出</button>
          </>
        ) : (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
          >
            登录 / 注册
          </button>
        )}
      </div>

      <h1 className="text-3xl font-bold mb-8">🃏 网络安全抽卡系统 v2.0</h1>

      {/* 牌桌 */}
      <div className="flex gap-4 mb-8">
        {cards.map((c, i) => <PokerCard key={i} card={c} />)}
      </div>

      <p className="text-xl mb-6 text-yellow-300 h-8">{message}</p>

      <button
        onClick={startDraw}
        disabled={isDrawing}
        className={cn(
          "px-8 py-3 rounded-full text-xl font-bold shadow-lg transition-all",
          isDrawing ? "bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 active:scale-95"
        )}
      >
        {isDrawing ? '抽卡中...' : (user ? '🔥 记录抽卡' : '👀 游客试玩')}
      </button>

      {/* 登录弹窗 */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-center">
              {authMode === 'login' ? '用户登录' : '新用户注册'}
            </h2>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <input 
                type="text" placeholder="用户名" required 
                value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                className="p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
              />
              <input 
                type="password" placeholder="密码" required 
                value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                className="p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
              />
              <button type="submit" className="bg-blue-600 py-3 rounded font-bold hover:bg-blue-500">
                {authMode === 'login' ? '登录' : '注册'}
              </button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-400">
              {authMode === 'login' ? '还没有账号? ' : '已有账号? '}
              <button 
                className="text-blue-400 underline"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? '去注册' : '去登录'}
              </button>
            </div>
            <button 
              onClick={() => setShowAuthModal(false)}
              className="mt-6 w-full text-gray-500 hover:text-white"
            >
              关闭，我是来试玩的
            </button>
          </div>
        </div>
      )}
    </div>
  );
}