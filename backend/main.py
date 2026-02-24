from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List

# .envファイルを読み込む
load_dotenv()

app = FastAPI()

#CORS設定ブロック
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Next.jsからのアクセスを許可
    allow_credentials=True,
    allow_methods=["*"], # GETやPOSTなどを全て許可
    allow_headers=["*"], # 全てのヘッダーを許可
)

# 新しいSDKでのクライアント初期化（自動で環境変数の GEMINI_API_KEY を読み込みます）
client = genai.Client()

# 1. 質問リストを取得するAPI (GET)
@app.get("/api/questions")
def get_questions():
    prompt = """
    以下の6つの質問を、指定されたJSON配列の形式で出力してください。
    余計なテキストは一切含めないでください。

    【質問リスト】
    1. 【目的】リフレッシュ、自己研鑽、承認・交流、暇つぶしの中で、趣味を通して一番得たいものは何ですか？
    2. 【リソース】趣味に使える時間（例: 平日の夜30分、休日に丸1日）、予算、希望する場所（自宅か外出か）を教えてください。
    3. 【性格とスタイル】一人で没頭したいか誰かと楽しみたいか、ゼロから創りたいか用意されたものを楽しみたいか、論理的（パズル等）か感覚的（アート等）か、好みを教えてください。
    4. 【過去の体験】子供の頃に時間を忘れて取り組んでいたことや、今まで試して「合わない」と感じた趣味とその理由を教えてください。
    5. 【生活環境】普段の仕事や生活はデスクワーク中心ですか？それとも体を動かすことが多いですか？
    6. 【MBTI】あなたのMBTI（16タイプ性格診断）を教えてください。（わからない場合はどのような性格と言われることが多いか教えてください）

    【出力形式】
    [
      {"id": 1, "question": "質問内容1"},
      {"id": 2, "question": "質問内容2"},
      {"id": 3, "question": "質問内容3"},
      {"id": 4, "question": "質問内容4"},
      {"id": 5, "question": "質問内容5"},
      {"id": 6, "question": "質問内容6"}
    ]
    """
    
    try:
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

# 2. 回答を受け取って趣味を提案するAPI (POST)
class Answer(BaseModel):
    question: str
    answer: str

class DiagnoseRequest(BaseModel):
    answers: List[Answer]

@app.post("/api/diagnose")
def diagnose_hobbies(request: DiagnoseRequest):
    answers_text = ""
    for item in request.answers:
        answers_text += f"質問: {item.question}\n回答: {item.answer}\n\n"
        
    prompt = f"""
    あなたはプロの趣味アドバイザーです。以下のユーザーの回答を分析し、その人の目的やリソース、性格、過去の体験に最も適した趣味を厳選して3つ提案してください。

    【ユーザーの回答】
    {answers_text}

    【出力要件】
    以下のJSON配列の形式で出力してください。余計なテキストは一切含めないでください。
    [
      {{
        "hobby_name": "趣味の名前",
        "reason": "なぜこの趣味がおすすめなのか（ユーザーの回答のどの部分を踏まえたのか具体的に）",
        "first_step": "今日から始められる具体的な第一歩"
      }}
    ]
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        suggestions_data = json.loads(response.text)
        return {"status": "success", "data": suggestions_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}