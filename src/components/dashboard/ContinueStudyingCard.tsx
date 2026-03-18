import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface RecentCourse {
  id: string;
  name: string;
  url: string | null;
  current_episode: number;
  total_episodes: number;
  status: string;
  platform: string | null;
}

export function ContinueStudyingCard() {
  const [course, setCourse] = useState<RecentCourse | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, url, current_episode, total_episodes, status, platform")
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setCourse(data as RecentCourse);
    };
    fetchRecent();
  }, []);

  if (!course) return null;

  const progress = course.total_episodes > 0
    ? Math.round((course.current_episode / course.total_episodes) * 100)
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Continuar Estudando
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-medium text-sm truncate">{course.name}</p>
          {course.platform && (
            <p className="text-xs text-muted-foreground">{course.platform}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Ep. {course.current_episode}/{course.total_episodes}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex gap-2">
          {course.url && (
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => window.open(course.url!, "_blank")}
            >
              <Play className="h-3 w-3" /> Continuar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/courses")}
          >
            Ver Cursos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
