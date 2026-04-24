"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, RefreshCcw, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function Home() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: string }>({});
  const [otherTexts, setOtherTexts] = useState<{ [key: number]: string }>({});
  const [results, setResults] = useState<any[] | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/questions");
        const data = await res.json();
        if (data.status === "success") {
          setQuestions(data.data);
        } else {
          setError(data.message || "質問の取得に失敗しました");
        }
      } catch (err) {
        setError("サーバーに接続できません。バックエンドが起動しているか確認してください。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleOptionSelect = (questionId: number, option: string) => {
    setSelectedOptions({ ...selectedOptions, [questionId]: option });
  };

  const handleOtherTextChange = (questionId: number, text: string) => {
    setOtherTexts({ ...otherTexts, [questionId]: text });
  };

  const handleSubmit = async () => {
    setIsDiagnosing(true);
    setError("");
    
    const formattedAnswers = questions.map((q) => {
      let finalAnswer = "特になし";
      const selected = selectedOptions[q.id];
      if (selected) {
        finalAnswer = selected === "その他" ? (otherTexts[q.id] || "特になし") : selected;
      }
      return { question: q.question, answer: finalAnswer };
    });

    try {
      const res = await fetch("http://127.0.0.1:8000/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formattedAnswers }),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.data);
      } else {
        setError(data.message || "診断に失敗しました");
      }
    } catch (err) {
      setError("診断中にエラーが発生しました");
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <div className="text-center space-y-3 relative">
          <div className="absolute right-0 top-0">
            <Link href="/history">
              <Button variant="outline" size="sm" className="rounded-full">
                <BookOpen className="w-4 h-4 mr-2" />
                履歴
              </Button>
            </Link>
          </div>
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            AI 趣味アドバイザー
          </h1>
          <p className="text-slate-500">あなたの価値観から、ぴったりな趣味を提案します。</p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-600 flex items-center gap-2">
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* ローディング状態 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p>AIが質問リストを準備中...</p>
          </div>
        )}

        {/* 質問フォーム */}
        {!isLoading && !results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {questions.map((q) => (
              <Card key={q.id} className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 text-slate-800 flex items-start gap-2">
                    <span className="text-blue-500 font-bold shrink-0">Q{q.id}.</span>
                    {q.question}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {q.options?.map((opt: string) => (
                      <Button
                        key={opt}
                        variant={selectedOptions[q.id] === opt ? "default" : "outline"}
                        className={`rounded-full transition-all ${
                          selectedOptions[q.id] === opt ? "bg-blue-600 hover:bg-blue-700 shadow-md text-white" : ""
                        }`}
                        onClick={() => handleOptionSelect(q.id, opt)}
                      >
                        {selectedOptions[q.id] === opt && <CheckCircle2 className="w-4 h-4 mr-1" />}
                        {opt}
                      </Button>
                    ))}
                    
                    <Button
                      variant={selectedOptions[q.id] === "その他" ? "default" : "outline"}
                      className={`rounded-full transition-all ${
                        selectedOptions[q.id] === "その他" ? "bg-slate-800 hover:bg-slate-900 shadow-md text-white" : ""
                      }`}
                      onClick={() => handleOptionSelect(q.id, "その他")}
                    >
                      その他
                    </Button>
                  </div>

                  {selectedOptions[q.id] === "その他" && (
                    <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                      <Textarea
                        placeholder="詳細を教えてください（未入力でも構いません）"
                        value={otherTexts[q.id] || ""}
                        onChange={(e) => handleOtherTextChange(q.id, e.target.value)}
                        className="bg-slate-50 focus-visible:ring-blue-500"
                        autoFocus
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="text-center pt-8 pb-12">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isDiagnosing}
                className="rounded-full px-8 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all h-14 text-white"
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AIが分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    趣味を診断する！
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 診断結果 */}
        {results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-2xl font-bold text-center text-slate-800 pb-2 border-b-2 border-slate-200">
              あなたへのおすすめの趣味
            </h2>
            
            <div className="grid gap-6">
              {results.map((result: any, index: number) => (
                <Card key={index} className="overflow-hidden border-l-4 border-l-blue-500 shadow-md">
                  <CardContent className="p-6 md:p-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm">
                        {index + 1}
                      </span>
                      {result.hobby_name}
                    </h3>
                    
                    <div className="space-y-4 text-slate-700">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold text-slate-900 mb-2 text-sm">【おすすめの理由】</p>
                        <div className="prose prose-slate prose-sm max-w-none">
                          <ReactMarkdown>{result.reason}</ReactMarkdown>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-1">
                          <Sparkles className="w-4 h-4" /> まずはここから！
                        </p>
                        <div className="prose prose-slate prose-sm max-w-none text-blue-800">
                          <ReactMarkdown>{result.first_step}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center pt-8 pb-12">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setResults(null);
                  setSelectedOptions({});
                  setOtherTexts({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-full"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                もう一度診断する
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}