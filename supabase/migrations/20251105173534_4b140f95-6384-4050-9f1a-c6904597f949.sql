-- Make user_id columns NOT NULL after assigning values
ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE columns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN user_id SET NOT NULL;