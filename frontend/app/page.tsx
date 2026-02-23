// frontend/src/app/page.tsx

export default async function Home() {
  // 1. FastAPIのバックエンドからデータを取得 (キャッシュせず毎回最新を取得)
  const res = await fetch("http://127.0.0.1:8000/api/questions", {
    cache: "no-store",
  });
  
  // 2. 取得したJSONデータを変換
  const result = await res.json();
  const questions = result.data; // FastAPI側で "data" の中にリストを入れたため

  // 3. 画面に表示するHTML(JSX)
  return (
    <main className="min-h-screen p-8 bg-white text-black">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">
          趣味アドバイザーAI
        </h1>
        <p className="mb-4 text-gray-700">以下の質問にお答えください：</p>
        
        <div className="space-y-4">
          {/* 質問リストをループで表示 */}
          {questions.map((q: any) => (
            <div key={q.id} className="p-4 bg-gray-100 rounded-lg shadow">
              <span className="font-bold mr-2 text-blue-500">Q{q.id}.</span>
              {q.question}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}