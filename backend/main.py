from fastapi import FastAPI
from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

app = FastAPI()

# 新しいSDKでのクライアント初期化（自動で環境変数の GEMINI_API_KEY を読み込みます）
client = genai.Client()

@app.get("/api/questions")
def get_questions():
    prompt = """
    以下の3つの固定質問をJSON配列で出力してください。
    余計なテキストは含めないでください。
    1. インドア派ですか、それともアウトドア派ですか？
    2. 一人で楽しむのが好きですか、誰かと一緒に楽しむのが好きですか？
    3. 趣味にかける月々の予算はどのくらいですか？

    形式: [{"id": 1, "question": "質問内容"}]
    """
    
    try:
        # 新しい書き方でAPIを叩く
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        questions_data = json.loads(response.text)
        return {"status": "success", "data": questions_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}