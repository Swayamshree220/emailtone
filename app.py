from flask import Flask, render_template, request, jsonify
import os
from groq import Groq
from dotenv import load_dotenv
import re
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# Global stats tracking (in-memory for demo)
stats = {
    "emails_processed": 0,
    "toxicity_removed": 0,
    "most_used_tone": {"professional": 0, "polite": 0, "neutral": 0}
}

TONE_CONFIGS = {
    "polite": {"name": "Polite & Apologetic", "emoji": "😊"},
    "neutral": {"name": "Neutral & Direct", "emoji": "😐"},
    "professional": {"name": "Professional & Firm", "emoji": "💼"},
    "tech": {"name": "Tech Startup Casual", "emoji": "💻"},
    "legal": {"name": "Legal Formal", "emoji": "⚖️"},
    "academic": {"name": "Academic Scholarly", "emoji": "🎓"}
}

PERSONALITIES = {
    "therapist": "Empathetic, understanding, validating feelings while being supportive",
    "lawyer": "Precise, defensive, citing precedent and using legal language",
    "diplomat": "Tactful, finding middle ground, emphasizing win-win solutions",
    "coach": "Motivational, encouraging, focusing on growth and improvement"
}

TOXIC_PATTERNS = {
    "per my last email": {"score": 10, "meaning": "Translation: You ignored me"},
    "as i mentioned": {"score": 8, "meaning": "Translation: Were you even listening?"},
    "just following up": {"score": 7, "meaning": "Translation: Why haven't you responded?"},
    "circling back": {"score": 6, "meaning": "Translation: Still waiting on this"},
    "per my previous": {"score": 9, "meaning": "Translation: Read your damn email"},
    "friendly reminder": {"score": 7, "meaning": "Translation: This is your last warning"},
    "as discussed": {"score": 6, "meaning": "Translation: We already talked about this"},
    "just checking in": {"score": 5, "meaning": "Translation: Where's my response?"},
    "to be clear": {"score": 7, "meaning": "Translation: Since you don't understand"},
    "moving forward": {"score": 6, "meaning": "Translation: Stop messing up"}
}

EMAIL_TEMPLATES = {
    "deadline_reminder": {
        "name": "Deadline Reminder",
        "angry": "Where is the report? This was due yesterday. This is completely unacceptable.",
        "context": "Following up on a missed deadline"
    },
    "meeting_request": {
        "name": "Difficult Conversation",
        "angry": "We need to talk about your performance issues. Come to my office now.",
        "context": "Requesting a sensitive meeting"
    },
    "feedback": {
        "name": "Critical Feedback",
        "angry": "This work is terrible and full of errors. You need to redo everything immediately.",
        "context": "Giving constructive criticism"
    },
    "followup": {
        "name": "No Response Follow-up",
        "angry": "I've emailed you three times with no response. This is extremely unprofessional.",
        "context": "Following up after being ignored"
    }
}


