-- Close the unmoderated-publish hole on blog comments.
--
-- "Anyone can post comments" (20260217105426) checks nothing but
-- INSERT permission itself: WITH CHECK (true). A public caller can send
-- {approved: true} directly and the comment is live immediately, fully
-- bypassing AdminComments.tsx's approve/reject screen. "Anyone can read
-- approved comments" trusts this column completely, so it is the only
-- gate standing between a stranger's row and the blog's public face.
--
-- The admin approve action (AdminComments.tsx:27) sets approved via
-- UPDATE, under the separate "Admin update comments" policy
-- (has_role(admin)) added in 20260227112110 — that path is untouched by
-- this change. Only the public INSERT path is pinned.
DROP POLICY IF EXISTS "Anyone can post comments" ON public.blog_comments;
CREATE POLICY "Anyone can post comments" ON public.blog_comments
  FOR INSERT WITH CHECK (approved = false);
