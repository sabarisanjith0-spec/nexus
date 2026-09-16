-- NEXUS MAX performance hardening.
-- Removes a duplicate permissive INSERT policy and adds covering indexes for FK-heavy tables.

drop policy if exists "authenticated users can create channels" on public.channels;

create index if not exists message_attachments_owner_idx on public.message_attachments(owner_id);
create index if not exists message_reactions_user_idx on public.message_reactions(user_id);
create index if not exists message_reads_message_idx on public.message_reads(message_id);
create index if not exists messages_user_idx on public.messages(user_id);
create index if not exists pinned_messages_pinner_idx on public.pinned_messages(pinned_by);
create index if not exists saved_messages_message_idx on public.saved_messages(message_id);
