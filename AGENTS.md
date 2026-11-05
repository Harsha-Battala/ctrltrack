<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Recurring tasks: `items.is_recurring` + shared `habit_logs` engine for any category (Habits always recurring). Why: one streak system, no duplicates.
- Daily Goals: one-time tasks shown only on their creation day (local date), hidden not deleted. Why: fresh daily list without cron.
- Job application documents: single file per job item in the private `job-documents` storage bucket under `{user_id}/{item_id}/`, owner-only RLS on `storage.objects`; item columns `job_document_path/name/type` reference it, and the file is deleted whenever the attachment is replaced/removed or the item is deleted. Why: private per-user attachments without orphaned files.
