from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# .envファイルを読み込む
load_dotenv()

# ==========================================
# データベースの設定 (SQLiteを使用)
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./hobby_history.db"

# connect_args={"check_same_thread": False} はSQLite特有の設定です
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- データベースのテーブル（設計図） ---
class DiagnosisHistory(Base):
    __tablename__ = "diagnosis_histories"

    id = Column(Integer, primary_key=True, index=True)
    answers_json = Column(Text, nullable=False)     # ユーザーの回答をJSON文字列で保存
    suggestions_json = Column(Text, nullable=False) # AIの提案をJSON文字列で保存
    created_at = Column(DateTime, default=datetime.utcnow) # 作成日時

# 起動時にテーブルを作成する
Base.metadata.create_all(bind=engine)

# DBセッションを取得するための関数（各APIで使います）
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# ==========================================

app = FastAPI()

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI()

# ==========================================
# 1. 質問リストを取得するAPI (GET)
# ==========================================
@app.get("/api/questions")
def get_questions():
    prompt = """
    以下の6つの質問と、それぞれに対する代表的な回答の選択肢（3〜4個）を作成し、JSON形式で出力してください。
    必ず {"questions": [質問の配列]} という形式のJSONオブジェクトにしてください。

    【質問リスト】
    1. 【目的】趣味を通して一番得たいものは？（例：リフレッシュ、自己研鑽など）
    2. 【リソース】趣味に使える時間や予算のイメージは？（例：平日の夜少し、休日にがっつりなど）
    3. 【性格とスタイル】一人で没頭したいか、誰かと楽しみたいかなどのスタイルは？
    4. 【過去の体験】子供の頃に熱中していたことのジャンルは？（例：ゲーム、外遊び、モノづくりなど）
    5. 【生活環境】普段の仕事や生活のスタイルは？（例：デスクワーク中心、肉体労働など）
    6. 【MBTI】あなたの性格タイプ（MBTI）や周りから言われる性格は？

    【配列内の各アイテムの形式】
    {
      "id": 1, 
      "question": "質問内容", 
      "options": ["選択肢A", "選択肢B", "選択肢C"]
    }
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "あなたは優秀なアシスタントです。必ずJSONを出力します。"},
                {"role": "user", "content": prompt}
            ]
        )
        raw_json = response.choices[0].message.content
        parsed_data = json.loads(raw_json)
        return {"status": "success", "data": parsed_data.get("questions", [])}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 2. 回答を受け取って趣味を提案し、DBに保存するAPI (POST)
# ==========================================
class Answer(BaseModel):
    question: str
    answer: str

class DiagnoseRequest(BaseModel):
    answers: List[Answer]

@app.post("/api/diagnose")
def diagnose_hobbies(request: DiagnoseRequest, db: Session = Depends(get_db)):
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
        suggestions = parsed_data.get("suggestions", [])
        
        # --- ★新規追加: データベースに保存する処理 ---
        new_history = DiagnosisHistory(
            answers_json=json.dumps([a.dict() for a in request.answers], ensure_ascii=False),
            suggestions_json=json.dumps(suggestions, ensure_ascii=False)
        )
        db.add(new_history) # DBに追加
        db.commit()         # 変更を確定
        db.refresh(new_history) # 最新のIDなどを取得
        # ----------------------------------------------

        return {"status": "success", "data": suggestions, "history_id": new_history.id}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 3. ★新規追加: 過去の診断履歴をすべて取得するAPI (GET)
# ==========================================
@app.get("/api/history")
def get_history(db: Session = Depends(get_db)):
    # DBから履歴を新しい順に取得
    histories = db.query(DiagnosisHistory).order_by(DiagnosisHistory.created_at.desc()).all()
    
    result = []
    for h in histories:
        result.append({
            "id": h.id,
            "created_at": h.created_at,
            "answers": json.loads(h.answers_json),
            "suggestions": json.loads(h.suggestions_json)
        })
        
    return {"status": "success", "data": result}