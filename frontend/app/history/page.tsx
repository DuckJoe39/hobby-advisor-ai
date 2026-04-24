"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Calendar, ChevronLeft, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function HistoryPage() {
  const [histories, setHistories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. データベースから履歴一覧を取得する
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/questions`);
        const data = await res.json();
        if (data.status === "success") {
          setHistories(data.data);
        } else {
          setError("履歴の取得に失敗しました");
        }
      } catch (err) {
        setError("サーバーに接続できません");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-12 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ヘッダーと戻るボタン */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500">
                <ChevronLeft className="w-4 h-4 mr-1" /> 診断に戻る
              </Button>
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              診断履歴
            </h1>
          </div>
          <div className="text-slate-500 text-sm bg-white px-4 py-2 rounded-full shadow-sm border">
            全 {histories.length} 件の履歴
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 p-6 text-red-600">{error}</Card>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p>履歴を読み込み中...</p>
          </div>
        ) : histories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed space-y-4">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500">まだ診断履歴がありません。</p>
            <Link href="/">
              <Button className="bg-blue-600">最初の診断をはじめる</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {histories.map((item) => (
              <div key={item.id} className="relative pl-8 border-l-2 border-slate-200 space-y-4">
                {/* タイムラインの点 */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(item.created_at).toLocaleString("ja-JP")}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 回答の要約 */}
                  <Card className="lg:col-span-1 bg-slate-100/50 border-none shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">あなたの回答</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.answers.map((ans: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <p className="font-semibold text-slate-700 line-clamp-1">{ans.question}</p>
                          <p className="text-slate-600 italic">→ {ans.answer}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* 提案された趣味 */}
                  <div className="lg:col-span-2 grid gap-4">
                    {item.suggestions.map((sug: any, idx: number) => (
                      <Card key={idx} className="shadow-sm border-slate-200">
                        <CardContent className="p-4">
                          <h4 className="font-bold text-blue-700 flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4" />
                            {sug.hobby_name}
                          </h4>
                          <div className="text-sm text-slate-700 prose prose-slate max-w-none">
                            <ReactMarkdown>{sug.reason}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}