import asyncio, os, sys
from groq import AsyncGroq
from dotenv import load_dotenv
load_dotenv()

client = AsyncGroq(api_key=os.getenv('GROQ_API_KEY'))

MODELS = [
    'qwen/qwen3.6-27b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'groq/compound',
    'groq/compound-mini',
    'allam-2-7b',
]

async def test(model):
    try:
        r = await client.chat.completions.create(
            model=model,
            messages=[{'role': 'user', 'content': 'Say hello in one word'}],
            max_tokens=10
        )
        print(f'OK   : {model} -> {r.choices[0].message.content.strip()[:40]}')
    except Exception as e:
        print(f'FAIL : {model} -> {str(e)[:100]}')

async def main():
    for m in MODELS:
        await test(m)

asyncio.run(main())