def call_groq_api(prompt, temperature=0.3):
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return {"success": False, "error": "API key not configured"}
        
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=1000
        )
        
        return {"success": True, "result": completion.choices[0].message.content.strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.route("/")
def index():
    return render_template("index.html", 
                         tones=TONE_CONFIGS, 
                         templates=EMAIL_TEMPLATES,
                         personalities=PERSONALITIES)


@app.route("/adjust-tone", methods=["POST"])
def adjust_tone():
    try:
        data = request.get_json()
        email = data.get("email", "").strip()
        tone = data.get("tone", "professional")
        aggression = int(data.get("aggression", 50))
        personality = data.get("personality", None)
        
        if not email:
            return jsonify({"success": False, "error": "Email required"}), 400
        
        # Build prompt
        firmness = "soft, apologetic" if aggression < 30 else "balanced" if aggression < 70 else "direct, firm"
        
        personality_instruction = ""
        if personality and personality in PERSONALITIES:
            personality_instruction = f"\nWrite in the style of a {personality}: {PERSONALITIES[personality]}"
        
        prompt = f"""Rewrite this email in a {tone} tone with {firmness} language.{personality_instruction}

Preserve all key information. Do NOT add new details. Only change tone and phrasing.

ORIGINAL:
{email}

REWRITTEN EMAIL:"""

        result = call_groq_api(prompt)
        
        if result["success"]:
            # Update stats
            stats["emails_processed"] += 1
            stats["most_used_tone"][tone] = stats["most_used_tone"].get(tone, 0) + 1
            
            return jsonify({
                "success": True,
                "rewritten_email": result["result"]
            })
        
        return jsonify(result), 500
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analyze-toxicity", methods=["POST"])
def analyze_toxicity():
    """KILLER FEATURE: Toxicity Heatmap"""
    try:
        email = request.get_json().get("email", "").strip()
        
        if not email:
            return jsonify({"success": False, "error": "Email required"}), 400
        
        email_lower = email.lower()
        highlights = []
        total_toxicity = 0
        
        for phrase, data in TOXIC_PATTERNS.items():
            if phrase in email_lower:
                start = email_lower.index(phrase)
                highlights.append({
                    "phrase": phrase,
                    "start": start,
                    "end": start + len(phrase),
                    "toxicity": data["score"],
                    "meaning": data["meaning"]
                })
                total_toxicity += data["score"]
        
        # Calculate toxicity percentage
        max_possible = len(highlights) * 10 if highlights else 1
        toxicity_percent = min(100, int((total_toxicity / max_possible) * 100)) if highlights else 0
        
        return jsonify({
            "success": True,
            "highlights": highlights,
            "total_toxicity": total_toxicity,
            "toxicity_percent": toxicity_percent,
            "phrase_count": len(highlights)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/decode-email", methods=["POST"])
def decode_email():
    try:
        email = request.get_json().get("email", "").strip()
        
        if not email:
            return jsonify({"success": False, "error": "Email required"}), 400
        
        prompt = f"""Analyze this corporate email and reveal the hidden meaning:

EMAIL:
{email}

Provide:

PLAIN TRANSLATION:
[Honest, direct version of what they're really saying]

PASSIVE-AGGRESSIVE SCORE: [X/10]

RED FLAGS:
- [List passive-aggressive phrases with translations]

EMOTIONAL STATE:
[What the sender is actually feeling]"""

        result = call_groq_api(prompt, temperature=0.4)
        
        if result["success"]:
            score_match = re.search(r'(\d+)\s*/\s*10', result["result"])
            score = int(score_match.group(1)) if score_match else 5
            
            return jsonify({
                "success": True,
                "analysis": result["result"],
                "aggression_score": score
            })
        
        return jsonify(result), 500
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analyze-thread", methods=["POST"])
def analyze_thread():
    try:
        thread = request.get_json().get("thread", "").strip()
        
        if not thread:
            return jsonify({"success": False, "error": "Thread required"}), 400
        
        prompt = f"""Analyze this email thread for communication health:

THREAD:
{thread}

Provide:

TONE TIMELINE:
[How tone changed from first to last email]

TOXIC PHRASE COUNT:
[Count: "per my last email", "as mentioned", etc.]

RED FLAGS:
[Most problematic patterns]

HEALTH SCORE: [X/10]
[0=toxic, 10=healthy]

RECOMMENDATIONS:
[How to improve communication]"""

        result = call_groq_api(prompt, temperature=0.4)
        
        if result["success"]:
            return jsonify({"success": True, "analysis": result["result"]})
        
        return jsonify(result), 500
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/get-stats", methods=["GET"])
def get_stats():
    """Return usage statistics"""
    most_used = max(stats["most_used_tone"], key=stats["most_used_tone"].get) if stats["most_used_tone"] else "professional"
    
    return jsonify({
        "success": True,
        "emails_processed": stats["emails_processed"],
        "toxicity_removed": stats["toxicity_removed"],
        "most_used_tone": most_used,
        "active_users": 1  # Demo value
    })


@app.route("/load-template/<template_id>", methods=["GET"])
def load_template(template_id):
    """Load email template"""
    if template_id in EMAIL_TEMPLATES:
        return jsonify({
            "success": True,
            "template": EMAIL_TEMPLATES[template_id]
        })
    return jsonify({"success": False, "error": "Template not found"}), 404


@app.route("/chat", methods=["POST"])
def chat_coach():
    """AI Email Coach - Interactive guidance"""
    try:
        data = request.get_json()
        message = data.get("message", "").strip()
        current_email = data.get("current_email", "").strip()
        
        if not message:
            return jsonify({"success": False, "error": "Message required"}), 400
        
        # Build professional coaching prompt
        email_context = f"\n\nCurrent email draft:\n{current_email}" if current_email else ""
        
        prompt = f"""You are a Corporate Email Communication Coach.
Your job is to help users write better professional emails.

Focus ONLY on:
- Tone analysis
- Professionalism
- Clarity
- Workplace appropriateness

Rules:
1. Never change the user's original intent
2. Never add new facts or commitments
3. If email sounds harsh/passive-aggressive, explain why briefly
4. Suggest improvements respectfully
5. Keep responses concise and actionable (2-3 sentences max)
6. Stay professional - no emojis, no jokes
7. Only answer questions about email communication

User is working in a professional environment.{email_context}

User question:
{message}

Provide a short, professional response:"""

        result = call_groq_api(prompt, temperature=0.2)
        
        if result["success"]:
            return jsonify({
                "success": True,
                "reply": result["result"]
            })
        
        return jsonify(result), 500
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print("\n⚠️  WARNING: GROQ_API_KEY not set")
        print("Create .env file with: GROQ_API_KEY=your-key-here\n")
    else:
        print("\n✓ Groq API loaded")
        print("✓ ALL FEATURES ENABLED:")
        print("  • Email Rewriting (6 tones)")
        print("  • Toxicity Heatmap")
        print("  • Decode Mode")
        print("  • Thread Analysis")
        print("  • AI Personalities")
        print("  • Email Templates")
        print("  • Usage Statistics")
        print("  • AI Email Coach Chat")
        print("\n🚀 Starting server...\n")
    
    app.run(debug=True, port=5000)