import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, X, Lock } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const VALID_CREDENTIALS = {
    '귀연': '951027',
    '소영': '000521',
  };

  useEffect(() => {
    if (isAuthenticated) loadPosts();
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (!passwordInput || !secretCode) {
      alert('모든 항목을 입력해주세요!');
      return;
    }
    if (VALID_CREDENTIALS[passwordInput] === secretCode) {
      setUserName(passwordInput);
      setIsAuthenticated(true);
      setPasswordInput('');
      setSecretCode('');
    } else {
      alert('올바른 정보를 입력해주세요!');
      setPasswordInput('');
      setSecretCode('');
    }
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const keys = await window.storage.list('post:', true);
      if (keys?.keys) {
        const loaded = await Promise.all(
          keys.keys.map(async (k) => {
            const r = await window.storage.get(k, true);
            return r ? JSON.parse(r.value) : null;
          })
        );
        setPosts(loaded.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch {
      console.log('처음 방문한 것 같습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addPost = async () => {
    if (!newPost.trim()) {
      alert('내용을 입력해주세요!');
      return;
    }
    const post = {
      id: Date.now().toString(),
      author: userName,
      content: newPost,
      timestamp: Date.now(),
      comments: [],
    };
    try {
      await window.storage.set(`post:${post.id}`, JSON.stringify(post), true);
      setPosts([post, ...posts]);
      setNewPost('');
    } catch {
      alert('글 저장 실패');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) {
      alert('댓글을 입력해주세요!');
      return;
    }
    const comment = {
      id: Date.now().toString(),
      author: userName,
      content: newComment,
      timestamp: Date.now(),
    };
    const updated = { ...selectedPost, comments: [...selectedPost.comments, comment] };
    try {
      await window.storage.set(`post:${selectedPost.id}`, JSON.stringify(updated), true);
      setPosts(posts.map((p) => (p.id === selectedPost.id ? updated : p)));
      setSelectedPost(updated);
      setNewComment('');
    } catch {
      alert('댓글 저장 실패');
    }
  };

  const formatDate = (t) => {
    const d = new Date(t);
    const y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${M}.${D} ${h}:${m}`;
  };

  /** 로그인 페이지 */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-0">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-[clamp(320px,70vw,1200px)]">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="text-pink-400 fill-pink-400" size={36} />
              <Lock className="text-purple-400" size={28} />
            </div>
            <h1 className="font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-[clamp(28px,2.2vw,48px)]">
              우리들의 이야기
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">소중한 공간에 오신 것을 환영해요</p>
          </div>

          <div className="space-y-4">
            <input
              className="w-full p-3 sm:p-4 border border-gray-200 rounded-lg text-center text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="암호(이름) 입력"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <input
              className="w-full p-3 sm:p-4 border border-gray-200 rounded-lg text-center text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="******"
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              maxLength={6}
              inputMode="numeric"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 sm:py-4 rounded-lg font-semibold hover:shadow-lg transition"
            >
              입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** 로딩 페이지 */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center text-pink-400 text-xl">
        로딩중...
      </div>
    );
  }

  /** 메인 페이지 */
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-0">
      <div className="w-full mx-auto py-6 sm:py-8 px-3 sm:px-6 md:px-10 xl:px-16 2xl:px-24 max-w-[min(1800px,98vw)]">
        {/* 헤더 */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="text-pink-400 fill-pink-400" size={28} />
            <h1 className="font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-[clamp(28px,2.2vw,56px)]">
              우리들의 이야기
            </h1>
            <Heart className="text-pink-400 fill-pink-400" size={28} />
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            안녕하세요, <span className="font-semibold text-pink-500">{userName}</span>님 💕
          </p>
        </div>

        {/* 글쓰기 */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8 w-full max-w-[min(1600px,98vw)] mx-auto">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">새 글 남기기</h2>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg mb-3 h-[clamp(8rem,10vw,20rem)] focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            placeholder="오늘은 어떤 일이 있었나요? 💕"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <button
            onClick={addPost}
            className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:shadow-lg transition"
          >
            글 남기기
          </button>
        </div>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-base">첫 번째 글을 남겨보세요! 💌</div>
        ) : (
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] xl:[grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-gray-800">{post.author}</h3>
                    <p className="text-xs sm:text-sm text-gray-400">{formatDate(post.timestamp)}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap text-sm sm:text-base">{post.content}</p>
                <button
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-600 transition text-sm sm:text-base"
                >
                  <MessageCircle size={18} />
                  댓글 {post.comments.length}개
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 댓글 모달 */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl w-[98vw] max-w-[min(1800px,98vw)] max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">댓글</h2>
              <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{selectedPost.author}</h3>
                  <p className="text-[11px] sm:text-xs text-gray-400">{formatDate(selectedPost.timestamp)}</p>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedPost.content}</p>
              </div>

              <div className="space-y-4 mb-6">
                {selectedPost.comments.map((c) => (
                  <div key={c.id} className="pl-3 sm:pl-4 border-l-2 border-pink-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-gray-800 text-sm sm:text-base">{c.author}</p>
                      <p className="text-[11px] sm:text-xs text-gray-400">{formatDate(c.timestamp)}</p>
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm">{c.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 p-2.5 sm:p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm sm:text-base"
                  placeholder="댓글을 입력하세요"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                />
                <button
                  onClick={addComment}
                  className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:shadow-lg transition"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

