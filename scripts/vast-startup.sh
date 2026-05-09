#!/bin/bash
set -e
echo "=== Vast.ai Startup Script ==="
echo "Installing dependencies..."
apt-get update && apt-get install -y python3-pip

# Install compatible versions
pip3 install torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cu118
pip3 install sentence-transformers==2.2.2 fastapi==0.109.0 uvicorn==0.27.0 pydantic==2.6.0 huggingface-hub==0.19.4

echo "Starting FastAPI server on port 8000..."
nohup python3 << 'PYEOF' > /tmp/server.log 2>&1 &
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Union
import uvicorn
import os

app = FastAPI()
print('Loading clip-ViT-L-14 model...')
model = SentenceTransformer('clip-ViT-L-14')
print('Model loaded!')

class EmbeddingRequest(BaseModel):
    input: Union[str, List[str], List[dict]]
    model: str = 'clip-ViT-L-14'

@app.post('/v1/embeddings')
async def create_embeddings(request: EmbeddingRequest):
    texts = []
    if isinstance(request.input, str):
        texts = [request.input]
    elif isinstance(request.input, list):
        if len(request.input) > 0 and isinstance(request.input[0], dict):
            texts = [item.get('text', '') for item in request.input if item.get('type') == 'text']
        else:
            texts = request.input
    embeddings = model.encode(texts)
    return {'data': [{'embedding': emb.tolist(), 'index': i, 'object': 'embedding'} for i, emb in enumerate(embeddings)], 'model': request.model, 'object': 'list'}

@app.get('/v1/models')
async def list_models():
    return {'data': [{'id': 'clip-ViT-L-14', 'object': 'model', 'owned_by': 'sentence-transformers'}], 'object': 'list'}

if __name__ == '__main__':
    print('Starting server on port 8000...')
    uvicorn.run(app, host='0.0.0.0', port=8000)
PYEOF

echo "Waiting for server to start..."
sleep 30
echo "Server started in background. Check /tmp/server.log for details."
