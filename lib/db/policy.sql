-- Drop all policies for each table

-- PROFILE TABLE
DROP POLICY IF EXISTS "Allow all actions on profile" ON public.profile;

-- AGENDA TABLE
DROP POLICY IF EXISTS "Allow all actions on agenda" ON public.agenda;

-- AGENDA_ANCHOR TABLE
DROP POLICY IF EXISTS "Allow all actions on agenda_anchor" ON public.agenda_anchor;

-- EDITOR TABLE
DROP POLICY IF EXISTS "Allow all actions on editor" ON public.editor;

-- EDITOR_SUBJECT TABLE
DROP POLICY IF EXISTS "Allow all actions on editor_subject" ON public.editor_subject;

-- SUBJECT TABLE
DROP POLICY IF EXISTS "Allow all actions on subject" ON public.subject;

-- ELEMENT TABLE
DROP POLICY IF EXISTS "Allow all actions on element" ON public.element;

-- ELEMENT_COMPLETE TABLE
DROP POLICY IF EXISTS "Allow all actions on element_complete" ON public.element_complete;

-- MEMBER TABLE
DROP POLICY IF EXISTS "Allow all actions on member" ON public.member;


-- Permissive policies for each table that allow all operations for any authenticated user

-- PROFILE TABLE POLICY
CREATE POLICY "Allow all actions on profile" ON public.profile
  FOR ALL USING (true);

-- AGENDA TABLE POLICY
CREATE POLICY "Allow all actions on agenda" ON public.agenda
  FOR ALL USING (true);

-- AGENDA_ANCHOR TABLE POLICY
CREATE POLICY "Allow all actions on agenda_anchor" ON public.agenda_anchor
  FOR ALL USING (true);

-- EDITOR TABLE POLICY
CREATE POLICY "Allow all actions on editor" ON public.editor
  FOR ALL USING (true);

-- EDITOR_SUBJECT TABLE POLICY
CREATE POLICY "Allow all actions on editor_subject" ON public.editor_subject
  FOR ALL USING (true);

-- SUBJECT TABLE POLICY
CREATE POLICY "Allow all actions on subject" ON public.subject
  FOR ALL USING (true);

-- ELEMENT TABLE POLICY
CREATE POLICY "Allow all actions on element" ON public.element
  FOR ALL USING (true);

-- ELEMENT_COMPLETE TABLE POLICY
CREATE POLICY "Allow all actions on element_complete" ON public.element_complete
  FOR ALL USING (true);

-- MEMBER TABLE POLICY
CREATE POLICY "Allow all actions on member" ON public.member
  FOR ALL USING (true);


DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers (optional)
    -- SET session_replication_role = 'replica';
    
    -- Loop through all tables in our schema and drop all foreign key constraints
    FOR r IN (SELECT conrelid::regclass AS table_name,
                     conname AS constraint_name
              FROM pg_constraint
              WHERE contype = 'f'
              AND connamespace = 'public'::regnamespace
              ORDER BY conrelid::regclass::text, conname)
    LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.constraint_name || ' CASCADE';
        RAISE NOTICE 'Dropped foreign key constraint: %', r.constraint_name;
    END LOOP;
    
    -- Enable triggers again (if you disabled them)
    -- SET session_replication_role = 'origin';
END $$;

-- Foreign key constraints for the agenda table
ALTER TABLE public.agenda
ADD CONSTRAINT fk_agenda_creator_id
FOREIGN KEY (creator_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the agenda_anchor table
ALTER TABLE public.agenda_anchor
ADD CONSTRAINT fk_agenda_anchor_agenda_id
FOREIGN KEY (agenda_id) REFERENCES public.agenda(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.agenda_anchor
ADD CONSTRAINT fk_agenda_anchor_whom_id
FOREIGN KEY (whom_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the editor table
ALTER TABLE public.editor
ADD CONSTRAINT fk_editor_agenda_id
FOREIGN KEY (agenda_id) REFERENCES public.agenda(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.editor
ADD CONSTRAINT fk_editor_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the editor_subject table
ALTER TABLE public.editor_subject
ADD CONSTRAINT fk_editor_subject_subject_id
FOREIGN KEY (subject_id) REFERENCES public.subject(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.editor_subject
ADD CONSTRAINT fk_editor_subject_editor_id
FOREIGN KEY (editor_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the element table
ALTER TABLE public.element
ADD CONSTRAINT fk_element_subject_id
FOREIGN KEY (subject_id) REFERENCES public.subject(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.element
ADD CONSTRAINT fk_element_agenda_id
FOREIGN KEY (agenda_id) REFERENCES public.agenda(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.element
ADD CONSTRAINT fk_element_creator_id
FOREIGN KEY (creator_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the element_complete table
ALTER TABLE public.element_complete
ADD CONSTRAINT fk_element_complete_element_id
FOREIGN KEY (element_id) REFERENCES public.element(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.element_complete
ADD CONSTRAINT fk_element_complete_whom_id
FOREIGN KEY (whom_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraints for the member table
ALTER TABLE public.member
ADD CONSTRAINT fk_member_agenda_id
FOREIGN KEY (agenda_id) REFERENCES public.agenda(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE public.member
ADD CONSTRAINT fk_member_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraint for the profile table
ALTER TABLE public.profile
ADD CONSTRAINT fk_profile_id
FOREIGN KEY (id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Foreign key constraint for the subject table
ALTER TABLE public.subject
ADD CONSTRAINT fk_subject_creator_id
FOREIGN KEY (creator_id) REFERENCES auth.users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
