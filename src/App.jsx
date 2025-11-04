import React, { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Send, X, Lock, Trash2 } from 'lucide-react'
import { supabase } from './supabaseClient'

// ---- 로그인 허용 사용자/암호 ----
const VALID_CREDENTIALS = {
  '귀연': '951027',
  '소영': '000521'
}

export default function CoupleDiary() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [posts, setPosts] = useState([]) // [{id, author, content, timestamp, comments_count}]
  const [newPost, setNewPost] = useState('')
  const [selectedPost, setSelectedPost] = useState(null) // {..., comments:[]}
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleLogin = () => {
    if (!passwordInput || !secretCode) { alert('모든 항목을 입력해주세요!'); return }
    if (VALID_CREDENTIALS[passwordInput] === secretCode) {
      setUserName(passwordInput); setIsAuthenticated(true)
      setPasswordInput(''); setSecretCode('')
    } else {
      alert('올바른 정보를 입력해주세요!'); setPasswordInput(''); setSecretCode('')
    }
  }

  const formatDate = (ts) => {
    const d = new Date(ts)
    const z = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`
  }

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      const base = (data || []).map(p => ({
        id: p.id,
        author: p.author,
        content: p.content,
        timestamp: new Date(p.created_at).getTime(),
        comments_count: 0
      }))
      const withCounts = await Promise.all(base.map(async (p) => {
        const { count } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', p.id)
        return { ...p, comments_count: count || 0 }
      }))
      setPosts(withCounts)
    } catch (e) {
      console.error(e); alert('글 불러오기에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    loadPosts()
    const postsSub = supabase
      .channel('posts-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe()
    const commentsSub = supabase
      .channel('comments-change')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        loadPosts()
        if (selectedPost) openComments(selectedPost, { keepOpen: true })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(postsSub)
      supabase.removeChannel(commentsSub)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const addPost = async () => {
    if (!newPost.trim()) { alert('내용을 입력해주세요!'); return }
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ author: userName, content: newPost }])
        .select()
        .single()
      if (error) throw error
      const post = {
        id: data.id, author: data.author, content: data.content,
        timestamp: new Date(data.created_at).getTime(), comments_count: 0
      }
      setPosts(prev => [post, ...prev]); setNewPost('')
    } catch (e) {
      console.error(e); alert('글 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const openComments = async (post, opts = {}) => {
    setSelectedPost({ ...post, comments: [] })
    try {
      const { data, error } = await supabase
        .from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true })
      if (error) throw error
      const comments = (data || []).map(c => ({
        id: c.id, author: c.author, content: c.content,
        timestamp: new Date(c.created_at).getTime()
      }))
      setSelectedPost({ ...post, comments })
    } catch (e) {
      console.error(e); alert('댓글 불러오기에 실패했습니다.')
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) { alert('댓글을 입력해주세요!'); return }
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ post_id: selectedPost.id, author: userName, content: newComment }])
        .select()
        .single()
      if (error) throw error
      const comment = {
        id: data.id, author: data.author, content: data.content,
        timestamp: new Date(data.created_at).getTime()
      }
      const updated = { ...selectedPost, comments: [...(selectedPost?.comments || []), comment] }
      setSelectedPost(updated)
      setPosts(prev => prev.map(p => p.id === selectedPost.id
        ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
      setNewComment('')
    } catch (e) {
      console.error(e); alert('댓글 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // ✅ 게시글 삭제
  const deletePost = async (post) => {
    if (!confirm('이 글을 삭제할까요? 댓글도 함께 삭제됩니다.')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      setPosts(prev => prev.filter(p => p.id !== post.id))
      if (selectedPost?.id === post.id) setSelectedPost(null)
    } catch (e) {
      console.error(e); alert('글 삭제에 실패했습니다.')
    }
  }

  // ✅ 댓글 삭제
  const deleteComment = async (commentId) => {
    if (!confirm('이 댓글을 삭제할까요?')) return
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw error
      // 모달 내 댓글 목록에서 제거
      setSelectedPost(prev => {
        if (!prev) return prev
        const updated = { ...prev, comments: prev.comments.filter(c => c.id !== commentId) }
        return updated
      })
      // 목록의 댓글 수 -1
      setPosts(prev => prev.map(p =>
        p.id === selectedPost?.id ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p
      ))
    } catch (e) {
      console.error(e); alert('댓글 삭제에 실패했습니다.')
    }
  }

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-[680px]">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="text-pink-400 fill-pink-400" size={36} />
              <Lock className="text-purple-400" size={28} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              우리들의 이야기
            </h1>
            <p className="text-gray-500 text-sm">소중한 공간에 오신 것을 환영해요</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <input
              type="text"
              placeholder="이름(귀연/소영)"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 text-center text-lg"
            />
            <input
              type="password"
              placeholder="비밀번호 6자리"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 text-center text-lg"
              maxLength={6}
              inputMode="numeric"
            />
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
            >
              입장하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-pink-400 text-xl">로딩중...</div>
      </div>
    )
  }

  // 메인
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-4">
      <div className="mx-auto py-6 sm:py-8 w-full max-w-[1200px]">
        {/* 헤더 */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="text-pink-400 fill-pink-400" size={28} />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              우리들의 이야기
            </h1>
            <Heart className="text-pink-400 fill-pink-400" size={28} />
          </div>
          <p className="text-gray-600">
            안녕하세요, <span className="font-semibold text-pink-500">{userName}</span>님 💕
          </p>
        </div>

        {/* 글쓰기 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">새 글 남기기</h2>
          <textarea
            placeholder="오늘은 어떤 일이 있었나요? 💕"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
          />
          <button
            onClick={addPost}
            className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
          >
            글 남기기
          </button>
        </div>

        {/* 목록 */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">첫 번째 글을 남겨보세요! 💌</div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{post.author}</h3>
                    <p className="text-sm text-gray-400">{formatDate(post.timestamp)}</p>
                  </div>

                  {/* ✅ 글 삭제 버튼 (작성자만 노출하고 싶으면 조건 추가: userName === post.author) */}
                  <button
                    onClick={() => deletePost(post)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="글 삭제"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
                <button
                  onClick={() => openComments(post)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-600 transition-colors"
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">댓글 {post.comments_count ?? 0}개</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 댓글 모달 */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">댓글</h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{selectedPost.author}</h3>
                  <p className="text-sm text-gray-400">{formatDate(selectedPost.timestamp)}</p>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              <div className="space-y-4 mb-6">
                {(selectedPost.comments || []).map(c => (
                  <div key={c.id} className="pl-4 border-l-2 border-pink-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-gray-800">{c.author}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-400">{formatDate(c.timestamp)}</p>
                        {/* ✅ 댓글 삭제 버튼 (작성자만 노출하려면 userName === c.author 조건 추가) */}
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="댓글 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{c.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="댓글을 입력하세요"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button
                  onClick={addComment}
                  className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

