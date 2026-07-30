import { ExternalLink, Clock } from 'lucide-react'
import type { EventNewsArticle } from '../api/liveEventsApi'

interface RelatedNewsFeedProps {
  articles: EventNewsArticle[]
}

function sentimentColor(s: number | null): string {
  if (s === null) return 'text-gray-400'
  if (s >= 0.3) return 'text-green-400'
  if (s <= -0.3) return 'text-red-400'
  return 'text-yellow-400'
}

function sentimentBg(s: number | null): string {
  if (s === null) return 'bg-gray-500/20'
  if (s >= 0.3) return 'bg-green-500/20'
  if (s <= -0.3) return 'bg-red-500/20'
  return 'bg-yellow-500/20'
}

export default function RelatedNewsFeed({ articles }: RelatedNewsFeedProps) {
  const sorted = [...articles].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))

  return (
    <div>
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Related News ({articles.length})
      </h4>
      <div className="space-y-2">
        {sorted.slice(0, 10).map(article => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gray-800/30 rounded-lg p-2.5 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {article.source && (
                    <span className="text-[9px] text-gray-500 bg-gray-700/50 px-1 py-0.5 rounded">
                      {article.source}
                    </span>
                  )}
                  {article.sentiment !== null && (
                    <span className={`text-[9px] px-1 py-0.5 rounded ${sentimentBg(article.sentiment)} ${sentimentColor(article.sentiment)}`}>
                      {article.sentiment >= 0.3 ? 'Positive' : article.sentiment <= -0.3 ? 'Negative' : 'Neutral'}
                    </span>
                  )}
                </div>
                <h5 className="text-[11px] font-medium text-white leading-tight mb-0.5 line-clamp-2">
                  {article.title}
                </h5>
                {article.content_snippet && (
                  <p className="text-[10px] text-gray-500 line-clamp-2">{article.content_snippet}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {article.relevance_score !== null && (
                    <span className="text-[9px] text-blue-400">
                      {(article.relevance_score * 100).toFixed(0)}% relevant
                    </span>
                  )}
                  {article.published_at && (
                    <span className="flex items-center gap-0.5 text-[9px] text-gray-500">
                      <Clock size={8} />
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink size={10} className="text-gray-600 flex-shrink-0 mt-0.5" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
