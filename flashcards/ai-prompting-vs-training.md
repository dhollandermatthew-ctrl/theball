# Flashcards: AI Prompting vs Model Training

## Card 1: Prompting vs Fine-tuning Tradeoff

**Q:** If you want to guarantee AI behavior (like "always read ProjectContext.md first"), what are your only two options, and what's the tradeoff?

**A:**

1. **Model training/fine-tuning**: Actually retrain the model on your data → Changes underlying weights → Deterministic improvement → Expensive (requires GPU clusters, ML engineers)
2. **Prompt engineering**: Use aggressive wording, emphasis, examples in system instructions → Guides through context window → Probabilistic improvement (never guaranteed) → Cheap

**Key insight**: Without model control, you're always playing probability games. Prompts increase compliance odds but can't guarantee it.

---

## Card 2: Enterprise AI Reliability Stack

**Q:** What are the three layers enterprises use to improve AI reliability, from cheapest to most expensive?

**A:**

1. **Cheap (everyone)**: Aggressive system prompts + few-shot examples (show 3-5 patterns in context)
2. **Medium (if budget allows)**: Reflection/validation agents that check their own work, structured outputs (force JSON schemas)
3. **Expensive (big companies only)**: Fine-tuning on company data, RLHF with human raters, custom trained models

**Key insight**: Even with all three layers, enterprises still catch failures manually. There's no perfect solution with current LLM tech.
