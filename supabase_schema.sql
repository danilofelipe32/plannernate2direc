-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  start_date TEXT,
  start_time TEXT,
  end_date TEXT,
  end_time TEXT,
  category TEXT CHECK (category IN ('work', 'personal', 'urgent')) NOT NULL,
  comments JSONB DEFAULT '[]'::JSONB,
  planning_action_id UUID,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_date TEXT NOT NULL,
  end_time TEXT NOT NULL,
  attendees INTEGER DEFAULT 1,
  color TEXT DEFAULT 'indigo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  color TEXT DEFAULT 'bg-yellow-100',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create planning_actions table
CREATE TABLE IF NOT EXISTS planning_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  specific_goals TEXT,
  actions TEXT,
  methodology TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_name TEXT NOT NULL,
  municipality TEXT NOT NULL,
  project_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  area TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  student_count INTEGER NOT NULL,
  objective TEXT NOT NULL,
  activities TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  result_learning BOOLEAN DEFAULT FALSE,
  result_reading BOOLEAN DEFAULT FALSE,
  result_tech BOOLEAN DEFAULT FALSE,
  result_protagonism BOOLEAN DEFAULT FALSE,
  result_other TEXT,
  has_photos BOOLEAN DEFAULT FALSE,
  can_publish BOOLEAN DEFAULT FALSE,
  submitter_name TEXT NOT NULL,
  submit_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notifications BOOLEAN DEFAULT TRUE,
  dark_mode BOOLEAN DEFAULT FALSE,
  email_updates BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'pt-BR',
  auto_save BOOLEAN DEFAULT TRUE,
  compact_view BOOLEAN DEFAULT FALSE,
  profile_name TEXT,
  profile_email TEXT,
  two_factor BOOLEAN DEFAULT FALSE,
  public_profile BOOLEAN DEFAULT FALSE,
  theme_color TEXT DEFAULT 'indigo',
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
CREATE POLICY "Users can view their own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
CREATE POLICY "Users can insert their own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
CREATE POLICY "Users can update their own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON settings;
CREATE POLICY "Users can delete their own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for tasks
DROP POLICY IF EXISTS "Everyone can view all tasks" ON tasks;
CREATE POLICY "Everyone can view all tasks" ON tasks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for events
DROP POLICY IF EXISTS "Everyone can view all events" ON events;
CREATE POLICY "Everyone can view all events" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for notes
DROP POLICY IF EXISTS "Everyone can view all notes" ON notes;
CREATE POLICY "Everyone can view all notes" ON notes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for planning_actions
DROP POLICY IF EXISTS "Everyone can view all planning actions" ON planning_actions;
CREATE POLICY "Everyone can view all planning actions" ON planning_actions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own planning actions" ON planning_actions;
CREATE POLICY "Users can insert their own planning actions" ON planning_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own planning actions" ON planning_actions;
CREATE POLICY "Users can update their own planning actions" ON planning_actions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own planning actions" ON planning_actions;
CREATE POLICY "Users can delete their own planning actions" ON planning_actions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for projects
DROP POLICY IF EXISTS "Everyone can view all projects" ON projects;
CREATE POLICY "Everyone can view all projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);
