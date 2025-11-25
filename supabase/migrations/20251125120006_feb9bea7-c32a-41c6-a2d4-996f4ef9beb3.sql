-- Add new columns to push_logs for enhanced analytics
ALTER TABLE public.push_logs
ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_logs_user_type ON public.push_logs(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_push_logs_timestamp ON public.push_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_push_logs_status ON public.push_logs(status);

-- Enable realtime for push_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_logs;