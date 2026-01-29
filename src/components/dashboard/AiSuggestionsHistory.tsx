import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Clock, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface AiSuggestion {
  id: string;
  suggestion_text: string;
  availability_snapshot: Json;
  success_rating: number | null;
  campaign_sent: boolean | null;
  campaign_type: string | null;
  notes: string | null;
  created_at: string;
  rated_at: string | null;
}

interface AiSuggestionsHistoryProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiSuggestionsHistory({ businessId, open, onOpenChange }: AiSuggestionsHistoryProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && businessId) {
      fetchSuggestions();
    }
  }, [open, businessId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_suggestions")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      toast.error("Failed to load suggestion history");
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (suggestionId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from("ai_suggestions")
        .update({ 
          success_rating: rating,
          rated_at: new Date().toISOString()
        })
        .eq("id", suggestionId);

      if (error) throw error;
      
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId 
            ? { ...s, success_rating: rating, rated_at: new Date().toISOString() }
            : s
        )
      );
      setRatingId(null);
      toast.success("Rating saved!");
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Failed to save rating");
    }
  };

  const getAverageRating = () => {
    const rated = suggestions.filter(s => s.success_rating);
    if (rated.length === 0) return null;
    const avg = rated.reduce((sum, s) => sum + (s.success_rating || 0), 0) / rated.length;
    return avg.toFixed(1);
  };

  const avgRating = getAverageRating();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Past AI Suggestions
            </span>
            {avgRating && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {avgRating} avg
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No suggestion history yet</p>
            <p className="text-xs mt-1">Use the AI Ideas button to get suggestions</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(parseISO(suggestion.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      {suggestion.campaign_sent && (
                        <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {suggestion.campaign_type?.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {suggestion.success_rating ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3.5 w-3.5",
                              star <= suggestion.success_rating!
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                    ) : ratingId === suggestion.id ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(suggestion.id, star)}
                            className="hover:scale-110 transition-transform"
                          >
                            <Star className="h-4 w-4 text-muted-foreground hover:fill-amber-400 hover:text-amber-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setRatingId(suggestion.id)}
                      >
                        Rate
                      </Button>
                    )}
                  </div>

                  <div 
                    className={cn(
                      "prose prose-sm dark:prose-invert max-w-none text-sm",
                      expandedId !== suggestion.id && "line-clamp-3"
                    )}
                  >
                    <ReactMarkdown>{suggestion.suggestion_text}</ReactMarkdown>
                  </div>

                  {suggestion.suggestion_text.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs w-full"
                      onClick={() => setExpandedId(
                        expandedId === suggestion.id ? null : suggestion.id
                      )}
                    >
                      {expandedId === suggestion.id ? "Show less" : "Show more"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
