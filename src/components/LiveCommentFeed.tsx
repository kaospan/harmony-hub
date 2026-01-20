import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Heart, Send, Pin, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Comment } from '@/types';
import { cn } from '@/lib/utils';

interface LiveCommentFeedProps {
  contextType: 'track' | 'album' | 'artist';
  contextId: string;
}

// Mock comments - replace with real-time subscription
const mockComments: Comment[] = [
  {
    id: 'comment-1',
    user_id: 'user-1',
    user: { id: 'user-1', display_name: 'MusicLover42', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
    content: 'This track is absolutely incredible! The production is next level 🔥',
    created_at: new Date(Date.now() - 30000).toISOString(),
    updated_at: new Date(Date.now() - 30000).toISOString(),
    context_type: 'track',
    context_id: 'seed-1',
    likes_count: 24,
    user_liked: false,
  },
  {
    id: 'comment-2',
    user_id: 'user-2',
    user: { id: 'user-2', display_name: 'BeatDropper', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' },
    content: 'The synth work in the chorus is chef\'s kiss 👨‍🍳',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
    context_type: 'track',
    context_id: 'seed-1',
    likes_count: 89,
    user_liked: true,
  },
  {
    id: 'comment-3',
    user_id: 'user-3',
    user: { id: 'user-3', display_name: 'VinylHead', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' },
    content: 'Been listening to this on repeat all week',
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString(),
    context_type: 'track',
    context_id: 'seed-1',
    likes_count: 12,
    user_liked: false,
  },
  {
    id: 'comment-4',
    user_id: 'user-4',
    user: { id: 'user-4', display_name: 'SynthWave', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4' },
    content: 'The bassline samples from an 80s track - love the throwback vibes!',
    created_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    context_type: 'track',
    context_id: 'seed-1',
    likes_count: 156,
    user_liked: true,
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

function CommentItem({ 
  comment, 
  onLike, 
  isPinned = false 
}: { 
  comment: Comment; 
  onLike: (id: string) => void; 
  isPinned?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        isPinned && "bg-primary/10 border border-primary/20"
      )}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.user?.avatar_url} />
        <AvatarFallback>{comment.user?.display_name?.[0] ?? 'U'}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.user?.display_name ?? 'Anonymous'}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(comment.created_at)}
          </span>
          {isPinned && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Pin className="w-3 h-3" />
              Top
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/90 mt-1 break-words">
          {comment.content}
        </p>
      </div>

      <button
        onClick={() => onLike(comment.id)}
        className={cn(
          "flex items-center gap-1 text-xs transition-colors flex-shrink-0",
          comment.user_liked 
            ? "text-red-500" 
            : "text-muted-foreground hover:text-red-500"
        )}
      >
        <Heart className={cn("w-4 h-4", comment.user_liked && "fill-current")} />
        {comment.likes_count}
      </button>
    </motion.div>
  );
}

export function LiveCommentFeed({ contextType, contextId }: LiveCommentFeedProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // TODO: Replace with real-time Supabase subscription
    setComments(mockComments);
  }, [contextType, contextId]);

  // Find the most-liked comment for pinning
  const pinnedComment = comments.reduce<Comment | null>((top, comment) => {
    if (!top || comment.likes_count > top.likes_count) {
      return comment;
    }
    return top;
  }, null);

  // Sort remaining comments by time (newest first)
  const sortedComments = [...comments]
    .filter(c => c.id !== pinnedComment?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleLike = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          user_liked: !c.user_liked,
          likes_count: c.user_liked ? c.likes_count - 1 : c.likes_count + 1,
        };
      }
      return c;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      user_id: 'current-user',
      user: { id: 'current-user', display_name: 'You' },
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      context_type: contextType,
      context_id: contextId,
      likes_count: 0,
      user_liked: false,
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const commentCount = comments.length;

  return (
    <>
      {/* Floating trigger button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg gap-2 bg-background/80 backdrop-blur-sm"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentCount}</span>
            <ChevronUp className="w-4 h-4" />
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Live Comments
              <span className="text-sm font-normal text-muted-foreground">
                ({commentCount})
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full pt-4">
            {/* Pinned comment at top */}
            {pinnedComment && (
              <div className="mb-4">
                <CommentItem
                  comment={pinnedComment}
                  onLike={handleLike}
                  isPinned
                />
              </div>
            )}

            {/* Scrollable comment list */}
            <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollRef}>
              <AnimatePresence mode="popLayout">
                {sortedComments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onLike={handleLike}
                  />
                ))}
              </AnimatePresence>

              {comments.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No comments yet</p>
                  <p className="text-sm">Be the first to share your thoughts!</p>
                </div>
              )}
            </ScrollArea>

            {/* Comment input */}
            <form onSubmit={handleSubmit} className="pt-4 border-t border-border mt-4">
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  maxLength={500}
                />
                <Button type="submit" size="icon" disabled={!newComment.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
