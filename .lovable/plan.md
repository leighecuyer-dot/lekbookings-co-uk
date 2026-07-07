## What's happening

The "AI" option in messaging is the **AI Suggestions** panel on the dashboard's Available Slots tile. It calls the `suggest-slot-filling` edge function, which asks the model for ~300 words of headers + bullets, but the request is capped at **`max_tokens: 500`**. That budget is regularly exhausted mid-sentence, so the response arrives cut off — often in the middle of a word or a markdown list — which is what looks like "messed up writing" once rendered through `ReactMarkdown`.

Two contributing issues:

1. **Token budget too small for the prompt.** Prompt asks for structured markdown (headings, 3-4 ideas, 300 words). Realistic output is 700-1200 tokens.
2. **No truncation handling.** The function ignores `finish_reason`, so a truncated response is returned as-is with no retry and no notice to the user.
3. **Model id needs verification.** `google/gemini-3-flash-preview` isn't a stable catalog id; if the gateway ever rejects or degrades it, the caller silently displays whatever partial text comes back.

## Fix

**`supabase/functions/suggest-slot-filling/index.ts`**
- Raise `max_tokens` to `1200`.
- Switch model to a supported catalog id (verified from `ai-models-chat`): `google/gemini-2.5-flash` (fast, cheap, structured-output friendly). Keep it as a single constant at the top for easy swap.
- Read `finish_reason` from the response. If it is `"length"`, retry once with `max_tokens: 2000`. If still truncated, append a small `\n\n_…response truncated_` marker so the UI never shows a mid-word cutoff without context.
- Tighten the prompt to match the budget: ask for "3 short ideas, each 2-3 sentences, plain markdown bullets, no headings deeper than H3" — this reduces the chance of overrun in the first place.
- Trim trailing partial words defensively (strip anything after the last complete sentence/bullet) before returning.

**`src/components/dashboard/AvailableSlotsTile.tsx`**
- No behavior change needed, but wrap the `ReactMarkdown` render in a check: if `aiSuggestion` ends without terminal punctuation or a closing list item, show a subtle "Response was cut short — try again" hint under the content with a retry button that re-invokes `handleAiSuggestions`.

## Out of scope

- The **bulk message dialog** itself (`BulkMessageDialog`) does not call any AI model — it only uses static + dynamic templates. Nothing to change there.
- No schema / DB changes.
- No changes to `send-message`, `parse-diary`, or `parse-price-list`.

## Verification

1. Open the dashboard, click **AI Suggestions** three times in a row and confirm each response ends cleanly (full sentence / closed bullet).
2. Temporarily lower `max_tokens` to `120` locally to force truncation and confirm the retry + truncation notice both fire.
3. Check edge function logs for any `finish_reason: length` warnings after the fix.
