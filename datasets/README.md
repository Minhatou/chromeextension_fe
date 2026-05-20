# IT Translation Dataset for Finetuning

This directory contains a high-quality, synthetic dataset of long and complex IT-related sentences for English to Vietnamese translation.

## Contents

- `it_long_sentences.jsonl`: A dataset in JSONL format using the ChatML template (`<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\n...<|im_end|>`). This format is compatible with models like Qwen2.5, Llama-3 (instruct versions), and Gemma-2.

## Structure

Each line is a JSON object with a `text` field containing the full prompt and response:

```json
{
  "text": "<|im_start|>user\nTranslate the following IT text to Vietnamese. Provide only the translation.\nText: [Long English Sentence]<|im_end|>\n<|im_start|>assistant\n[Vietnamese Translation]<|im_end|>"
}
```

## How to use for Finetuning

### 1. Preparation
Ensure you have a finetuning framework installed, such as:
- [Axolotl](https://github.com/OpenAccess-AI-Collective/axolotl)
- [Unsloth](https://github.com/unslothai/unsloth)
- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)

### 2. Expanding the Dataset
To achieve good results, you should aim for at least 500-1000 examples. You can expand this dataset by:
- **Scraping Technical Docs**: Download documentation from Microsoft, Google Cloud, or AWS in both English and Vietnamese.
- **Using an LLM (Seed Data)**: Use a larger model (like GPT-4o or Claude 3.5 Sonnet) to generate more complex IT sentences and their professional translations.
- **Filtering OPUS**: Use the OPUS project (GNOME, KDE datasets) and filter for sentences longer than 20 words.

### 3. Data Cleaning
- Remove very short UI strings (e.g., "OK", "Cancel", "Click here").
- Ensure technical terms remain consistent (e.g., "Middleware" translated consistently or kept as-is).
- Verify the accuracy of complex nested clauses.

## Training Format
If your training tool requires a different format (like `instruction`/`input`/`output`), you can convert this JSONL using a simple script.

---
Created by Antigravity for IT Translation Extension Project.
