# Embedding Volume Tracker

**Purpose**: Track embedding volume and types to estimate switching costs

---

## 2026-05-09

### Batch Run
- **Date**: 2026-05-09
- **Model**: clip-ViT-L-14 (768-dim, multimodal)
- **Provider**: Vast.ai RTX 4090
- **Duration**: ~58 minutes (idle)
- **Cost**: $0.29/hr

### QMD Index Stats
- **Total files indexed**: 3,879
- **Total vectors embedded**: 16,919
- **Files removed**: 1,532 (agent-configs/PMO/agents)
- **Current index size**: 3,879 files (down from 5,411)

### Embedding Types
| Type | Count | Dimensions | Provider |
|---|---|---|---|
| Text | 3,879 | 768 | Vast.ai (clip-ViT-L-14) |
| Images | 0 | 768 | Not yet used |

### mem0 Stats
- **Provider**: openai (self-hosted clip-ViT-L-14)
- **Dimensions**: 768
- **Endpoint**: http://85.51.34.67:42362/v1 (when running)
- **Status**: Connected and tested

### Cost Analysis
| Component | Before | After | Savings |
|---|---|---|---|
| Gemini embeddings | $90-120/mo | $0 | 100% |
| Vast.ai (batch) | $0 | ~$5/mo | +$5 |
| **Total** | **$90-120/mo** | **$1-5/mo** | **95%+** |

### Instance Cleanup
- **Destroyed 7 extra instances**: 36385886, 36385901, 36385906, 36385921, 36385928, 36386006, 36387801
- **Destroyed idle instance**: 36385878 (was running idle)
- **Current instances**: 0 (all destroyed)
- **Current cost**: $0

### Switching Cost Estimate
- **Re-embed all 3,879 files**: ~2-4 hours on RTX 4090
- **Cost per re-embed**: ~$0.58-$1.16
- **Monthly cost (weekly batches)**: ~$5/month
- **Monthly cost (bi-weekly batches)**: ~$2.50/month

---

## Future Tracking

### When to Track
- [ ] Each batch run (volume, duration, cost)
- [ ] New document additions (count, type)
- [ ] Model switches (dimensions, provider, cost)
- [ ] Cost changes (hourly rate, monthly total)

### Metrics to Track
- Total files indexed
- Total vectors embedded
- Files added/removed
- Embedding duration
- Cost per batch
- Cost per vector
- Model dimensions
- Provider changes

---

**Last Updated**: 2026-05-09  
**Next Update**: Next batch run
