import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Pin, Trash2, MessageSquare, Send, RefreshCw, User, MessageCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function DiscussionBoard({ courseId }) {
  const { user } = useSelector((state) => state.auth);
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  
  // State to track comment input for each post
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  
  // State for expanded comments
  const [expandedComments, setExpandedComments] = useState({});

  const fetchPosts = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setError('');
    try {
      // Fetch posts for the course. Page size 50 to see most posts at once
      const response = await apiFetch(`/discussion/courses/${courseId}/posts?page=0&size=50`);
      if (response && response.content) {
        setPosts(response.content);
      } else if (Array.isArray(response)) {
        setPosts(response);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Không thể tải các thảo luận lớp học.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setSubmittingPost(true);
    try {
      const response = await apiFetch('/discussion/posts', {
        method: 'POST',
        body: JSON.stringify({
          courseId: Number(courseId),
          content: newPostContent.trim()
        })
      });
      
      if (response) {
        setNewPostContent('');
        // Prepend new post to the top of list
        setPosts((prevPosts) => [response, ...prevPosts]);
      }
    } catch (err) {
      alert(err.message || 'Không thể đăng bài viết thảo luận.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bài viết này cùng tất cả bình luận?')) return;

    try {
      await apiFetch(`/discussion/posts/${postId}`, {
        method: 'DELETE'
      });
      // Remove from state
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err.message || 'Không thể xoá bài viết này.');
    }
  };

  const handlePinPost = async (postId) => {
    try {
      await apiFetch(`/discussion/posts/${postId}/pin`, {
        method: 'PUT'
      });
      // Flip the pin status locally and resort (pinned posts first, then newest)
      setPosts((prevPosts) => {
        const updated = prevPosts.map((p) => {
          if (p.id === postId) {
            return { ...p, isPinned: !p.isPinned };
          }
          return p;
        });
        
        // Custom sort to keep pinned posts at the top
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      });
    } catch (err) {
      alert(err.message || 'Không thể thay đổi trạng thái ghim.');
    }
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCreateComment = async (e, postId) => {
    e.preventDefault();
    const commentContent = commentInputs[postId] || '';
    if (!commentContent.trim()) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const response = await apiFetch('/discussion/comments', {
        method: 'POST',
        body: JSON.stringify({
          postId: Number(postId),
          content: commentContent.trim()
        })
      });

      if (response) {
        // Clear comment input
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        // Append comment to the correct post
        setPosts((prevPosts) =>
          prevPosts.map((p) => {
            if (p.id === postId) {
              const currentComments = p.comments || [];
              return {
                ...p,
                commentCount: (p.commentCount || 0) + 1,
                comments: [...currentComments, response]
              };
            }
            return p;
          })
        );
        // Automatically expand comments for this post to show the newly added comment
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      alert(err.message || 'Không thể đăng bình luận.');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bình luận này?')) return;

    try {
      await apiFetch(`/discussion/comments/${commentId}`, {
        method: 'DELETE'
      });
      // Remove comment from the post state
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            const currentComments = p.comments || [];
            return {
              ...p,
              commentCount: Math.max(0, (p.commentCount || 0) - 1),
              comments: currentComments.filter((c) => c.id !== commentId)
            };
          }
          return p;
        })
      );
    } catch (err) {
      alert(err.message || 'Không thể xoá bình luận.');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Check if current user is authorized to delete (is author or is teacher)
  const canDeletePost = (post) => {
    if (!user) return false;
    return user.role === 'teacher' || post.authorId === user.id;
  };

  const canDeleteComment = (comment) => {
    if (!user) return false;
    return user.role === 'teacher' || comment.authorId === user.id;
  };

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="space-y-6">
      {/* Forum Actions Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span>Kênh thảo luận lớp học</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Đặt câu hỏi và chia sẻ thông tin học tập cùng mọi người</p>
        </div>
        <button
          onClick={() => fetchPosts(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
          title="Tải lại thảo luận"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* New Post Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="grow">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Chia sẻ thông tin, tài liệu học tập hoặc câu hỏi cho cả lớp..."
                rows={3}
                required
                className="w-full px-3.5 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition resize-none leading-relaxed"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submittingPost || !newPostContent.trim()}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition duration-200 ${
                newPostContent.trim() && !submittingPost
                  ? 'bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white cursor-pointer shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đăng thảo luận</span>
            </button>
          </div>
        </form>
      </div>

      {/* Error Announcement */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Lỗi tải dữ liệu</p>
            <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Đang đồng bộ cuộc trò chuyện...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <MessageSquare className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">Chưa có bài đăng thảo luận nào</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Hãy là người đầu tiên đặt câu hỏi hoặc đưa ra thông báo cho lớp học!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isExpanded = expandedComments[post.id];
            
            return (
              <div
                key={post.id}
                className={`bg-white border rounded-2xl shadow-sm transition duration-200 relative overflow-hidden ${
                  post.isPinned
                    ? 'border-amber-400 bg-amber-50/10 ring-1 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Pinned Banner */}
                {post.isPinned && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
                    <Pin className="w-2.5 h-2.5 fill-white" />
                    <span>Ghim thông báo</span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Post Author Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                        {post.authorName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{post.authorName}</span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              post.authorRole === 'Teacher'
                                ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                                : 'bg-slate-100 border border-slate-200 text-slate-600'
                            }`}
                          >
                            {post.authorRole === 'Teacher' ? 'Giảng viên' : 'Sinh viên'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                          {formatTime(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Post Control Buttons */}
                    <div className="flex items-center gap-1">
                      {isTeacher && (
                        <button
                          onClick={() => handlePinPost(post.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            post.isPinned
                              ? 'bg-amber-100 text-amber-600 border-amber-300'
                              : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                          title={post.isPinned ? 'Bỏ ghim thông báo' : 'Ghim thông báo lên đầu'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-amber-600' : ''}`} />
                        </button>
                      )}
                      
                      {canDeletePost(post) && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition"
                          title="Xoá bài đăng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pl-1">
                    {post.content}
                  </div>

                  {/* Comments count / Toggle */}
                  <div className="flex items-center pt-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Bình luận ({post.commentCount || 0})</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Comments Panel */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-100 p-4 space-y-4">
                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2.5 items-start bg-white/60 p-3 rounded-xl border border-slate-100">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                              {comment.authorName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="grow space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-800 text-xs">{comment.authorName}</span>
                                  <span
                                    className={`text-[9px] font-black uppercase ml-1.5 px-1.5 py-0.5 rounded-full ${
                                      comment.authorRole === 'Teacher'
                                        ? 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                                        : 'bg-slate-100 border border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {comment.authorRole === 'Teacher' ? 'Giảng viên' : 'Sinh viên'}
                                  </span>
                                  <p className="text-[9px] text-slate-400 font-mono font-medium leading-none mt-1">
                                    {formatTime(comment.createdAt)}
                                  </p>
                                </div>

                                {canDeleteComment(comment) && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                    title="Xoá bình luận"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-2">Chưa có bình luận nào. Hãy bắt đầu thảo luận!</p>
                    )}

                    {/* New Comment Form */}
                    <form onSubmit={(e) => handleCreateComment(e, post.id)} className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        placeholder="Viết câu trả lời hoặc bình luận phản hồi..."
                        required
                        className="grow px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-primary transition"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                        className={`p-2 rounded-xl transition shrink-0 ${
                          (commentInputs[post.id] || '').trim() && !submittingComment[post.id]
                            ? 'bg-primary hover:bg-[#0056b3] text-white cursor-pointer shadow-sm'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
