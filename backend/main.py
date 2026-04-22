from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List

# .envファイルを読み込む
load_dotenv()

app = FastAPI()

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAIクライアントの初期化（自動で OPENAI_API_KEY を読み込みます）
client = OpenAI()

# ==========================================
# 1. 質問リストを取得するAPI (GET)
# ==========================================
@app.get("/api/questions")
def get_questions():
    prompt = """
    以下の6つの質問を作成し、JSON形式で出力してください。
    必ず {"questions": [質問の配列]} という形式のJSONオブジェクトにしてください。

    【質問リスト】
    1. 【目的】リフレッシュ、自己研鑽、承認・交流、暇つぶしの中で、趣味を通して一番得たいものは何ですか？
    2. 【リソース】趣味に使える時間（例: 平日の夜30分、休日に丸1日）、予算、希望する場所（自宅か外出か）を教えてください。
    3. 【性格とスタイル】一人で没頭したいか誰かと楽しみたいか、ゼロから創りたいか用意されたものを楽しみたいか、論理的（パズル等）か感覚的（アート等）か、好みを教えてください。
    4. 【過去の体験】子供の頃に時間を忘れて取り組んでいたことや、今まで試して「合わない」と感じた趣味とその理由を教えてください。
    5. 【生活環境】普段の仕事や生活はデスクワーク中心ですか？それとも体を動かすことが多いですか？
    6. 【MBTI】あなたのMBTI（16タイプ性格診断）を教えてください。（わからない場合はどのような性格と言われることが多いか教えてください）

    【配列内の各アイテムの形式】
    {"id": 1, "question": "質問内容"}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # コストパフォーマンスが高い最新モデル
            response_format={"type": "json_object"}, # 確実にJSONで返させる設定
            messages=[
                {"role": "system", "content": "あなたは優秀なアシスタントです。必ずJSONを出力します。"},
                {"role": "user", "content": prompt}
            ]
        )
        
        # OpenAIの返答からJSONテキストを取り出して辞書に変換
        raw_json = response.choices[0].message.content
        parsed_data = json.loads(raw_json)
        
        # "questions" キーの中身（配列）だけをフロントエンドに返す
        return {"status": "success", "data": parsed_data.get("questions", [])}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 2. 回答を受け取って趣味を提案するAPI (POST)
# ==========================================
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
    あなたはプロの趣味アドバイザーです。以下のユーザーの回答を分析し、最適な趣味を3つ提案してください。
    必ず {{ "suggestions": [提案の配列] }} という形式のJSONオブジェクトで出力してください。

    【ユーザーの回答】
    {answers_text}

    【配列内の各アイテムの形式】
    {{
      "hobby_name": "趣味の名前",
      "reason": "なぜこの趣味がおすすめなのか（ユーザーの回答のどの部分を踏まえたのか具体的に）",
      "first_step": "今日から始められる具体的な第一歩"
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "あなたはプロのアドバイザーです。必ず指示されたJSONフォーマットで出力します。"},
                {"role": "user", "content": prompt}
            ]
        )
        
        raw_json = response.choices[0].message.content
        parsed_data = json.loads(raw_json)
        
        # "suggestions" キーの中身（配列）だけをフロントエンドに返す
        return {"status": "success", "data": parsed_data.get("suggestions", [])}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}