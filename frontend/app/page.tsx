"use client"; // ← ユーザーの操作（入力やクリック）を受け付けるための設定

import { useState, useEffect } from "react";

export default function Home() {
  // --- 画面の状態（State）を管理する変数たち ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [results, setResults] = useState<any[] | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [error, setError] = useState("");

  // --- 1. 画面が開いた時に、質問リストを取得する ---
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
        setError("バックエンドサーバーに接続できません");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // --- 2. テキストボックスの入力内容を保存する ---
  const handleInputChange = (questionId: number, text: string) => {
    setAnswers({
      ...answers,
      [questionId]: text, // 質問IDと入力されたテキストを紐付けて保存
    });
  };

  // --- 3. 「診断する！」ボタンが押された時の処理 ---
  const handleSubmit = async () => {
    setIsDiagnosing(true);
    setError("");
    
    // バックエンドの仕様に合わせて、データを整形する
    const formattedAnswers = questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] || "特になし", // 未入力の場合は「特になし」とする
    }));

    try {
      // POSTリクエストでバックエンドに回答データを送る
      const res = await fetch("http://127.0.0.1:8000/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formattedAnswers }),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.data); // 診断結果をセット！
      } else {
        setError(data.message || "診断に失敗しました");
      }
    } catch (err) {
      setError("診断中にエラーが発生しました");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // --- 画面の描画（HTML/Tailwind CSS） ---
  return (
    <main className="min-h-screen p-8 bg-slate-50 text-gray-800 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 tracking-tight">
          AI 趣味アドバイザー
        </h1>

        {/* エラーメッセージの表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg shadow-sm border border-red-200">
            {error}
          </div>
        )}

        {/* 読み込み中の表示 */}
        {isLoading && (
          <div className="text-center text-gray-500 animate-pulse">
            質問リストを準備中...
          </div>
        )}

        {/* 質問と入力欄のリスト表示 */}
        {!isLoading && !results && (
          <div className="space-y-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            {questions.map((q) => (
              <div key={q.id} className="flex flex-col">
                <label className="font-semibold text-lg mb-2 text-gray-700">
                  <span className="text-blue-500 mr-2">Q{q.id}.</span>
                  {q.question}
                </label>
                <textarea
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all resize-y min-h-[100px]"
                  placeholder="回答を入力してください（未入力でもOKです）"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                />
              </div>
            ))}

            {/* 診断ボタン */}
            <div className="text-center pt-6">
              <button
                onClick={handleSubmit}
                disabled={isDiagnosing}
                className="px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-full hover:bg-blue-700 active:transform active:scale-95 transition-all shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isDiagnosing ? "AIが分析中..." : "診断する！"}
              </button>
            </div>
          </div>
        )}

        {/* 診断結果の表示 */}
        {results && (
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 border-b pb-4">
              あなたへのおすすめの趣味
            </h2>
            {results.map((result: any, index: number) => (
              <div key={index} className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <h3 className="text-2xl font-bold text-blue-700 mb-3">
                  {index + 1}. {result.hobby_name}
                </h3>
                <div className="mb-4">
                  <p className="font-semibold text-gray-600 text-sm mb-1">【おすすめの理由】</p>
                  <p className="text-gray-800 leading-relaxed">{result.reason}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold text-blue-800 text-sm mb-1">【まずはここから！】</p>
                  <p className="text-blue-900">{result.first_step}</p>
                </div>
              </div>
            ))}
            
            {/* もう一度やり直すボタン */}
            <div className="text-center mt-10">
              <button
                onClick={() => {
                  setResults(null);
                  setAnswers({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-blue-600 underline hover:text-blue-800"
              >
                もう一度診断する
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}